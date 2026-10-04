import type { NormalizedListing, ValidatedInput } from '../../src/types.js';

export function listing(overrides: Partial<NormalizedListing> = {}): NormalizedListing {
    return {
        listingId: 'ID1', url: 'https://www.olx.pl/d/oferta/test-CID1-ID1.html', canonicalUrl: 'https://www.olx.pl/d/oferta/test-CID1-ID1.html',
        title: 'Opony zimowe Michelin 205/55 R16', priceText: '500 zł', currency: 'PLN', categoryPath: ['Motoryzacja', 'Opony'], condition: 'używane',
        attributesRaw: {}, locationName: 'Wrocław', voivodeship: 'dolnośląskie', latitude: null, longitude: null, shippingAvailable: false,
        sellerType: 'private', publishedAt: null, refreshedAt: null, description: 'Komplet opon.', photoCount: 4, isPromoted: false,
        price: 500, priceNegotiable: false, attributesNormalized: { tireSize: '205/55 R16', quantity: 4 }, distanceKm: 10,
        locationFilterMatched: true, descriptionClean: 'Komplet opon.', matchedQueries: ['opony zimowe'], segment: 'local', dataCompleteness: 0.8,
        ...overrides,
    };
}

export function input(overrides: Partial<ValidatedInput> = {}): ValidatedInput {
    return {
        itemName: 'opony zimowe 205/55 R16', category: 'Motoryzacja / Opony', brandModel: 'Michelin Pilot Alpin', condition: 'used',
        attributes: 'komplet 4 sztuki, 205/55 R16', defects: null, expectedPrice: null, deliveryMode: 'local', postalCode: '55-002', locationName: 'Kamieniec Wrocławski', radiusKm: 50,
        manualQueries: [], manualSearchUrls: [], queryMode: 'merge', maxResults: 50, includePromoted: false, ...overrides,
    };
}
