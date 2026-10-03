import type { CollectionResult, ReportAnalyses, ReportModel, ScoredListing, SearchPlan, ValidatedInput } from '../types.js';
import { redactContactData } from '../scraping/redact.js';

export function buildReportModel(
    input: ValidatedInput,
    plan: SearchPlan,
    collection: CollectionResult,
    scored: ScoredListing[],
    analyses: ReportAnalyses,
): ReportModel {
    const comparable = scored.filter((item) => item.included).sort((a, b) => b.score - a.score);
    const missingFields: string[] = [];
    if (scored.some((item) => item.latitude === null || item.longitude === null)) missingFields.push('współrzędne części ofert');
    if (scored.some((item) => item.condition === null)) missingFields.push('stan części ofert');
    if (scored.some((item) => item.photoCount === null)) missingFields.push('liczba zdjęć części ofert');

    return {
        generatedAt: new Date().toISOString(), input, queries: [...plan.queries], collectionCounts: collection.counts,
        priceSections: analyses.prices, content: analyses.content,
        assumptions: [
            'Ceny są cenami ofertowymi, a nie potwierdzonymi cenami transakcyjnymi.',
            'Podobieństwo ofert wyliczono deterministycznie z dostępnych danych OLX.',
            input.deliveryMode === 'local' ? `Odbiór osobisty analizowano dla kodu ${input.postalCode} i promienia ${input.radiusKm} km.` : 'Zakres dostawy wynika z ustawień wejściowych.',
        ],
        missingFields,
        diagnostics: { partial: collection.partial, warnings: collection.warnings, selectorDrift: collection.selectorDrift, failures: collection.excludedFailures },
        topOffers: comparable.slice(0, 20).map((item) => ({
            listingId: item.listingId, url: item.url, title: redactContactData(item.title), price: item.price,
            locationName: item.locationName, distanceKm: item.distanceKm, score: item.score,
            matchReasons: item.matchReasons, attributes: item.attributesNormalized,
            descriptionSummary: item.descriptionClean ? redactContactData(item.descriptionClean).slice(0, 240) : null,
        })),
        otherComparableCount: Math.max(0, comparable.length - 20),
    };
}
