import type { CategoryAttributes, NormalizedListing } from '../types.js';

const BRANDS = ['Kross', 'Decathlon', 'BTwin', 'Woom', 'Puky', 'Romet', 'Kellys', 'Giant'];

export function extractKidsBikeAttributes(listing: NormalizedListing): CategoryAttributes {
    const text = `${listing.title} ${listing.descriptionClean ?? ''}`;
    const wheel = text.match(/\b(?:koł[ao]\s*)?(1[02468]|20|24|26)\s*(?:cali|cal(?:e|i)?|")/iu);
    const frame = text.match(/\bram[ay]\D{0,10}(\d{1,2}(?:[,.]\d+)?)\s*(?:cali|cal(?:e|i)?|")/iu);
    const gears = text.match(/\b(\d{1,2})\s*(?:bieg(?:ów|i)?|przerzutek)\b/iu);
    const brakes = text.match(/\b(V[ -]?brake|hamulce?\s+(?:tarczowe|rolkowe|szczękowe)|tarczowe|rolkowe)\b/iu);
    const brand = BRANDS.find((candidate) => new RegExp(`\\b${candidate}\\b`, 'iu').test(text));

    return Object.fromEntries(Object.entries({
        wheelSizeInches: wheel ? Number(wheel[1]) : undefined,
        frameSizeInches: frame ? Number(frame[1].replace(',', '.')) : undefined,
        gears: gears ? Number(gears[1]) : undefined,
        brakes: brakes ? brakes[1].replace(/^hamulce?\s+/iu, '').replace(/^v[ -]?brake$/iu, 'V-brake') : undefined,
        brand,
    }).filter((entry) => entry[1] !== undefined)) as CategoryAttributes;
}
