import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { parseListing } from '../../src/scraping/listing-parser.js';

const html = readFileSync(fileURLToPath(new URL('../fixtures/listings/basic.html', import.meta.url)), 'utf8');
const url = new URL('https://www.olx.pl/d/oferta/opony-zimowe-michelin-CID5-IDABC123.html');

describe('parseListing', () => {
    it('prefers structured data and fills semantic-only fields', () => {
        const listing = parseListing(html, url);

        expect(listing).toMatchObject({
            listingId: 'ABC123',
            canonicalUrl: url.href,
            title: 'Opony zimowe Michelin Alpin 6',
            priceText: '899 zł do negocjacji',
            currency: 'PLN',
            locationName: 'Wrocław',
            voivodeship: 'dolnośląskie',
            latitude: 51.1079,
            longitude: 17.0385,
            shippingAvailable: true,
            sellerType: 'private',
            description: 'Komplet 4 sztuki. Tel. +48 600-700-800, e-mail: test@example.com',
            photoCount: 2,
            isPromoted: true,
        });
        expect(listing.attributesRaw).toEqual({ Stan: 'Używane', 'Typ sprzedawcy': 'Osoba prywatna', Rozmiar: '205/55 R16' });
        expect(listing.publishedAt).toBe('2026-10-03T10:30:00+02:00');
    });

    it('preserves null for unavailable optional data', () => {
        const minimal = '<html><body><h1>Rower dziecięcy</h1></body></html>';
        const result = parseListing(minimal, new URL('https://www.olx.pl/d/oferta/rower-CID1-IDXYZ999.html'));

        expect(result.priceText).toBeNull();
        expect(result.locationName).toBeNull();
        expect(result.description).toBeNull();
    });
});
