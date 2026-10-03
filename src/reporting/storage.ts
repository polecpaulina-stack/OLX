import type { ReportModel, ScoredListing, StoragePort } from '../types.js';
import { renderChatGptPrompt } from './chatgpt-prompt.js';
import { renderHtml } from './html.js';
import { renderMarkdown } from './markdown.js';

const MAX_EXCLUDED_RECORDS = 100;

export function serializeApifyValue(value: unknown, contentType: string): string | Buffer {
    if (Buffer.isBuffer(value)) return value;
    if (typeof value === 'string') return value;
    if (contentType === 'application/json') return JSON.stringify(value, null, 2);
    return String(value);
}

export async function writeActorOutputs(
    storage: StoragePort,
    offers: ScoredListing[],
    model: ReportModel,
    excluded: unknown[],
): Promise<void> {
    for (const offer of offers.filter((item) => item.included)) await storage.pushOffer(offer);
    await storage.setArtifact('REPORT.md', renderMarkdown(model), 'text/markdown; charset=utf-8');
    await storage.setArtifact('REPORT.html', renderHtml(model), 'text/html; charset=utf-8');
    await storage.setArtifact('CHATGPT_PROMPT.md', renderChatGptPrompt(model), 'text/markdown; charset=utf-8');
    await storage.setArtifact('RUN_SUMMARY.json', model, 'application/json');
    await storage.setArtifact('EXCLUDED.json', excluded.slice(0, MAX_EXCLUDED_RECORDS), 'application/json');
}
