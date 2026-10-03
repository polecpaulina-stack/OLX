import { describe, expect, it } from 'vitest';

import { redactContactData } from '../../src/scraping/redact.js';

describe('redactContactData', () => {
    it('redacts Polish phone numbers and email addresses', () => {
        expect(redactContactData('Tel. +48 600-700-800 lub 600 700 800, mail test @ example.com')).toBe(
            'Tel. [DANE KONTAKTOWE] lub [DANE KONTAKTOWE], mail [DANE KONTAKTOWE]',
        );
    });

    it('preserves an ordinary numeric product code without phone context', () => {
        expect(redactContactData('Kod produktu 123456789, rozmiar 205/55 R16')).toBe(
            'Kod produktu 123456789, rozmiar 205/55 R16',
        );
    });
});
