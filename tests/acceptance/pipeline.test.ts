import { readFile } from 'node:fs/promises';
import { describe, expect, it, vi } from 'vitest';
import { validateInput } from '../../src/input.js';
import { runActor } from '../../src/run-actor.js';
import { parseListing } from '../../src/scraping/listing-parser.js';
import { normalizeListing } from '../../src/scraping/normalize.js';
import type { CollectionResult, StoragePort } from '../../src/types.js';

const cases = [
    ['roof-window-sash', { dimensions: '78 x 118 cm', brand: 'Velux', model: 'GGL MK06', glazing: 'dwuszybowe' }],
    ['winter-tires', { tireSize: '205/55 R16', dotYear: 2022, treadDepthMm: 7, quantity: 4, runFlat: true }],
    ['kids-bike', { wheelSizeInches: 16, frameSizeInches: 10, gears: 6, brakes: 'V-brake' }],
    ['kids-shoes', { shoeSize: 28, insoleLengthCm: 18, season: 'zimowe', material: 'skóra naturalna' }],
] as const;

describe('offline acceptance pipeline', () => {
    it.each(cases)('processes %s from input through all report artifacts', async (name, expectedAttributes) => {
        const rawInput = JSON.parse(await readFile(`tests/fixtures/inputs/${name}.json`, 'utf8'));
        const input = validateInput(rawInput);
        const html = await readFile(`tests/fixtures/listings/categories/${name}.html`, 'utf8');
        const raw = parseListing(html, new URL(`https://www.olx.pl/d/oferta/test-CID5-ID${name}.html`));
        const normalized = normalizeListing(raw, { segment: input.deliveryMode === 'shipping' ? 'shipping' : 'local', matchedQueries: [input.itemName], originCoordinates: null, locationFilterMatched: true });
        const collection: CollectionResult = { listings: [normalized], excludedFailures: [], counts: { searchPages: 1, candidates: 1, detailAttempts: 1, saved: 1, failed: 0 }, warnings: [], partial: false, selectorDrift: { attempted: 1, failures: 0, ratio: 0, terminal: false } };
        const rows: unknown[] = [];
        const artifacts = new Map<string, unknown>();
        const storage: StoragePort = { pushOffer: async (record) => { rows.push(record); }, setArtifact: async (key, value) => { artifacts.set(key, value); }, setStatus: vi.fn() };
        const result = await runActor({ getInput: async () => rawInput, collect: async () => collection, storage, now: () => new Date('2026-10-03T12:00:00Z') });
        expect(result.comparableOffers).toBe(1);
        expect(rows[0]).toMatchObject({ attributesNormalized: expectedAttributes });
        expect(artifacts.get('RUN_SUMMARY.json')).toMatchObject({ priceSections: expect.any(Object) });
        expect([...artifacts.keys()].sort()).toEqual(['CHATGPT_PROMPT.md', 'EXCLUDED.json', 'REPORT.html', 'REPORT.md', 'RUN_SUMMARY.json'].sort());
        const rendered = JSON.stringify([...artifacts.values()]);
        expect(rendered).not.toMatch(/test@example\.com|600 700 800/u);
        expect(rendered).toContain('low');
    });
});
