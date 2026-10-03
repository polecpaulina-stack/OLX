import { describe, expect, it } from 'vitest';
import { renderChatGptPrompt } from '../../src/reporting/chatgpt-prompt.js';
import { buildReportModel } from '../../src/reporting/report-model.js';
import { analyses, collection, reportInput, reportPlan, scored } from './helpers.js';

describe('renderChatGptPrompt', () => {
    it('includes at most 20 summaries, aggregates for the rest and originality instruction', () => {
        const value = renderChatGptPrompt(buildReportModel(reportInput, reportPlan, collection, scored, analyses));
        expect((value.match(/^OFERTA \d+:/gmu) ?? [])).toHaveLength(20);
        expect(value).toContain('Pozostałe porównywalne oferty: 5');
        expect(value).toMatch(/oryginaln/iu);
        expect(value).toMatch(/nie kopiuj/iu);
        expect(value).not.toContain('test@example.com');
        expect(value).not.toContain('600 700 800');
    });
});
