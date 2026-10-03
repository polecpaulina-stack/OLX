import type { SearchRequest } from '../types.js';

const FORBIDDEN_PATH_PREFIXES = ['/api/', '/konto/', '/mojolx/', '/d/oferta/', '/oferta/kontakt/'];

export function assertAllowedOlxSearchUrl(value: string): URL {
    let url: URL;
    try {
        url = new URL(value);
    } catch {
        throw new Error('Invalid OLX search URL');
    }

    const allowedHost = url.hostname === 'olx.pl' || url.hostname === 'www.olx.pl';
    const forbiddenPath = FORBIDDEN_PATH_PREFIXES.some((prefix) => url.pathname.startsWith(prefix));
    const searchPath = url.pathname.startsWith('/oferty') || url.pathname.includes('/q-');
    if (
        url.protocol !== 'https:' ||
        !allowedHost ||
        url.username !== '' ||
        url.password !== '' ||
        forbiddenPath ||
        !searchPath
    ) {
        throw new Error('Only a public HTTPS OLX search URL is allowed');
    }
    return url;
}

function slugify(value: string): string {
    return value
        .toLocaleLowerCase('pl-PL')
        .replaceAll('ł', 'l')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/gu, '')
        .replace(/[^a-z0-9]+/gu, '-')
        .replace(/^-+|-+$/gu, '');
}

export function buildOlxSearchUrl(request: SearchRequest): URL {
    if (request.manualUrl !== null) return assertAllowedOlxSearchUrl(request.manualUrl);
    if (!request.query) throw new Error('Automatic and manual-query requests require a query');

    const url = new URL(`/oferty/q-${slugify(request.query)}/`, 'https://www.olx.pl');
    if (request.segment === 'local') {
        if (!request.postalCode || request.radiusKm === null) {
            throw new Error('Local OLX search requires postalCode and radiusKm');
        }
        url.searchParams.set('search[postcode]', request.postalCode);
        url.searchParams.set('search[dist]', String(request.radiusKm));
    }
    if (request.shippingOnly) {
        url.searchParams.set('search[filter_enum_delivery][0]', 'delivery');
    }
    return url;
}
