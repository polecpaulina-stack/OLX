import type { PriceAnalysis, PriceSlice, PriceStatistics, ScoredListing, SearchSegment } from '../types.js';

function quantile(sorted: number[], fraction: number): number | null {
    if (!sorted.length) return null;
    const position = (sorted.length - 1) * fraction;
    const lower = Math.floor(position);
    const remainder = position - lower;
    return sorted[lower + 1] === undefined ? sorted[lower] : sorted[lower] + remainder * (sorted[lower + 1] - sorted[lower]);
}

function weightedQuantile(items: ScoredListing[], fraction: number): number | null {
    const sorted = items.filter((item) => item.price !== null).sort((a, b) => a.price! - b.price!);
    const total = sorted.reduce((sum, item) => sum + Math.max(item.score, 0.01), 0);
    const target = total * fraction;
    let cumulative = 0;
    for (const item of sorted) {
        cumulative += Math.max(item.score, 0.01);
        if (cumulative >= target) return item.price;
    }
    return sorted.at(-1)?.price ?? null;
}

function statistics(items: ScoredListing[]): PriceStatistics {
    const values = items.map((item) => item.price).filter((price): price is number => price !== null).sort((a, b) => a - b);
    if (!values.length) return { minimum: null, maximum: null, mean: null, median: null, lowerQuartile: null, upperQuartile: null, weightedMedian: null };
    return {
        minimum: values[0], maximum: values.at(-1)!,
        mean: values.reduce((sum, value) => sum + value, 0) / values.length,
        median: quantile(values, 0.5), lowerQuartile: quantile(values, 0.25), upperQuartile: quantile(values, 0.75),
        weightedMedian: weightedQuantile(items, 0.5),
    };
}

function slice(items: ScoredListing[], predicate: (item: ScoredListing) => boolean): PriceSlice {
    const selected = items.filter(predicate);
    return { count: selected.length, median: statistics(selected).median };
}

const roundedPln = (value: number | null): number | null => value === null ? null : Math.round(value);

export function analyzePrices(listings: ScoredListing[], segment: SearchSegment): PriceAnalysis {
    const candidates = listings.filter((item) => item.segment === segment || item.matchedSegments?.includes(segment));
    const comparable = candidates.filter((item) => item.included && item.price !== null && Number.isFinite(item.price));
    const before = statistics(comparable);
    const q1 = before.lowerQuartile;
    const q3 = before.upperQuartile;
    const iqr = q1 !== null && q3 !== null ? q3 - q1 : null;
    const clean = comparable.filter((item) => iqr === null || (item.price! >= q1! - 1.5 * iqr && item.price! <= q3! + 1.5 * iqr));
    const outliers = comparable.filter((item) => !clean.includes(item));
    const after = statistics(clean);
    const averageCompleteness = clean.length ? clean.reduce((sum, item) => sum + item.dataCompleteness, 0) / clean.length : 0;
    const confidence = clean.length === 0 ? 'none' : clean.length < 10 ? 'low' : clean.length < 25 ? 'medium' : averageCompleteness >= 0.7 ? 'high' : 'medium';
    const warnings: string[] = [];
    if (!clean.length) warnings.push('Brak porównywalnych ofert z ceną.');
    if (outliers.length) warnings.push(`Wyłączono ${outliers.length} wartości odstających metodą IQR.`);
    if (clean.length > 0 && confidence === 'low') warnings.push('Mała próba — rekomendacje cenowe mają niską pewność.');

    return {
        segment,
        counts: { candidates: candidates.length, comparable: comparable.length, afterOutliers: clean.length, outliers: outliers.length },
        before, after, outlierListingIds: outliers.map((item) => item.listingId),
        strategies: {
            quick: roundedPln(weightedQuantile(clean, 0.25)),
            market: roundedPln(weightedQuantile(clean, 0.5)),
            ambitious: roundedPln(weightedQuantile(clean, 0.75)),
        },
        slices: {
            promoted: slice(clean, (item) => item.isPromoted), organic: slice(clean, (item) => !item.isPromoted),
            private: slice(clean, (item) => item.sellerType === 'private'), business: slice(clean, (item) => item.sellerType === 'business'),
            shipping: slice(clean, (item) => item.shippingAvailable === true),
        },
        confidence, warnings,
    };
}
