import { describe, expect, it } from 'vitest';

import { normalizeListing } from '../../src/scraping/normalize.js';
import type { NormalizeContext, RawListing } from '../../src/types.js';

const raw: RawListing = {
    listingId: 'ABC123', url: 'https://www.olx.pl/d/oferta/test-IDABC123.html',
    canonicalUrl: 'https://www.olx.pl/d/oferta/test-IDABC123.html', title: '  Opony   zimowe  ',
    priceText: '1 299,50 zł do negocjacji', currency: 'PLN', categoryPath: ['Motoryzacja', 'Opony'],
    condition: 'Używane', attributesRaw: { ' Rozmiar ': ' 205/55 R16 ' }, locationName: 'Wrocław',
    voivodeship: 'dolnośląskie', latitude: 51.1079, longitude: 17.0385, shippingAvailable: false,
    sellerType: 'private', publishedAt: '2026-10-03T10:30:00+02:00', refreshedAt: null,
    description: 'Kontakt: tel. +48 600 700 800, kod produktu 123456789', photoCount: 2,
    isPromoted: false,
};
const context: NormalizeContext = {
    segment: 'local', matchedQueries: ['opony zimowe'], originCoordinates: { latitude: 51.2000, longitude: 17.0000 },
    locationFilterMatched: true,
};

describe('normalizeListing', () => {
    it('normalizes Polish prices, negotiation and whitespace', () => {
        const result = normalizeListing(raw, context);

        expect(result.price).toBe(1299.5);
        expect(result.priceNegotiable).toBe(true);
        expect(result.title).toBe('Opony zimowe');
        expect(result.attributesRaw).toEqual({ Rozmiar: '205/55 R16' });
        expect(result.descriptionClean).toContain('[DANE KONTAKTOWE]');
        expect(result.descriptionClean).toContain('123456789');
        expect(result.description).toBe(result.descriptionClean);
    });

    it('redacts contact data from every free-text field persisted in normalized records', () => {
        const result = normalizeListing({
            ...raw,
            title: 'Opony, kontakt test@example.com',
            attributesRaw: { Telefon: '600 700 800', Rozmiar: '205/55 R16' },
        }, context);
        expect(JSON.stringify({ title: result.title, description: result.description, attributesRaw: result.attributesRaw }))
            .not.toMatch(/test@example\.com|600 700 800/u);
        expect(result.title).toContain('[DANE KONTAKTOWE]');
        expect(result.attributesRaw.Telefon).toContain('[DANE KONTAKTOWE]');
    });

    it.each([
        ['Za darmo', 0],
        ['brak ceny', null],
    ])('normalizes price %s to %s', (priceText, expected) => {
        expect(normalizeListing({ ...raw, priceText }, context).price).toBe(expected);
    });

    it('calculates Haversine distance when both coordinates exist', () => {
        expect(normalizeListing(raw, context).distanceKm).toBeCloseTo(10.6, 0);
    });

    it('leaves distance null when coordinates are unavailable while preserving filter match', () => {
        const result = normalizeListing({ ...raw, latitude: null, longitude: null }, context);

        expect(result.distanceKm).toBeNull();
        expect(result.locationFilterMatched).toBe(true);
    });
});
