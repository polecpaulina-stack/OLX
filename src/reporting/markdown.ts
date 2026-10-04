import type { PriceAnalysis, ReportModel } from '../types.js';

const money = (value: number | null): string => value === null ? 'brak' : `${value.toLocaleString('pl-PL')} zł`;

function priceSection(name: string, analysis: PriceAnalysis): string {
    return `## Ceny — ${name}\n\nPewność: **${analysis.confidence}**, próba po odrzuceniu wartości skrajnych: ${analysis.counts.afterOutliers}.\n\n| Strategia | Cena |\n|---|---:|\n| Szybka sprzedaż | ${money(analysis.strategies.quick)} |\n| Cena rynkowa | ${money(analysis.strategies.market)} |\n| Cena ambitna | ${money(analysis.strategies.ambitious)} |\n\n${analysis.warnings.map((warning) => `- ${warning}`).join('\n')}`;
}

export function renderMarkdown(model: ReportModel): string {
    const prices = [model.priceSections.local && priceSection('odbiór osobisty', model.priceSections.local), model.priceSections.shipping && priceSection('wysyłka', model.priceSections.shipping)].filter(Boolean).join('\n\n');
    const offers = model.topOffers.map((offer, index) => `| ${index + 1} | [${offer.title.replaceAll('|', '\\|')}](${offer.url}) | ${money(offer.price)} | ${offer.locationName ?? 'brak'} | ${(offer.score * 100).toFixed(0)}% |`).join('\n');
    return `# Analiza konkurencji OLX\n\nPrzedmiot: **${model.input.itemName}**\n\nZapytania: ${model.queries.join(', ')}\n\n${prices}\n\n## Wzorce ofert\n\nNajczęstsze frazy: ${model.content.commonPhrases.slice(0, 8).map((item) => `${item.phrase} (${item.count})`).join(', ') || 'brak'}.\n\n## Najbardziej podobne oferty\n\n| # | Oferta | Cena | Lokalizacja | Zgodność |\n|---:|---|---:|---|---:|\n${offers}\n\nPozostałe porównywalne oferty: ${model.otherComparableCount}.\n\n## Założenia i ograniczenia\n\n${model.assumptions.map((item) => `- ${item}`).join('\n')}\n${model.missingFields.map((item) => `- Brakujące dane: ${item}.`).join('\n')}\n${model.diagnostics.warnings.map((item) => `- Ostrzeżenie: ${item}`).join('\n')}`;
}
