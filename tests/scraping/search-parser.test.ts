import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { parseSearchResults } from '../../src/scraping/search-parser.js';
import type { SearchRequest } from '../../src/types.js';

const html = readFileSync(fileURLToPath(new URL('../fixtures/search/basic.html', import.meta.url)), 'utf8');
const source: SearchRequest = {
    source: 'automatic', segment: 'local', query: 'opony zimowe', manualUrl: null,
    postalCode: '55-002', locationName: 'Kamieniec Wrocławski', radiusKm: 50, shippingOnly: false,
};

describe('parseSearchResults', () => {
    it('extracts canonical candidate identity, title and promotion status', () => {
        const results = parseSearchResults(html, source);

        expect(results).toEqual([
            expect.objectContaining({
                listingId: 'ABC123',
                url: 'https://www.olx.pl/d/oferta/opony-zimowe-michelin-CID5-IDABC123.html',
                title: 'Opony zimowe Michelin Alpin 6',
                isPromoted: true,
                source,
            }),
            expect.objectContaining({ listingId: 'DEF456', title: 'Opony zimowe 205/55 R16', isPromoted: false }),
        ]);
    });

    it('deduplicates the same listing URL found more than once', () => {
        expect(parseSearchResults(html.replace('</main>', `${html.match(/<article>[\s\S]*?<\/article>/u)?.[0]}</main>`), source)).toHaveLength(2);
    });
});
