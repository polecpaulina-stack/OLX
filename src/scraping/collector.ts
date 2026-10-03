import type {
    CollectionFailure, CollectionResult, CollectorDependencies, FetchRequest, FetchResult,
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

async function fetchWithPolicy(request: Omit<FetchRequest, 'attempt'>, deps: CollectorDependencies): Promise<FetchResult> {
    for (let attempt = 1; attempt <= MAX_FETCH_ATTEMPTS; attempt += 1) {
        try {
            const result = await deps.httpFetcher.fetchHtml({ ...request, attempt });
            if (result.statusCode === 403 || result.statusCode === 429) throw new AccessBlockedError(`HTTP ${result.statusCode}`);
            if (result.statusCode >= 500) throw new Error(`HTTP ${result.statusCode}`);
            return result;
        } catch (error) {
            if (error instanceof RenderingRequiredError) {
                return deps.browserFetcher.fetchHtml({ ...request, attempt: 1 });
            }
            if (attempt === MAX_FETCH_ATTEMPTS) throw error;
            await deps.sleep?.(RETRY_DELAYS_MS[attempt - 1]);
        }
    }
    throw new Error('Unreachable retry state');
}

function candidateIdentity(candidate: SearchCandidate): string {
    return candidate.listingId || candidate.url.split(/[?#]/u, 1)[0];
}

export async function collectListings(plan: SearchPlan, deps: CollectorDependencies, maxResults: number): Promise<CollectionResult> {
    const candidates = new Map<string, SearchCandidate>();
    const failures: CollectionFailure[] = [];
    const warnings: string[] = [];
    let searchPages = 0;

    for (const source of plan.requests) {
        for (let page = 1; page <= MAX_SEARCH_PAGES_PER_REQUEST && candidates.size < maxResults; page += 1) {
            const url = buildOlxSearchUrl(source);
            if (page > 1) url.searchParams.set('page', String(page));
            try {
                const result = await fetchWithPolicy({ url, kind: 'search' }, deps);
                searchPages += 1;
                const parsed = parseSearchResults(result.html, source);
                for (const candidate of parsed) candidates.set(candidateIdentity(candidate), candidate);
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
    for (const candidate of candidates.values()) {
        if (normalized.length >= maxResults) break;
        detailAttempts += 1;
        try {
            const result = await fetchWithPolicy({ url: new URL(candidate.url), kind: 'detail' }, deps);
            const raw = parseListing(result.html, new URL(result.finalUrl));
            const item = normalizeListing(raw, {
                segment: candidate.source.segment,
                matchedQueries: candidate.source.query ? [candidate.source.query] : [],
                originCoordinates: null,
                locationFilterMatched: candidate.source.segment !== 'local' || Boolean(candidate.source.postalCode),
            });
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
