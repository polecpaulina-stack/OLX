import { z } from 'zod';

import type { ValidatedInput } from './types.js';

const normalizeWhitespace = (value: string): string => value.trim().replace(/\s+/gu, ' ');

const requiredText = z.string().transform(normalizeWhitespace).pipe(z.string().min(2));

const optionalText = z
    .string()
    .optional()
    .transform((value) => {
        if (value === undefined) return null;
        const normalized = normalizeWhitespace(value);
        return normalized.length > 0 ? normalized : null;
    });

const normalizedStringList = z
    .array(z.string())
    .optional()
    .transform((values) =>
        (values ?? [])
            .map(normalizeWhitespace)
            .filter((value) => value.length > 0),
    );

const inputSchema = z.object({
    itemName: requiredText,
    category: optionalText,
    brandModel: optionalText,
    condition: z.enum(['new', 'like-new', 'very-good', 'used', 'damaged']),
    attributes: optionalText,
    defects: optionalText,
    expectedPrice: z.number().min(0).optional().transform((value) => value ?? null),
    deliveryMode: z.enum(['local', 'shipping', 'both']),
    postalCode: z.string().regex(/^\d{2}-\d{3}$/u).default('55-002'),
    radiusKm: z.number().int().min(1).max(100).default(50),
    manualQueries: normalizedStringList,
    manualSearchUrls: normalizedStringList,
    queryMode: z.enum(['merge', 'manual-only']).default('merge'),
    maxResults: z.number().int().min(10).max(300).default(100),
    includePromoted: z.boolean().default(true),
});

export function validateInput(raw: unknown): ValidatedInput {
    return inputSchema.parse(raw);
}
