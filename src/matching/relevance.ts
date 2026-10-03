import type { NormalizedListing, RelevanceResult, ValidatedInput } from '../types.js';

const STOP_WORDS = new Set(['do', 'dla', 'i', 'na', 'z', 'ze', 'w', 'oraz']);

function words(value: string): string[] {
    return value.toLocaleLowerCase('pl-PL').normalize('NFKD').replace(/\p{M}/gu, '')
        .split(/[^\p{L}\p{N}]+/u).filter((word) => word.length > 1 && !STOP_WORDS.has(word));
}

function overlap(needle: string, haystack: string): number {
    const expected = [...new Set(words(needle))];
    if (!expected.length) return 0;
    const available = new Set(words(haystack));
    return expected.filter((word) => available.has(word)).length / expected.length;
}

function numbers(value: string): string[] {
    return [...value.matchAll(/\d+(?:[,.]\d+)?/gu)].map((match) => match[0].replace(',', '.'));
}

function expectedCondition(condition: ValidatedInput['condition']): RegExp {
    const patterns: Record<ValidatedInput['condition'], RegExp> = {
        new: /\bnow[ey]\b/iu,
        'like-new': /\b(?:jak nowe|idealn)/iu,
        'very-good': /\b(?:bardzo dobry|bardzo dobra)\b/iu,
        used: /\bużywan/iu,
        damaged: /\b(?:uszkodzon|do naprawy)\b/iu,
    };
    return patterns[condition];
}

function numericConflict(listing: NormalizedListing, input: ValidatedInput): boolean {
    const expectedSizes = `${input.itemName} ${input.attributes ?? ''}`.match(/\b\d{2,3}\s*\/\s*\d{2}\s*R\s*\d{2}\b/iu);
    const actualSizes = `${listing.title} ${String(listing.attributesNormalized.tireSize ?? '')}`.match(/\b\d{2,3}\s*\/\s*\d{2}\s*R\s*\d{2}\b/iu);
    return Boolean(expectedSizes && actualSizes
        && expectedSizes[0].replace(/\s/gu, '').toUpperCase() !== actualSizes[0].replace(/\s/gu, '').toUpperCase());
}

export function scoreRelevance(listing: NormalizedListing, input: ValidatedInput): RelevanceResult {
    const text = `${listing.title} ${listing.descriptionClean ?? ''}`;
    const exclusions: string[] = [];
    if (/\b(?:pokrowiec|etui|uchwyt|części|akcesori(?:um|a))\b/iu.test(listing.title)) exclusions.push('oferta dotyczy akcesorium');
    if (/^\s*(?:kupię|poszukuję|szukam)(?=\s|$)/iu.test(listing.title)) exclusions.push('ogłoszenie kupna, nie sprzedaży');
    if (/\b(?:wraz z|zestaw z|komplet z)\b/iu.test(listing.title)) exclusions.push('nieporównywalny pakiet');
    if (numericConflict(listing, input)) exclusions.push('sprzeczne kluczowe parametry liczbowe');

    const reasons: string[] = [];
    const weighted: Array<[number, number]> = [];
    const textual = overlap(input.itemName, text);
    weighted.push([textual, 0.45]);
    if (textual >= 0.6) reasons.push('zgodna nazwa przedmiotu');

    if (input.category) {
        const categoryScore = overlap(input.category, `${listing.categoryPath.join(' ')} ${text}`);
        weighted.push([categoryScore, 0.2]);
        if (categoryScore >= 0.5) reasons.push('zgodna kategoria');
    }
    if (input.brandModel) {
        const modelScore = overlap(input.brandModel, text);
        weighted.push([modelScore, 0.2]);
        if (modelScore >= 0.99) reasons.push('zgodny model');
    }
    const expectedNumbers = numbers(`${input.itemName} ${input.attributes ?? ''}`);
    const actualNumbers = new Set(numbers(`${text} ${Object.values(listing.attributesNormalized).join(' ')}`));
    if (expectedNumbers.length && actualNumbers.size) {
        const numericScore = expectedNumbers.filter((value) => actualNumbers.has(value)).length / new Set(expectedNumbers).size;
        weighted.push([numericScore, 0.1]);
        if (numericScore >= 0.75) reasons.push('zgodne parametry liczbowe');
    }
    if (listing.condition) {
        const conditionScore = expectedCondition(input.condition).test(listing.condition) ? 1 : 0;
        weighted.push([conditionScore, 0.05]);
        if (conditionScore === 1) reasons.push('zgodny stan');
    }

    const totalWeight = weighted.reduce((sum, [, weight]) => sum + weight, 0);
    const score = Math.max(0, Math.min(1, weighted.reduce((sum, [value, weight]) => sum + value * weight, 0) / totalWeight));
    return {
        score: Number(score.toFixed(4)),
        included: exclusions.length === 0 && score >= 0.45,
        matchReasons: reasons,
        exclusionReasons: exclusions,
    };
}
