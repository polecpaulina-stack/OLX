import { describe, expect, it } from 'vitest';

import { validateInput } from '../src/input.js';

const requiredInput = {
    itemName: 'Opony zimowe',
    condition: 'used',
    deliveryMode: 'local',
};

describe('validateInput', () => {
    it('applies the agreed local-analysis defaults', () => {
        const result = validateInput(requiredInput);

        expect(result).toMatchObject({
            itemName: 'Opony zimowe',
            condition: 'used',
            deliveryMode: 'local',
            postalCode: '55-002',
            radiusKm: 50,
            queryMode: 'merge',
            maxResults: 100,
            manualQueries: [],
            manualSearchUrls: [],
            includePromoted: true,
        });
    });

    it.each(['local', 'shipping', 'both'] as const)('accepts delivery mode %s', (deliveryMode) => {
        expect(validateInput({ ...requiredInput, deliveryMode }).deliveryMode).toBe(deliveryMode);
    });

    it.each([10, 300])('accepts maxResults boundary %s', (maxResults) => {
        expect(validateInput({ ...requiredInput, maxResults }).maxResults).toBe(maxResults);
    });

    it.each([9, 301])('rejects maxResults outside the 10-300 range: %s', (maxResults) => {
        expect(() => validateInput({ ...requiredInput, maxResults })).toThrow(/maxResults/i);
    });

    it('rejects an unsupported condition', () => {
        expect(() => validateInput({ ...requiredInput, condition: 'excellent' })).toThrow(/condition/i);
    });

    it.each(['local', 'both'] as const)('rejects an invalid postal code for %s delivery', (deliveryMode) => {
        expect(() => validateInput({ ...requiredInput, deliveryMode, postalCode: '55002' })).toThrow(/postalCode/i);
    });

    it('allows shipping mode without an explicitly supplied postal code', () => {
        const result = validateInput({ ...requiredInput, deliveryMode: 'shipping', postalCode: undefined });

        expect(result.deliveryMode).toBe('shipping');
    });

    it.each([0, 101])('rejects a local radius outside the 1-100 km range: %s', (radiusKm) => {
        expect(() => validateInput({ ...requiredInput, radiusKm })).toThrow(/radiusKm/i);
    });

    it('normalizes whitespace and preserves optional product data', () => {
        const result = validateInput({
            ...requiredInput,
            itemName: '  Opony   zimowe  ',
            category: '  Motoryzacja  ',
            brandModel: '  Michelin   Alpin  ',
            attributes: '  205/55 R16   komplet 4 szt.  ',
            defects: '  jedna felga   porysowana  ',
            expectedPrice: 900,
            manualQueries: ['  Michelin   Alpin  ', ' ', 'opony 205/55 R16'],
            manualSearchUrls: ['  https://www.olx.pl/oferty/q-opony-zimowe/  '],
            queryMode: 'manual-only',
            includePromoted: false,
        });

        expect(result).toMatchObject({
            itemName: 'Opony zimowe',
            category: 'Motoryzacja',
            brandModel: 'Michelin Alpin',
            attributes: '205/55 R16 komplet 4 szt.',
            defects: 'jedna felga porysowana',
            expectedPrice: 900,
            manualQueries: ['Michelin Alpin', 'opony 205/55 R16'],
            manualSearchUrls: ['https://www.olx.pl/oferty/q-opony-zimowe/'],
            queryMode: 'manual-only',
            includePromoted: false,
        });
    });
});
