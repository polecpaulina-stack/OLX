import { analyzeContent } from './analysis/content.js';
import { analyzePrices } from './analysis/price.js';
import { extractCategoryAttributes } from './categories/registry.js';
import { validateInput } from './input.js';
import { scoreRelevance } from './matching/relevance.js';
import { buildReportModel } from './reporting/report-model.js';
import { writeActorOutputs } from './reporting/storage.js';
import { buildSearchPlan } from './search/query-builder.js';
import type { ReportAnalyses, RunSummary, RuntimeDependencies, ScoredListing, SearchSegment } from './types.js';

export async function runActor(deps: RuntimeDependencies): Promise<RunSummary> {
    await deps.storage.setStatus('Walidacja wejścia');
    const input = validateInput(await deps.getInput());
    await deps.storage.setStatus('Budowanie planu wyszukiwania');
    const plan = buildSearchPlan(input);
    await deps.storage.setStatus('Pobieranie ofert');
    const collection = await deps.collect(plan, input);
    await deps.storage.setStatus('Ocena i analiza ofert');

    const scored: ScoredListing[] = collection.listings.map((listing) => {
        const enriched = { ...listing, attributesNormalized: extractCategoryAttributes(listing, input) };
        const relevance = scoreRelevance(enriched, input);
        if (!input.includePromoted && enriched.isPromoted) {
            return { ...enriched, ...relevance, included: false, exclusionReasons: [...relevance.exclusionReasons, 'oferta promowana wyłączona ustawieniem'] };
        }
        return { ...enriched, ...relevance };
    });
    const segments: SearchSegment[] = input.deliveryMode === 'both' ? ['local', 'shipping'] : [input.deliveryMode];
    const prices = Object.fromEntries(segments.map((segment) => [segment, analyzePrices(scored, segment)])) as ReportAnalyses['prices'];
    const analyses: ReportAnalyses = { prices, content: analyzeContent(scored) };
    const model = buildReportModel(input, plan, collection, scored, analyses);
    const excluded = [
        ...scored.filter((item) => !item.included).map((item) => ({ listingId: item.listingId, url: item.url, reasons: item.exclusionReasons })),
        ...collection.excludedFailures,
    ];

    await deps.storage.setStatus('Zapisywanie wyników');
    await writeActorOutputs(deps.storage, scored, model, excluded);
    if (collection.selectorDrift.terminal) throw new Error('Terminalna zmiana selektorów OLX; zapisano częściowe artefakty diagnostyczne.');

    const comparableOffers = scored.filter((item) => item.included).length;
    await deps.storage.setStatus(`Zakończono: ${comparableOffers} ofert porównywalnych`);
    return {
        itemName: input.itemName,
        comparableOffers,
        collectedOffers: collection.listings.length,
        partial: collection.partial,
        confidence: Object.fromEntries(Object.entries(prices).map(([segment, analysis]) => [segment, analysis?.confidence])),
    };
}
