import type { CategoryAttributes, NormalizedListing } from '../types.js';

const BRANDS = ['Bartek', 'Geox', 'Ecco', 'Nike', 'Adidas', 'Lasocki', 'Clarks', 'Reima'];

export function extractKidsShoesAttributes(listing: NormalizedListing): CategoryAttributes {
    const text = `${listing.title} ${listing.descriptionClean ?? ''}`;
    const size = text.match(/\b(?:rozmiar|rozm\.)\s*[:.-]?\s*(1[6-9]|[2-3]\d|4[0-2])\b/iu);
    const insole = text.match(/\b(?:długość\s+)?wkładk[ai]\D{0,10}(\d{1,2}(?:[,.]\d+)?)\s*cm\b/iu);
    const season = text.match(/\b(zimowe|letnie|przejściowe|wiosenne|jesienne|całoroczne)\b/iu);
    const material = text.match(/\b(skóra naturalna|skóra ekologiczna|zamsz|tekstylne|materiał tekstylny|guma)\b/iu);
    const brand = BRANDS.find((candidate) => new RegExp(`\\b${candidate}\\b`, 'iu').test(text));

    return Object.fromEntries(Object.entries({
        shoeSize: size ? Number(size[1]) : undefined,
        insoleLengthCm: insole ? Number(insole[1].replace(',', '.')) : undefined,
        season: season?.[1].toLocaleLowerCase('pl-PL'),
        material: material?.[1].toLocaleLowerCase('pl-PL'),
        brand,
    }).filter((entry) => entry[1] !== undefined)) as CategoryAttributes;
}
