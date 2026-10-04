import { describe, expect, it } from 'vitest';

import { assertAllowedOlxSearchUrl, buildOlxSearchUrl } from '../../src/search/url-builder.js';
import type { SearchRequest } from '../../src/types.js';

describe('assertAllowedOlxSearchUrl', () => {
    it.each([
        'https://www.olx.pl/oferty/q-rower-dzieciecy/',
        'https://olx.pl/dolnoslaskie/q-rower-dzieciecy/?search%5Bdist%5D=50',
    ])('accepts a public OLX search URL: %s', (value) => {
        expect(assertAllowedOlxSearchUrl(value).hostname).toMatch(/^(www\.)?olx\.pl$/u);
    });

    it.each([
        'http://www.olx.pl/oferty/q-rower/',
        'https://user:pass@www.olx.pl/oferty/q-rower/',
        'https://www.olx.pl.evil.example/oferty/q-rower/',
        'https://evil.example/oferty/q-rower/',
        'https://www.olx.pl/d/oferta/rower-CID123-ID456.html',
        'https://www.olx.pl/api/v1/offers/',
        'https://www.olx.pl/konto/',
    ])('rejects an unsafe or non-search URL: %s', (value) => {
        expect(() => assertAllowedOlxSearchUrl(value)).toThrow(/OLX search URL/i);
    });
});

describe('buildOlxSearchUrl', () => {
    const base: SearchRequest = {
        source: 'automatic',
        segment: 'local',
        query: 'rower dziecięcy 16',
        manualUrl: null,
        postalCode: '55-002',
        locationName: 'Kamieniec Wrocławski',
        radiusKm: 50,
        shippingOnly: false,
    };

    it('encodes local place path and radius semantics', () => {
        const url = buildOlxSearchUrl(base);

        expect(url.origin).toBe('https://www.olx.pl');
        expect(url.pathname).toContain('/kamieniec-wroclawski/q-rower-dzieciecy-16/');
        expect(url.searchParams.has('search[postcode]')).toBe(false);
        expect(url.searchParams.get('search[dist]')).toBe('50');
        expect(url.searchParams.has('search[filter_enum_delivery][0]')).toBe(false);
    });

    it('builds a nationwide shipping-only search', () => {
        const url = buildOlxSearchUrl({
            ...base,
            segment: 'shipping',
            postalCode: null,
            locationName: null,
            radiusKm: null,
            shippingOnly: true,
        });

        expect(url.searchParams.has('search[postcode]')).toBe(false);
        expect(url.searchParams.has('search[dist]')).toBe(false);
        expect(url.searchParams.get('courier')).toBe('1');
    });

    it('returns a validated manual search URL without rewriting it', () => {
        const value = 'https://www.olx.pl/oferty/q-buty-dzieciece/?search%5Bdist%5D=50';
        const url = buildOlxSearchUrl({ ...base, source: 'manual-url', query: null, manualUrl: value });

        expect(url.href).toBe(value);
    });
});
