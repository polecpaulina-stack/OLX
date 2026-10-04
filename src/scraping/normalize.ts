import type { CategoryAttributes, NormalizeContext, NormalizedListing, RawListing } from '../types.js';
import { redactContactData } from './redact.js';

const normalizeWhitespace = (value: string): string => value.trim().replace(/\s+/gu, ' ');

function parsePrice(value: string | null): number | null {
    if (!value) return null;
    if (/za darmo/iu.test(value)) return 0;
    const currencyMatch = value.match(/(\d[\d\s]*(?:[.,]\d{1,2})?)\s*(?:zł|PLN)(?=$|\s|do\s*negocjacji|[.,;:!?])/iu);
    const plainMatch = value.match(/^\s*(\d[\d\s]*(?:[.,]\d{1,2})?)\s*$/u);
    const priceText = currencyMatch?.[1] ?? plainMatch?.[1];
    if (!priceText) return null;
    const parsed = Number(priceText.replace(/\s/gu, '').replace(',', '.'));
    return Number.isFinite(parsed) ? parsed : null;
}

function normalizeAttributes(values: Record<string, string>): Record<string, string> {
    return Object.fromEntries(
        Object.entries(values)
            .map(([key, value]) => [redactContactData(normalizeWhitespace(key)), redactContactData(normalizeWhitespace(value))] as const)
            .filter(([key, value]) => key.length > 0 && value.length > 0),
    );
}

function haversineKm(first: { latitude: number; longitude: number }, second: { latitude: number; longitude: number }): number {
    const radians = (degrees: number): number => (degrees * Math.PI) / 180;
    const dLat = radians(second.latitude - first.latitude);
    const dLon = radians(second.longitude - first.longitude);
    const a = Math.sin(dLat / 2) ** 2
        + Math.cos(radians(first.latitude)) * Math.cos(radians(second.latitude)) * Math.sin(dLon / 2) ** 2;
    return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function completeness(listing: RawListing): number {
    const values = [listing.priceText, listing.condition, listing.locationName, listing.description, listing.photoCount];
    return values.filter((value) => value !== null).length / values.length;
}

export function normalizeListing(raw: RawListing, context: NormalizeContext): NormalizedListing {
    const attributesRaw = normalizeAttributes(raw.attributesRaw);
    const descriptionClean = raw.description ? redactContactData(normalizeWhitespace(raw.description)) : null;
    const coordinates = raw.latitude !== null && raw.longitude !== null
        ? { latitude: raw.latitude, longitude: raw.longitude }
        : null;
    return {
        ...raw,
        title: redactContactData(normalizeWhitespace(raw.title)),
        attributesRaw,
        description: descriptionClean,
        price: parsePrice(raw.priceText),
        priceNegotiable: /negocjac/iu.test(raw.priceText ?? ''),
        attributesNormalized: { ...attributesRaw },
        distanceKm: coordinates && context.originCoordinates
            ? haversineKm(context.originCoordinates, coordinates)
            : null,
        locationFilterMatched: context.locationFilterMatched,
        descriptionClean,
        matchedQueries: [...context.matchedQueries],
        segment: context.segment,
        dataCompleteness: completeness(raw),
    };
}

export function mergeCategoryAttributes(listing: NormalizedListing, extracted: CategoryAttributes): CategoryAttributes {
    return { ...listing.attributesNormalized, ...extracted };
}
