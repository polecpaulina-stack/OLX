import { describe, expect, it } from 'vitest';
import { buildReportModel } from '../../src/reporting/report-model.js';
import { analyses, collection, reportInput, reportPlan, scored } from './helpers.js';

describe('buildReportModel', () => {
    it('composes queries, counts, analyses, assumptions, diagnostics and top 20 by score', () => {
        const model = buildReportModel(reportInput, reportPlan, collection, [...scored].reverse(), analyses);
        expect(model.queries).toEqual(reportPlan.queries);
        expect(model.collectionCounts.saved).toBe(25);
        expect(model.priceSections.local?.strategies.market).not.toBeNull();
        expect(model.priceSections.local?.confidence).toBe('high');
        expect(model.assumptions.length).toBeGreaterThan(0);
        expect(model.missingFields).toContain('współrzędne części ofert');
        expect(model.diagnostics.partial).toBe(true);
        expect(model.topOffers).toHaveLength(20);
        expect(model.topOffers[0].score).toBe(1);
        expect(model.otherComparableCount).toBe(5);
    });
});
