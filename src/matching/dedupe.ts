import type { NormalizedListing, SearchSegment } from '../types.js';

function identity(listing: NormalizedListing): string {
    if (listing.listingId.trim()) return `id:${listing.listingId.trim().toLocaleLowerCase('pl-PL')}`;
    try {
        const url = new URL(listing.canonicalUrl);
        return `url:${url.origin}${url.pathname.replace(/\/$/u, '')}`.toLocaleLowerCase('pl-PL');
    } catch {
        return `url:${listing.canonicalUrl.split(/[?#]/u, 1)[0].replace(/\/$/u, '').toLocaleLowerCase('pl-PL')}`;
    }
}

function unique<T>(values: T[]): T[] {
    return [...new Set(values)];
}

export function deduplicateListings(listings: NormalizedListing[]): NormalizedListing[] {
    const positions = new Map<string, number>();
    const result: NormalizedListing[] = [];

    for (const listing of listings) {
        const key = identity(listing);
        const position = positions.get(key);
        if (position === undefined) {
            positions.set(key, result.length);
            result.push({ ...listing, matchedSegments: unique(listing.matchedSegments ?? [listing.segment]) });
            continue;
        }

        const previous = result[position];
        const winner = listing.dataCompleteness > previous.dataCompleteness ? listing : previous;
        const segments = unique<SearchSegment>([
            ...(previous.matchedSegments ?? [previous.segment]),
            ...(listing.matchedSegments ?? [listing.segment]),
        ]);
        result[position] = {
            ...winner,
            matchedQueries: unique([...previous.matchedQueries, ...listing.matchedQueries]),
            matchedSegments: segments,
        };
    }
    return result;
}
