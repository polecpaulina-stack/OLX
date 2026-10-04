import type { CategoryAttributes, NormalizedListing } from '../types.js';

const BRANDS = ['Velux', 'Fakro', 'Roto', 'Okpol'];

export function extractRoofWindowSashAttributes(listing: NormalizedListing): CategoryAttributes {
    const text = `${listing.title} ${listing.descriptionClean ?? ''}`;
    const dimensions = text.match(/\b(\d{2,3})\s*[x×]\s*(\d{2,3})\s*cm\b/iu);
    const model = text.match(/\b([A-Z]{2,4})\s*[- ]?([A-Z]{0,2}\d{2,4})\b/u);
    const glazing = text.match(/\b(jedno|dwu|trzy)[ -]?(?:szybowe|szybowy)\b/iu);
    const brand = BRANDS.find((candidate) => new RegExp(`\\b${candidate}\\b`, 'iu').test(text));

    return Object.fromEntries(Object.entries({
        dimensions: dimensions ? `${dimensions[1]} x ${dimensions[2]} cm` : undefined,
        brand,
        model: model ? `${model[1]} ${model[2]}`.trim() : undefined,
        glazing: glazing ? `${glazing[1].toLocaleLowerCase('pl-PL')}szybowe` : undefined,
    }).filter((entry) => entry[1] !== undefined)) as CategoryAttributes;
}
