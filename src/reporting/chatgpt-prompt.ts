import type { ReportModel } from '../types.js';

const json = (value: unknown): string => JSON.stringify(value, null, 2);

export function renderChatGptPrompt(model: ReportModel): string {
    const offers = model.topOffers.map((offer, index) => `OFERTA ${index + 1}:\n${json(offer)}`).join('\n\n');
    return `Pomóż mi przygotować skuteczną ofertę sprzedaży na OLX dla Polski. Napisz oryginalny tytuł i opis dopasowany do mojego przedmiotu. Nie kopiuj tekstów konkurencji ani ich charakterystycznych sformułowań. Wyjaśnij rekomendowaną cenę i podaj checklistę zdjęć oraz danych do uzupełnienia.\n\nMÓJ PRZEDMIOT:\n${json(model.input)}\n\nZAKRES I OGRANICZENIA:\n${json({ queries: model.queries, assumptions: model.assumptions, missingFields: model.missingFields, diagnostics: model.diagnostics })}\n\nANALIZA CEN:\n${json(model.priceSections)}\n\nWZORCE ZBIORCZE (bez kopiowania opisów):\n${json(model.content)}\n\nNAJBARDZIEJ PODOBNE OFERTY (maks. 20):\n${offers}\n\nPozostałe porównywalne oferty: ${model.otherComparableCount}. Ich dane są uwzględnione wyłącznie w agregatach powyżej.`;
}
