import { describe, expect, it } from 'vitest';

import { buildSearchPlan } from '../../src/search/query-builder.js';
import type { ValidatedInput } from '../../src/types.js';

const input: ValidatedInput = {
    itemName: 'Opony zimowe',
    category: 'Motoryzacja',
    brandModel: 'Michelin Alpin 6',
    condition: 'used',
    attributes: '205/55 R16, komplet 4 sztuki, DOT 2022',
    defects: null,
    expectedPrice: null,
    deliveryMode: 'local',
    postalCode: '55-002',
    radiusKm: 50,
    manualQueries: [],
    manualSearchUrls: [],
    queryMode: 'merge',
    maxResults: 100,
    includePromoted: true,
};

describe('buildSearchPlan', () => {
    it('builds at most five stable automatic queries retaining model and numeric attributes', () => {
        const plan = buildSearchPlan(input);

        expect(plan.generatedQueries.length).toBeLessThanOrEqual(5);
        expect(plan.generatedQueries[0]).toBe('Opony zimowe Michelin Alpin 6 205/55 R16 4 2022');
        expect(new Set(plan.generatedQueries.map((value) => value.toLocaleLowerCase('pl-PL'))).size).toBe(
            plan.generatedQueries.length,
        );
    });

    it('merges manual queries after automatic queries and removes case-insensitive duplicates', () => {
        const plan = buildSearchPlan({
            ...input,
            manualQueries: ['Michelin Alpin 6', ' opony zimowe ', 'MICHELIN ALPIN 6'],
        });

        expect(plan.queries).toContain('Michelin Alpin 6');
        expect(plan.queries.filter((value) => value.toLocaleLowerCase('pl-PL') === 'michelin alpin 6')).toHaveLength(1);
        expect(plan.queries.at(-1)).toBe('Michelin Alpin 6');
    });

    it('uses only manual sources in manual-only mode', () => {
        const plan = buildSearchPlan({
            ...input,
            queryMode: 'manual-only',
            manualQueries: ['opony 205/55 R16'],
            manualSearchUrls: ['https://www.olx.pl/oferty/q-michelin-alpin/'],
        });

        expect(plan.generatedQueries).toEqual([]);
        expect(plan.queries).toEqual(['opony 205/55 R16']);
        expect(plan.requests).toEqual([
            expect.objectContaining({ source: 'manual-query', segment: 'local', query: 'opony 205/55 R16' }),
            expect.objectContaining({
                source: 'manual-url',
                segment: 'local',
                manualUrl: 'https://www.olx.pl/oferty/q-michelin-alpin/',
            }),
        ]);
    });

    it('rejects manual-only mode without a query or URL', () => {
        expect(() => buildSearchPlan({ ...input, queryMode: 'manual-only' })).toThrow(/manual-only/i);
    });

    it('creates separate local and shipping requests for both mode', () => {
        const plan = buildSearchPlan({ ...input, deliveryMode: 'both' });

        expect(new Set(plan.requests.map((request) => request.segment))).toEqual(new Set(['local', 'shipping']));
        expect(plan.requests.filter((request) => request.segment === 'local')).toHaveLength(plan.queries.length);
        expect(plan.requests.filter((request) => request.segment === 'shipping')).toHaveLength(plan.queries.length);
    });
});
