import { describe, expect, it } from 'vitest';
import { scoreRelevance } from '../../src/matching/relevance.js';
import { input, listing } from './helpers.js';

describe('scoreRelevance', () => {
    it('rewards exact model, category and numeric parameter matches with explanations', () => {
        const result = scoreRelevance(listing({ title: 'Opony Michelin Pilot Alpin 205/55 R16' }), input());
        expect(result.included).toBe(true);
        expect(result.score).toBeGreaterThanOrEqual(0.75);
        expect(result.matchReasons).toEqual(expect.arrayContaining(['zgodna kategoria', 'zgodny model', 'zgodne parametry liczbowe']));
        expect(result.exclusionReasons).toEqual([]);
    });

    it('excludes explicit numeric conflicts', () => {
        const result = scoreRelevance(listing({ title: 'Opony zimowe 225/45 R17', attributesNormalized: { tireSize: '225/45 R17', quantity: 4 } }), input());
        expect(result.included).toBe(false);
        expect(result.exclusionReasons).toContain('sprzeczne kluczowe parametry liczbowe');
    });

    it.each([
        ['accessory', 'Pokrowiec na opony 205/55 R16', 'oferta dotyczy akcesorium'],
        ['wanted', 'Kupię opony zimowe 205/55 R16', 'ogłoszenie kupna, nie sprzedaży'],
        ['bundle', 'Opony 205/55 R16 wraz z felgami i czujnikami', 'nieporównywalny pakiet'],
    ])('excludes %s listings', (_kind, title, reason) => {
        const result = scoreRelevance(listing({ title }), input());
        expect(result.included).toBe(false);
        expect(result.exclusionReasons).toContain(reason);
    });

    it('notes condition mismatch without allowing the score outside 0–1', () => {
        const result = scoreRelevance(listing({ condition: 'nowe' }), input({ condition: 'used' }));
        expect(result.matchReasons).not.toContain('zgodny stan');
        expect(result.included).toBe(false);
        expect(result.exclusionReasons).toContain('niezgodny stan produktu');
        expect(result.score).toBeGreaterThanOrEqual(0);
        expect(result.score).toBeLessThanOrEqual(1);
    });

    it('supports generic categories using textual similarity', () => {
        const result = scoreRelevance(listing({ title: 'Lampa stojąca drewniana do salonu', categoryPath: ['Dom', 'Oświetlenie'], attributesNormalized: {} }), input({ itemName: 'lampa stojąca drewniana', category: null, brandModel: null, attributes: null }));
        expect(result.included).toBe(true);
        expect(result.score).toBeGreaterThan(0.5);
    });
});
