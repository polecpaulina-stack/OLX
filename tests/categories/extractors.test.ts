import { describe, expect, it } from 'vitest';

import {
    extractCategoryAttributes,
    selectCategoryExtractor,
} from '../../src/categories/registry.js';
import type { NormalizedListing, ValidatedInput } from '../../src/types.js';

function listing(title: string, descriptionClean: string): NormalizedListing {
    return {
        listingId: '1',
        url: 'https://www.olx.pl/d/oferta/test-CID1-ID1.html',
        canonicalUrl: 'https://www.olx.pl/d/oferta/test-CID1-ID1.html',
        title,
        priceText: '100 zł',
        currency: 'PLN',
        categoryPath: [],
        condition: 'używane',
        attributesRaw: { Stan: 'Używane' },
        locationName: 'Wrocław',
        voivodeship: 'dolnośląskie',
        latitude: null,
        longitude: null,
        shippingAvailable: false,
        sellerType: 'private',
        publishedAt: null,
        refreshedAt: null,
        description: descriptionClean,
        photoCount: 3,
        isPromoted: false,
        price: 100,
        priceNegotiable: false,
        attributesNormalized: { Stan: 'Używane' },
        distanceKm: null,
        locationFilterMatched: true,
        descriptionClean,
        matchedQueries: ['test'],
        segment: 'local',
        dataCompleteness: 1,
    };
}

function input(itemName: string, category: string | null): ValidatedInput {
    return {
        itemName,
        category,
        brandModel: null,
        condition: 'used',
        attributes: null,
        defects: null,
        expectedPrice: null,
        deliveryMode: 'local',
        postalCode: '55-002',
        radiusKm: 50,
        manualQueries: [],
        manualSearchUrls: [],
        queryMode: 'merge',
        maxResults: 50,
        includePromoted: false,
    };
}

describe('category extractors', () => {
    it('extracts tire parameters without treating every number as an attribute', () => {
        const result = extractCategoryAttributes(
            listing('Opony Michelin Pilot Alpin 205/55 R16 run flat', 'Komplet 4 sztuki, DOT 2022, bieżnik 7 mm. Kod 123456789.'),
            input('opony zimowe', 'Motoryzacja / Opony'),
        );

        expect(result).toMatchObject({
            Stan: 'Używane',
            tireSize: '205/55 R16',
            dotYear: 2022,
            treadDepthMm: 7,
            quantity: 4,
            runFlat: true,
            brand: 'Michelin',
        });
        expect(Object.values(result)).not.toContain(123456789);
    });

    it('extracts kids bike parameters', () => {
        const result = extractCategoryAttributes(
            listing('Rower dziecięcy Kross 16 cali', 'Rama 10 cali, 6 biegów, hamulce V-brake.'),
            input('rower dziecięcy', 'Sport / Rowery'),
        );

        expect(result).toMatchObject({ wheelSizeInches: 16, frameSizeInches: 10, gears: 6, brakes: 'V-brake', brand: 'Kross' });
    });

    it('extracts kids shoe parameters', () => {
        const result = extractCategoryAttributes(
            listing('Buty dziecięce zimowe Bartek rozmiar 28', 'Długość wkładki 18 cm, skóra naturalna.'),
            input('buty dziecięce', 'Moda dziecięca / Obuwie'),
        );

        expect(result).toMatchObject({ shoeSize: 28, insoleLengthCm: 18, season: 'zimowe', material: 'skóra naturalna', brand: 'Bartek' });
    });

    it('extracts roof window sash parameters', () => {
        const result = extractCategoryAttributes(
            listing('Skrzydło okienne dachowe Velux GGL MK06', 'Wymiary 78 x 118 cm, pakiet dwuszybowy.'),
            input('skrzydło okienne dachowe', 'Dom i ogród / Okna'),
        );

        expect(result).toMatchObject({ dimensions: '78 x 118 cm', brand: 'Velux', model: 'GGL MK06', glazing: 'dwuszybowe' });
    });

    it('returns raw normalized attributes for unsupported generic items', () => {
        const generic = listing('Zestaw 123456789', 'Przedmiot używany.');
        expect(selectCategoryExtractor(null, 'zestaw')).toBeNull();
        expect(extractCategoryAttributes(generic, input('zestaw', null))).toEqual({ Stan: 'Używane' });
    });
});
