import { gotScraping, PlaywrightCrawler, type ProxyConfiguration } from 'crawlee';
import type { FetchRequest, FetchResult, PageFetcher } from '../types.js';
import { AccessBlockedError, RenderingRequiredError } from './collector.js';

const REQUEST_TIMEOUT_MS = 30_000;

export interface CrawleeFetcherOptions { proxyConfiguration?: ProxyConfiguration; maxConcurrency?: number }

class HttpFetcher implements PageFetcher {
    public async fetchHtml(request: FetchRequest): Promise<FetchResult> {
        const response = await gotScraping({ url: request.url, timeout: { request: REQUEST_TIMEOUT_MS }, retry: { limit: 0 } });
        if (response.statusCode === 403 || response.statusCode === 429) throw new AccessBlockedError(`HTTP ${response.statusCode}`);
        const html = response.body;
        if (!html || /enable javascript|włącz javascript/iu.test(html)) throw new RenderingRequiredError('OLX response requires browser rendering');
        return { html, statusCode: response.statusCode, finalUrl: response.url };
    }
}

class BrowserFetcher implements PageFetcher {
    public constructor(private readonly options: CrawleeFetcherOptions) {}
    public async fetchHtml(request: FetchRequest): Promise<FetchResult> {
        let result: FetchResult | null = null;
        const crawler = new PlaywrightCrawler({
            proxyConfiguration: this.options.proxyConfiguration,
            maxConcurrency: this.options.maxConcurrency ?? 2,
            requestHandlerTimeoutSecs: REQUEST_TIMEOUT_MS / 1000,
            maxRequestRetries: 0,
            async requestHandler({ page, request: crawleeRequest, response }) {
                const statusCode = response?.status() ?? 200;
                result = { html: await page.content(), statusCode, finalUrl: crawleeRequest.loadedUrl ?? crawleeRequest.url };
            },
        });
        await crawler.run([request.url.href]);
        if (!result) throw new Error('Browser fetch completed without a page result');
        return result;
    }
}

export function createCrawleeFetchers(options: CrawleeFetcherOptions = {}): { httpFetcher: PageFetcher; browserFetcher: PageFetcher } {
    return { httpFetcher: new HttpFetcher(), browserFetcher: new BrowserFetcher(options) };
}
