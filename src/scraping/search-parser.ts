import { load } from 'cheerio';

import type { SearchCandidate, SearchRequest } from '../types.js';

const LISTING_ID = /-ID([A-Za-z0-9]+)\.html(?:$|[?#])/u;

export class ParserDriftError extends Error {
    public constructor(message: string) {
        super(message);
        this.name = 'ParserDriftError';
    }
}

export function parseSearchResults(html: string, source: SearchRequest): SearchCandidate[] {
    const $ = load(html);
    const candidates = new Map<string, SearchCandidate>();

    $('a[href*="/d/oferta/"]').each((_index, element) => {
        const anchor = $(element);
        const href = anchor.attr('href');
        if (!href) return;
        const url = new URL(href, 'https://www.olx.pl').href;
        const match = url.match(LISTING_ID);
        if (!match) return;
        const title = (anchor.attr('aria-label') ?? anchor.find('h4,h5,h6').first().text() ?? anchor.text())
            .trim()
            .replace(/\s+/gu, ' ');
        if (!title) return;
        const containerText = anchor.closest('article, [data-cy="l-card"]').text();
        candidates.set(match[1], {
            listingId: match[1],
            url,
            title,
            isPromoted: /wyróżnione|promowane/iu.test(containerText),
            source,
        });
    });

    if (candidates.size === 0 && $('[data-testid="listing-grid"]').length > 0) {
        throw new ParserDriftError('OLX search page contained a listing grid but no listing identities were parsed');
    }
    return [...candidates.values()];
}
