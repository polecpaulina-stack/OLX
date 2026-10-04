import type { CategoryAttributes, CategoryExtractor, NormalizedListing, ValidatedInput } from '../types.js';
import { mergeCategoryAttributes } from '../scraping/normalize.js';
import { extractKidsBikeAttributes } from './kids-bike.js';
import { extractKidsShoesAttributes } from './kids-shoes.js';
import { extractRoofWindowSashAttributes } from './roof-window-sash.js';
import { extractTireAttributes } from './tires.js';

export function selectCategoryExtractor(category: string | null, itemName: string): CategoryExtractor | null {
    const text = `${category ?? ''} ${itemName}`.toLocaleLowerCase('pl-PL');
    if (/\b(opon|opony|ogumienie)\b/u.test(text)) return extractTireAttributes;
    if (/\b(rower|rowerek)\b/u.test(text) && /\b(dzieci|dziecięcy|dziecięca|junior)\b/u.test(text)) return extractKidsBikeAttributes;
    if (/\b(but|buty|obuwie)\b/u.test(text) && /\b(dzieci|dziecięce|dziecięcy)\b/u.test(text)) return extractKidsShoesAttributes;
    if (/\b(skrzydło|okno|okna)\b/u.test(text) && /\b(dachowe|dachowy|dach)\b/u.test(text)) return extractRoofWindowSashAttributes;
    return null;
}

export function extractCategoryAttributes(listing: NormalizedListing, input: ValidatedInput): CategoryAttributes {
    const extractor = selectCategoryExtractor(input.category, input.itemName);
    return mergeCategoryAttributes(listing, extractor ? extractor(listing) : {});
}
