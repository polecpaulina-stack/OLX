import { analyzeContent } from '../../src/analysis/content.js';
import { analyzePrices } from '../../src/analysis/price.js';
import type { CollectionResult, ScoredListing, SearchPlan } from '../../src/types.js';
import { input, listing } from '../matching/helpers.js';

export const reportInput = input();
export const reportPlan: SearchPlan = { generatedQueries: ['opony zimowe'], queries: ['opony zimowe', 'Michelin'], requests: [] };
export const scored: ScoredListing[] = Array.from({ length: 25 }, (_, index) => ({
    ...listing({ listingId: `ID${index}`, title: index === 0 ? '<script>alert(1)</script> Opony' : `Opony ${index}`, price: 400 + index, descriptionClean: `Kontakt test@example.com +48 600 700 800 oferta ${index}` }),
    score: 1 - index / 100, included: true, matchReasons: ['zgodna nazwa przedmiotu'], exclusionReasons: [],
}));
export const collection: CollectionResult = {
    listings: scored, excludedFailures: [{ url: 'https://www.olx.pl/x', stage: 'detail', reason: 'timeout' }],
    counts: { searchPages: 2, candidates: 25, detailAttempts: 25, saved: 25, failed: 1 }, warnings: ['częściowy wynik'], partial: true,
    selectorDrift: { attempted: 25, failures: 0, ratio: 0, terminal: false },
};
export const analyses = { prices: { local: analyzePrices(scored, 'local') }, content: analyzeContent(scored) };
