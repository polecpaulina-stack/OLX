import { load } from 'cheerio';

import type { RawListing } from '../types.js';
import { ParserDriftError } from './search-parser.js';

const LISTING_ID = /-ID([A-Za-z0-9]+)\.html(?:$|[?#])/u;

type JsonObject = Record<string, unknown>;

function object(value: unknown): JsonObject | null {
    return typeof value === 'object' && value !== null && !Array.isArray(value) ? (value as JsonObject) : null;
}

function productJsonLd(html: string): JsonObject | null {
    const $ = load(html);
    for (const element of $('script[type="application/ld+json"]').toArray()) {
        try {
            const parsed: unknown = JSON.parse($(element).text());
            const values = Array.isArray(parsed) ? parsed : [parsed];
            const product = values.map(object).find((value) => value?.['@type'] === 'Product');
            if (product) return product;
        } catch {
            // Ignore malformed third-party structured data and continue with semantic HTML.
        }
    }
    return null;
}

function stringValue(value: unknown): string | null {
    return typeof value === 'string' && value.trim() ? value.trim().replace(/\s+/gu, ' ') : null;
}

function numberValue(value: unknown): number | null {
    const number = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(number) ? number : null;
}

export function parseListing(html: string, url: URL): RawListing {
    const $ = load(html);
    const structured = productJsonLd(html);
    const canonicalUrl = new URL($('link[rel="canonical"]').attr('href') ?? url.href, url).href;
    const listingId = canonicalUrl.match(LISTING_ID)?.[1] ?? url.href.match(LISTING_ID)?.[1];
    const title = stringValue(structured?.name) ?? stringValue($('h1').first().text());
    if (!listingId || !title) throw new ParserDriftError('OLX listing identity or title could not be parsed');

    const offers = object(structured?.offers);
    const place = object(structured?.availableAtOrFrom);
    const address = object(place?.address);
    const geo = object(place?.geo);
    const attributesRaw: Record<string, string> = {};
    $('[data-testid="parameter"]').each((_index, element) => {
        const key = stringValue($(element).find('span').first().text());
        const value = stringValue($(element).find('strong').first().text());
        if (key && value) attributesRaw[key] = value;
    });
    const bodyText = $('body').text();
    const sellerText = attributesRaw['Typ sprzedawcy'] ?? '';
    const images = structured?.image;
    const priceElement = $('[data-testid="ad-price-container"]').first().clone();
    priceElement.find('style, script, noscript').remove();

    return {
        listingId,
        url: url.href,
        canonicalUrl,
        title,
        priceText: stringValue(priceElement.text()) ?? stringValue(offers?.price),
        currency: stringValue(offers?.priceCurrency),
        categoryPath: [],
        condition: attributesRaw.Stan ?? null,
        attributesRaw,
        locationName: stringValue(address?.addressLocality),
        voivodeship: stringValue(address?.addressRegion),
        latitude: numberValue(geo?.latitude),
        longitude: numberValue(geo?.longitude),
        shippingAvailable: /Przesyłka OLX/iu.test(bodyText),
        sellerType: /firma/iu.test(sellerText) ? 'business' : /prywatna/iu.test(sellerText) ? 'private' : null,
        publishedAt: stringValue($('time[datetime]').first().attr('datetime')),
        refreshedAt: null,
        description: stringValue(structured?.description) ?? stringValue($('[data-cy="ad_description"]').first().text()),
        photoCount: Array.isArray(images) ? images.length : stringValue(images) ? 1 : null,
        isPromoted: /wyróżnione|promowane/iu.test(bodyText),
    };
}
