const REDACTED = '[DANE KONTAKTOWE]';

export function redactContactData(text: string): string {
    return text
        .replace(/[\w.+-]+\s*@\s*[\w-]+(?:\s*\.\s*[\w-]+)+/giu, REDACTED)
        .replace(/\+?48[\s.-]*\d(?:[\s.-]*\d){8}(?!\d)/gu, REDACTED)
        .replace(/\b\d{3}[\s.-]+\d{3}[\s.-]+\d{3}\b/gu, REDACTED);
}
