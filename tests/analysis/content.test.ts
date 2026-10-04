import { describe, expect, it } from 'vitest';
import { analyzeContent } from '../../src/analysis/content.js';
import type { ScoredListing } from '../../src/types.js';
import { listing } from '../matching/helpers.js';

function scored(index: number, price: number, title: string, description: string): ScoredListing {
    return { ...listing({ listingId: `ID${index}`, price, title, descriptionClean: description, photoCount: index + 2, attributesNormalized: { tireSize: '205/55 R16' } }), score: 0.8, included: true, matchReasons: [], exclusionReasons: [] };
}

describe('analyzeContent', () => {
    it('aggregates stable Polish phrases, attributes and lengths without copying descriptions', () => {
        const items = [
            scored(1, 400, 'Opony zimowe Michelin komplet', 'Bieżnik siedem mm i dobry stan.'),
            scored(2, 800, 'Opony zimowe Michelin premium', 'Bieżnik osiem mm, bardzo dobry stan, bez napraw.'),
        ];
        const result = analyzeContent(items);
        expect(result.commonPhrases.map((item) => item.phrase)).toContain('opony zimowe');
        expect(result.commonAttributes[0]).toMatchObject({ name: 'tireSize', value: '205/55 R16', count: 2 });
        expect(result.averages.titleLength).toBeGreaterThan(0);
        expect(result.averages.photoCount).toBe(3.5);
        expect(result.priceBandContrasts.lower.count).toBe(1);
        expect(JSON.stringify(result)).not.toContain('bez napraw');
    });

    it('ignores excluded offers and returns empty aggregates safely', () => {
        const item = scored(1, 400, 'Opony zimowe', 'Opis');
        item.included = false;
        expect(analyzeContent([item]).count).toBe(0);
    });
});
