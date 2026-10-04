import type { CategoryAttributes, NormalizedListing } from '../types.js';

const BRANDS = ['Michelin', 'Continental', 'Goodyear', 'Bridgestone', 'Pirelli', 'Dębica', 'Kleber', 'Nokian'];

export function extractTireAttributes(listing: NormalizedListing): CategoryAttributes {
    const text = `${listing.title} ${listing.descriptionClean ?? ''}`;
    const size = text.match(/\b(\d{3})\s*\/\s*(\d{2})\s*R\s*(\d{2})\b/iu);
    const dot = text.match(/\bDOT\s*[:.-]?\s*((?:19|20)\d{2})\b/iu);
    const tread = text.match(/\b(?:bieżnik|głębokość bieżnika)\D{0,12}(\d+(?:[,.]\d+)?)\s*mm\b/iu);
    const quantity = text.match(/\b(\d{1,2})\s*(?:szt(?:\.|uki?)?|opon(?:y)?)\b/iu);
    const brand = BRANDS.find((candidate) => new RegExp(`\\b${candidate}\\b`, 'iu').test(text));

    return Object.fromEntries(Object.entries({
        tireSize: size ? `${size[1]}/${size[2]} R${size[3]}` : undefined,
        dotYear: dot ? Number(dot[1]) : undefined,
        treadDepthMm: tread ? Number(tread[1].replace(',', '.')) : undefined,
        quantity: quantity ? Number(quantity[1]) : undefined,
        runFlat: /\b(?:run\s*flat|runflat|RFT)\b/iu.test(text) || undefined,
        brand,
    }).filter((entry) => entry[1] !== undefined)) as CategoryAttributes;
}
