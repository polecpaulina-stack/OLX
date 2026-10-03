import type { ContentAnalysis, ScoredListing } from '../types.js';

const STOP = new Set(['oraz', 'jest', 'dla', 'się', 'nie', 'bardzo', 'stan', 'dobry', 'dobra', 'do', 'na', 'z', 'i', 'w']);

function tokens(value: string): string[] {
    return value.toLocaleLowerCase('pl-PL').match(/[\p{L}\p{N}]+/gu)?.filter((word) => word.length > 2 && !STOP.has(word)) ?? [];
}

function frequencies(values: string[]): Array<{ value: string; count: number }> {
    const counts = new Map<string, number>();
    for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
    return [...counts].map(([value, count]) => ({ value, count })).sort((a, b) => b.count - a.count || a.value.localeCompare(b.value, 'pl')).slice(0, 12);
}

function average(values: Array<number | null>): number | null {
    const present = values.filter((value): value is number => value !== null);
    return present.length ? present.reduce((sum, value) => sum + value, 0) / present.length : null;
}

function band(items: ScoredListing[]): ContentAnalysis['priceBandContrasts']['lower'] {
    const words = frequencies(items.flatMap((item) => tokens(item.title))).slice(0, 5).map((item) => item.value);
    return { count: items.length, commonWords: words, averagePhotoCount: average(items.map((item) => item.photoCount)) };
}

export function analyzeContent(listings: ScoredListing[]): ContentAnalysis {
    const items = listings.filter((item) => item.included);
    const titleTokens = items.map((item) => tokens(item.title));
    const wordCounts = frequencies(titleTokens.flat());
    const phraseCounts = frequencies(titleTokens.flatMap((words) => words.slice(0, -1).map((word, index) => `${word} ${words[index + 1]}`)));
    const attributeCounts = frequencies(items.flatMap((item) => Object.entries(item.attributesNormalized)
        .filter(([, value]) => value !== null)
        .map(([name, value]) => `${name}\u0000${String(value)}`)));
    const priced = items.filter((item) => item.price !== null).sort((a, b) => a.price! - b.price!);
    const midpoint = Math.ceil(priced.length / 2);

    return {
        count: items.length,
        commonWords: wordCounts.map(({ value, count }) => ({ word: value, count })),
        commonPhrases: phraseCounts.map(({ value, count }) => ({ phrase: value, count })),
        commonAttributes: attributeCounts.map(({ value, count }) => {
            const [name, attributeValue] = value.split('\u0000');
            return { name, value: attributeValue, count };
        }),
        averages: {
            titleLength: average(items.map((item) => item.title.length)),
            descriptionLength: average(items.map((item) => item.descriptionClean?.length ?? null)),
            photoCount: average(items.map((item) => item.photoCount)),
        },
        priceBandContrasts: { lower: band(priced.slice(0, midpoint)), upper: band(priced.slice(midpoint)) },
    };
}
