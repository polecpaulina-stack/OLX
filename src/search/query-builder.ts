import type { SearchPlan, SearchRequest, SearchSegment, ValidatedInput } from '../types.js';

const CATEGORY_SYNONYMS: Readonly<Record<string, readonly string[]>> = {
    opony: ['opony', 'ogumienie'],
    rower: ['rower dziecięcy', 'rowerek dziecięcy'],
    buty: ['buty dziecięce', 'obuwie dziecięce'],
    okno: ['skrzydło okienne dachowe', 'okno dachowe'],
};

const normalizeWhitespace = (value: string): string => value.trim().replace(/\s+/gu, ' ');

function unique(values: readonly string[]): string[] {
    const seen = new Set<string>();
    const result: string[] = [];
    for (const raw of values) {
        const value = normalizeWhitespace(raw);
        if (!value) continue;
        const key = value.toLocaleLowerCase('pl-PL');
        if (seen.has(key)) continue;
        seen.add(key);
        result.push(value);
    }
    return result;
}

function numericAttributes(value: string | null): string[] {
    if (!value) return [];
    return unique(value.match(/\b\d+(?:[/.x-]\d+)*(?:\s*[rR]\d+)?\b/gu) ?? []);
}

function categorySynonyms(input: ValidatedInput): string[] {
    const text = `${input.category ?? ''} ${input.itemName}`.toLocaleLowerCase('pl-PL');
    for (const [needle, synonyms] of Object.entries(CATEGORY_SYNONYMS)) {
        if (text.includes(needle)) return [...synonyms];
    }
    return [];
}

function automaticQueries(input: ValidatedInput): string[] {
    const numbers = numericAttributes(input.attributes);
    const candidates = [
        [input.itemName, input.brandModel, ...numbers].filter(Boolean).join(' '),
        [input.brandModel, input.itemName].filter(Boolean).join(' '),
        [input.itemName, ...numbers].filter(Boolean).join(' '),
        input.itemName,
        ...categorySynonyms(input).map((synonym) =>
            [synonym, input.brandModel, numbers[0]].filter(Boolean).join(' '),
        ),
    ];
    return unique(candidates).slice(0, 5);
}

function segmentsFor(input: ValidatedInput): SearchSegment[] {
    if (input.deliveryMode === 'both') return ['local', 'shipping'];
    return [input.deliveryMode];
}

function requestForQuery(
    input: ValidatedInput,
    segment: SearchSegment,
    query: string,
    source: 'automatic' | 'manual-query',
): SearchRequest {
    return {
        source,
        segment,
        query,
        manualUrl: null,
        postalCode: segment === 'local' ? input.postalCode : null,
        locationName: segment === 'local' ? input.locationName : null,
        radiusKm: segment === 'local' ? input.radiusKm : null,
        shippingOnly: segment === 'shipping',
    };
}

export function buildSearchPlan(input: ValidatedInput): SearchPlan {
    const generatedQueries = input.queryMode === 'manual-only' ? [] : automaticQueries(input);
    const manualQueries = unique(input.manualQueries);
    const manualUrls = unique(input.manualSearchUrls);
    if (input.queryMode === 'manual-only' && manualQueries.length === 0 && manualUrls.length === 0) {
        throw new Error('manual-only requires at least one manual query or OLX search URL');
    }

    const queries = input.queryMode === 'manual-only' ? manualQueries : unique([...generatedQueries, ...manualQueries]);
    const automaticKeys = new Set(generatedQueries.map((value) => value.toLocaleLowerCase('pl-PL')));
    const requests: SearchRequest[] = [];

    for (const segment of segmentsFor(input)) {
        for (const query of queries) {
            const source = automaticKeys.has(query.toLocaleLowerCase('pl-PL')) ? 'automatic' : 'manual-query';
            requests.push(requestForQuery(input, segment, query, source));
        }
        for (const manualUrl of manualUrls) {
            requests.push({
                source: 'manual-url',
                segment,
                query: null,
                manualUrl,
                postalCode: segment === 'local' ? input.postalCode : null,
                locationName: segment === 'local' ? input.locationName : null,
                radiusKm: segment === 'local' ? input.radiusKm : null,
                shippingOnly: segment === 'shipping',
            });
        }
    }

    return { generatedQueries, queries, requests };
}
