import { readFile } from 'node:fs/promises';
import { describe, expect, it, vi } from 'vitest';
import { serializeApifyValue, writeActorOutputs } from '../../src/reporting/storage.js';
import { buildReportModel } from '../../src/reporting/report-model.js';
import type { StoragePort } from '../../src/types.js';
import { analyses, collection, reportInput, reportPlan, scored } from './helpers.js';

describe('writeActorOutputs', () => {
    it('serializes JSON values for the Apify contentType contract', () => {
        expect(serializeApifyValue({ ok: true }, 'application/json')).toBe('{\n  "ok": true\n}');
    });
    it('writes one row per accepted offer and exact capped artifacts', async () => {
        const storage: StoragePort = { pushOffer: vi.fn(), setArtifact: vi.fn(), setStatus: vi.fn() };
        const model = buildReportModel(reportInput, reportPlan, collection, scored, analyses);
        const excluded = Array.from({ length: 150 }, (_, index) => ({ listingId: `X${index}`, reasons: ['inne'] }));
        await writeActorOutputs(storage, scored, model, excluded);
        expect(storage.pushOffer).toHaveBeenCalledTimes(25);
        expect(storage.setArtifact).toHaveBeenCalledWith('REPORT.md', expect.any(String), 'text/markdown; charset=utf-8');
        expect(storage.setArtifact).toHaveBeenCalledWith('REPORT.html', expect.any(String), 'text/html; charset=utf-8');
        expect(storage.setArtifact).toHaveBeenCalledWith('CHATGPT_PROMPT.md', expect.any(String), 'text/markdown; charset=utf-8');
        expect(storage.setArtifact).toHaveBeenCalledWith('RUN_SUMMARY.json', expect.any(Object), 'application/json');
        const excludedCall = vi.mocked(storage.setArtifact).mock.calls.find(([name]) => name === 'EXCLUDED.json');
        expect(excludedCall?.[1]).toHaveLength(100);
    });

    it('defines output links matching configured Apify storage schemas', async () => {
        const actor = JSON.parse(await readFile('.actor/actor.json', 'utf8'));
        const output = JSON.parse(await readFile('.actor/output_schema.json', 'utf8'));
        expect(actor.storages).toEqual({ dataset: './dataset_schema.json', keyValueStore: './key_value_store_schema.json' });
        expect(actor.output).toBe('./output_schema.json');
        expect(output.properties.dataset.template).toBe('{{links.apiDefaultDatasetUrl}}/items');
        expect(output.properties.report.template).toContain('{{links.apiDefaultKeyValueStoreUrl}}/records/REPORT.md');
    });
});
