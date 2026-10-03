import { describe, expect, it } from 'vitest';
import { renderHtml } from '../../src/reporting/html.js';
import { renderMarkdown } from '../../src/reporting/markdown.js';
import { buildReportModel } from '../../src/reporting/report-model.js';
import { analyses, collection, reportInput, reportPlan, scored } from './helpers.js';

describe('report renderers', () => {
    const model = buildReportModel(reportInput, reportPlan, collection, scored, analyses);
    it('renders markdown headings and pricing table', () => {
        const value = renderMarkdown(model);
        expect(value).toContain('# Analiza konkurencji OLX');
        expect(value).toContain('| Strategia | Cena');
        expect(value).not.toContain('test@example.com');
        expect(value).not.toContain('600 700 800');
    });
    it('renders standalone escaped HTML without executable competitor markup', () => {
        const value = renderHtml(model);
        expect(value).toContain('<!doctype html>');
        expect(value).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
        expect(value).not.toContain('<script>alert(1)</script>');
        expect(value).toContain('<meta charset="utf-8">');
    });
});
