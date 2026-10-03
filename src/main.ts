import log from '@apify/log';
import { Actor } from 'apify';
import { runActor } from './run-actor.js';
import { serializeApifyValue } from './reporting/storage.js';
import { collectListings } from './scraping/collector.js';
import { createCrawleeFetchers } from './scraping/crawlee-fetchers.js';
import type { StoragePort } from './types.js';

await Actor.main(async () => {
    const proxyConfiguration = await Actor.createProxyConfiguration();
    const fetchers = createCrawleeFetchers({ proxyConfiguration: proxyConfiguration ?? undefined });
    const storage: StoragePort = {
        pushOffer: async (record) => Actor.pushData(record),
        setArtifact: async (name, value, contentType) => Actor.setValue(name, serializeApifyValue(value, contentType), { contentType }),
        setStatus: async (message) => { await Actor.setStatusMessage(message); log.info(message); },
    };
    const summary = await runActor({
        getInput: async () => Actor.getInput(),
        collect: async (plan, input) => collectListings(plan, {
            ...fetchers,
            saveCheckpoint: async (listing) => Actor.setValue(`CHECKPOINT-${listing.listingId}`, JSON.stringify(listing), { contentType: 'application/json' }),
            now: () => new Date(),
            sleep: async (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)),
        }, input.maxResults),
        storage,
        now: () => new Date(),
    });
    log.info('Actor completed', summary);
});
