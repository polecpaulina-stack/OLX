import { describe, expect, it, vi } from 'vitest';
import { AccessBlockedError, collectListings, RenderingRequiredError } from '../../src/scraping/collector.js';
import type { CollectorDependencies, FetchRequest, PageFetcher, SearchPlan } from '../../src/types.js';

const source = { source: 'automatic', segment: 'local', query: 'opony', manualUrl: null, postalCode: '55-002', locationName: 'Kamieniec Wrocławski', radiusKm: 50, shippingOnly: false } as const;
const plan: SearchPlan = { generatedQueries: ['opony'], queries: ['opony'], requests: [source] };
const searchPage = (ids: string[]) => `<html><body>${ids.map((id) => `<article><a href="/d/oferta/test-CID5-ID${id}.html"><h4>Oferta ${id}</h4></a></article>`).join('')}</body></html>`;
const listingPage = (id: string) => `<html><head><link rel="canonical" href="https://www.olx.pl/d/oferta/test-CID5-ID${id}.html"><script type="application/ld+json">{"@type":"Product","name":"Opony zimowe ${id}","offers":{"price":"500","priceCurrency":"PLN"},"description":"Opis"}</script></head><body><h1>Opony zimowe ${id}</h1></body></html>`;

function deps(http: PageFetcher, browser: PageFetcher = { fetchHtml: vi.fn() }): CollectorDependencies {
    return { httpFetcher: http, browserFetcher: browser, saveCheckpoint: vi.fn(), now: () => new Date('2026-10-03T12:00:00Z'), sleep: vi.fn() };
}

describe('collectListings', () => {
    it('paginates, deduplicates before detail fetch, checkpoints and respects the global cap without browser fallback', async () => {
        const detailCalls: string[] = [];
        const http: PageFetcher = { fetchHtml: vi.fn(async (request: FetchRequest) => {
            if (request.kind === 'search') return { html: request.url.searchParams.get('page') === '2' ? searchPage(['A', 'B']) : request.url.searchParams.get('page') === '3' ? searchPage([]) : searchPage(['A']), statusCode: 200, finalUrl: request.url.href };
            detailCalls.push(request.url.href);
            return { html: listingPage(request.url.href.includes('IDA') ? 'A' : 'B'), statusCode: 200, finalUrl: request.url.href };
        }) };
        const dependencies = deps(http);
        const result = await collectListings(plan, dependencies, 2);
        expect(result.listings).toHaveLength(2);
        expect(detailCalls).toHaveLength(2);
        expect(dependencies.saveCheckpoint).toHaveBeenCalledTimes(2);
        expect(dependencies.browserFetcher.fetchHtml).not.toHaveBeenCalled();
    });

    it('uses browser fallback only for RenderingRequiredError', async () => {
        const http: PageFetcher = { fetchHtml: vi.fn(async (request) => {
            if (request.kind === 'search') return { html: searchPage(['A']), statusCode: 200, finalUrl: request.url.href };
            throw new RenderingRequiredError('client rendered');
        }) };
        const browser: PageFetcher = { fetchHtml: vi.fn(async (request) => ({ html: listingPage('A'), statusCode: 200, finalUrl: request.url.href })) };
        const result = await collectListings(plan, deps(http, browser), 1);
        expect(result.listings).toHaveLength(1);
        expect(browser.fetchHtml).toHaveBeenCalledTimes(1);
    });

    it('merges queries and segments before a single detail fetch in both mode', async () => {
        const local = { ...source, query: 'opony lokalnie' };
        const shipping = { ...source, segment: 'shipping' as const, query: 'opony wysyłka', postalCode: null, locationName: null, radiusKm: null, shippingOnly: true };
        const bothPlan: SearchPlan = { generatedQueries: [], queries: ['opony lokalnie', 'opony wysyłka'], requests: [local, shipping] };
        let detailCalls = 0;
        const http: PageFetcher = { fetchHtml: vi.fn(async (request) => {
            if (request.kind === 'search') return { html: request.url.searchParams.has('page') ? searchPage([]) : searchPage(['A']), statusCode: 200, finalUrl: request.url.href };
            detailCalls += 1;
            return { html: listingPage('A'), statusCode: 200, finalUrl: request.url.href };
        }) };
        const result = await collectListings(bothPlan, deps(http), 2);
        expect(detailCalls).toBe(1);
        expect(result.listings[0].matchedSegments).toEqual(['local', 'shipping']);
        expect(result.listings[0].matchedQueries).toEqual(['opony lokalnie', 'opony wysyłka']);
    });

    it('retries access blocks three times with increasing delays, never using a browser', async () => {
        const http: PageFetcher = { fetchHtml: vi.fn(async () => { throw new AccessBlockedError('429'); }) };
        const dependencies = deps(http);
        const result = await collectListings(plan, dependencies, 3);
        expect(http.fetchHtml).toHaveBeenCalledTimes(3);
        expect(dependencies.sleep).toHaveBeenNthCalledWith(1, 250);
        expect(dependencies.sleep).toHaveBeenNthCalledWith(2, 1000);
        expect(dependencies.browserFetcher.fetchHtml).not.toHaveBeenCalled();
        expect(result.partial).toBe(true);
    });

    it('preserves good records and reports terminal selector drift above 50 percent', async () => {
        const http: PageFetcher = { fetchHtml: vi.fn(async (request) => {
            if (request.kind === 'search') return { html: searchPage(['A', 'B', 'C']), statusCode: 200, finalUrl: request.url.href };
            return { html: request.url.href.includes('IDA') ? listingPage('A') : '<html><body>Układ strony zmieniony</body></html>', statusCode: 200, finalUrl: request.url.href };
        }) };
        const result = await collectListings(plan, deps(http), 3);
        expect(result.listings).toHaveLength(1);
        expect(result.partial).toBe(true);
        expect(result.selectorDrift).toMatchObject({ terminal: true, attempted: 3, failures: 2 });
        expect(result.warnings.join(' ')).toMatch(/selektor/iu);
    });
});
