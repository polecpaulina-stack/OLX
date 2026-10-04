import { readFile } from 'node:fs/promises';
import log from '@apify/log';
import { validateInput } from '../src/input.js';
import { buildSearchPlan } from '../src/search/query-builder.js';
import { collectListings } from '../src/scraping/collector.js';
import { createCrawleeFetchers } from '../src/scraping/crawlee-fetchers.js';

if (process.env.LIVE_OLX_SMOKE !== '1') {
    log.info('Live smoke pominięty. Ustaw LIVE_OLX_SMOKE=1, aby zezwolić na połączenie z OLX.');
} else {
    const flag = process.argv.indexOf('--input');
    if (flag < 0 || !process.argv[flag + 1]) throw new Error('Użycie: npm run smoke:live -- --input <ścieżka-do-json>');
    const input = validateInput(JSON.parse(await readFile(process.argv[flag + 1], 'utf8')));
    const plan = buildSearchPlan({ ...input, maxResults: 3 });
    const fetchers = createCrawleeFetchers({ maxConcurrency: 1 });
    const result = await collectListings(plan, {
        ...fetchers,
        saveCheckpoint: () => undefined,
        now: () => new Date(),
        sleep: async (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)),
    }, 3, { maxFetchAttempts: 2, retryDelaysMs: [500], maxSearchPagesPerRequest: 1 });
    log.info('Live smoke zakończony', {
        saved: result.counts.saved,
        failures: result.counts.failed,
        partial: result.partial,
        selectorDrift: result.selectorDrift,
    });
    if (result.selectorDrift.terminal) process.exitCode = 2;
}
