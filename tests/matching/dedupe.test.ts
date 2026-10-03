import { describe, expect, it } from 'vitest';
import { deduplicateListings } from '../../src/matching/dedupe.js';
import { listing } from './helpers.js';

describe('deduplicateListings', () => {
    it('deduplicates by listing ID and keeps the more complete copy', () => {
        const sparse = listing({ dataCompleteness: 0.4, descriptionClean: null, matchedQueries: ['opony'], segment: 'local' });
        const complete = listing({ url: 'https://www.olx.pl/d/oferta/inny-slug-CID1-ID1.html', dataCompleteness: 1, matchedQueries: ['michelin 205/55 R16'], segment: 'shipping' });
        const result = deduplicateListings([sparse, complete]);
        expect(result).toHaveLength(1);
        expect(result[0].dataCompleteness).toBe(1);
        expect(result[0].matchedQueries).toEqual(['opony', 'michelin 205/55 R16']);
        expect(result[0].matchedSegments).toEqual(['local', 'shipping']);
    });

    it('falls back to normalized canonical URL and preserves order', () => {
        const first = listing({ listingId: '', canonicalUrl: 'https://www.olx.pl/d/oferta/test-IDX.html?reason=observed_ad' });
        const duplicate = listing({ listingId: '', canonicalUrl: 'https://www.olx.pl/d/oferta/test-IDX.html#details', dataCompleteness: 0.9 });
        const other = listing({ listingId: 'ID2', canonicalUrl: 'https://www.olx.pl/d/oferta/other-ID2.html' });
        expect(deduplicateListings([first, duplicate, other]).map((item) => item.listingId)).toEqual(['', 'ID2']);
    });
});
