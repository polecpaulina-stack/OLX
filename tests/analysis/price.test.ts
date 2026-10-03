import { describe, expect, it } from 'vitest';
import { analyzePrices } from '../../src/analysis/price.js';
import type { ScoredListing } from '../../src/types.js';
import { listing } from '../matching/helpers.js';

function priced(price: number, index: number, overrides: Partial<ScoredListing> = {}): ScoredListing {
    return { ...listing({ listingId: `ID${index}`, price, segment: 'local' }), score: 0.8, included: true, matchReasons: [], exclusionReasons: [], ...overrides };
}

describe('analyzePrices', () => {
    it('marks IQR outliers and calculates weighted strategies from the clean sample', () => {
        const values = [100, 110, 120, 130, 140, 150, 160, 170, 1000].map((price, index) => priced(price, index, { score: index === 4 ? 1 : 0.8 }));
        const result = analyzePrices(values, 'local');
        expect(result.counts).toMatchObject({ candidates: 9, comparable: 9, afterOutliers: 8, outliers: 1 });
        expect(result.before.maximum).toBe(1000);
        expect(result.after.maximum).toBe(170);
        expect(result.strategies.market).not.toBeNull();
        expect(Number.isInteger(result.strategies.market!)).toBe(true);
        expect(result.confidence).toBe('low');
    });

    it('separates segment, promotion and seller slices', () => {
        const values = [
            priced(100, 1, { isPromoted: true, sellerType: 'business' }),
            priced(120, 2, { sellerType: 'private' }),
            priced(999, 3, { segment: 'shipping' }),
        ];
        const result = analyzePrices(values, 'local');
        expect(result.counts.candidates).toBe(2);
        expect(result.slices.promoted.count).toBe(1);
        expect(result.slices.private.count).toBe(1);
        expect(result.slices.business.count).toBe(1);
    });

    it('returns null strategies and warnings for no comparable prices', () => {
        const result = analyzePrices([priced(100, 1, { included: false })], 'local');
        expect(result.strategies).toEqual({ quick: null, market: null, ambitious: null });
        expect(result.confidence).toBe('none');
        expect(result.warnings.length).toBeGreaterThan(0);
    });

    it.each([[9, 'low'], [10, 'medium'], [24, 'medium'], [25, 'high']] as const)('sets confidence for %i offers', (count, confidence) => {
        const result = analyzePrices(Array.from({ length: count }, (_, index) => priced(100 + index, index)), 'local');
        expect(result.confidence).toBe(confidence);
    });
});
