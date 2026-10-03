import type {
    CollectionFailure, CollectionResult, CollectorDependencies, CollectorOptions, FetchRequest, FetchResult,
    NormalizedListing, SearchCandidate, SearchPlan,
} from '../types.js';
import { buildOlxSearchUrl } from '../search/url-builder.js';
import { deduplicateListings } from '../matching/dedupe.js';
import { parseListing } from './listing-parser.js';
import { normalizeListing } from './normalize.js';
import { parseSearchResults, ParserDriftError } from './search-parser.js';

export { ParserDriftError } from './search-parser.js';

export const MAX_FETCH_ATTEMPTS = 3;
export const RETRY_DELAYS_MS = [250, 1000] as const;
export const MAX_SEARCH_PAGES_PER_REQUEST = 5;

export class RenderingRequiredError extends Error {
    public constructor(message: string) { super(message); this.name = 'RenderingRequiredError'; }
}
export class AccessBlockedError extends Error {
    public constructor(message: string) { super(message); this.name = 'AccessBlockedError'; }
}

async function fetchWithPolicy(request: Omit<FetchRequest, 'attempt'>, deps: CollectorDependencies, options: CollectorOptions): Promise<FetchResult> {
    const maxAttempts = options.maxFetchAttempts ?? MAX_FETCH_ATTEMPTS;
    const delays = options.retryDelaysMs ?? [...RETRY_DELAYS_MS];
    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
        try {
            const result = await deps.httpFetcher.fetchHtml({ ...request, attempt });
            if (result.statusCode === 403 || result.statusCode === 429) throw new AccessBlockedError(`HTTP ${result.statusCode}`);
            if (result.statusCode >= 400) throw new Error(`HTTP ${result.statusCode}`);
            return result;
        } catch (error) {
            if (error instanceof RenderingRequiredError) {
                return deps.browserFetcher.fetchHtml({ ...request, attempt: 1 });
            }
            if (attempt === maxAttempts) throw error;
            await deps.sleep?.(delays[attempt - 1] ?? delays.at(-1) ?? 250);
        }
    }
    throw new Error('Unreachable retry state');
}

function candidateIdentity(candidate: SearchCandidate): string {
    return candidate.listingId || candidate.url.split(/[?#]/u, 1)[0];
}

export async function collectListings(plan: SearchPlan, deps: CollectorDependencies, maxResults: number, options: CollectorOptions = {}): Promise<CollectionResult> {
    const candidates = new Map<string, { candidate: SearchCandidate; sources: SearchCandidate['source'][] }>();
    const failures: CollectionFailure[] = [];
    const warnings: string[] = [];
    let searchPages = 0;

    for (const source of plan.requests) {
        for (let page = 1; page <= (options.maxSearchPagesPerRequest ?? MAX_SEARCH_PAGES_PER_REQUEST) && candidates.size < maxResults; page += 1) {
            const url = buildOlxSearchUrl(source);
            if (page > 1) url.searchParams.set('page', String(page));
            try {
                const result = await fetchWithPolicy({ url, kind: 'search' }, deps, options);
                searchPages += 1;
                const parsed = parseSearchResults(result.html, source);
                for (const candidate of parsed) {
                    const key = candidateIdentity(candidate);
                    const previous = candidates.get(key);
                    if (previous) previous.sources.push(candidate.source);
                    else candidates.set(key, { candidate, sources: [candidate.source] });
                }
                if (parsed.length === 0) break;
            } catch (error) {
                failures.push({ url: url.href, stage: 'search', reason: error instanceof Error ? error.message : String(error) });
                warnings.push(`Nie udało się pobrać strony wyszukiwania: ${url.href}`);
                break;
            }
        }
    }

    const normalized: NormalizedListing[] = [];
    let detailAttempts = 0;
    let parserFailures = 0;
    for (const { candidate, sources } of candidates.values()) {
        if (normalized.length >= maxResults) break;
        detailAttempts += 1;
        try {
            const result = await fetchWithPolicy({ url: new URL(candidate.url), kind: 'detail' }, deps, options);
            const raw = parseListing(result.html, new URL(result.finalUrl));
            const item = normalizeListing(raw, {
                segment: candidate.source.segment,
                matchedQueries: [...new Set(sources.flatMap((source) => source.query ? [source.query] : []))],
                originCoordinates: null,
                locationFilterMatched: sources.every((source) => source.segment !== 'local' || Boolean(source.postalCode)),
            });
            item.matchedSegments = [...new Set(sources.map((source) => source.segment))];
            normalized.push(item);
            await deps.saveCheckpoint(item);
        } catch (error) {
            if (error instanceof ParserDriftError) parserFailures += 1;
            failures.push({ url: candidate.url, stage: 'detail', reason: error instanceof Error ? error.message : String(error) });
        }
    }

    const deduped = deduplicateListings(normalized).slice(0, maxResults);
    const driftRatio = detailAttempts ? parserFailures / detailAttempts : 0;
    const terminalDrift = detailAttempts > 0 && driftRatio > 0.5;
    if (terminalDrift) warnings.push('Wykryto prawdopodobną zmianę selektorów OLX na ponad połowie stron ofert.');
    if (failures.length) warnings.push(`Zachowano częściowe wyniki; błędów: ${failures.length}.`);
    return {
        listings: deduped,
        excludedFailures: failures,
        counts: { searchPages, candidates: candidates.size, detailAttempts, saved: deduped.length, failed: failures.length },
        warnings,
        partial: failures.length > 0 || terminalDrift,
        selectorDrift: { attempted: detailAttempts, failures: parserFailures, ratio: driftRatio, terminal: terminalDrift },
    };
}
