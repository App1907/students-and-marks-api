import { z } from 'zod';

/** Reject control characters, null bytes, and angle brackets (XSS / binary). */
const UNSAFE_TEXT = /[\u0000-\u001F\u007F<>]/;

/**
 * Trim + NFC-normalise text, then reject dangerous characters.
 * Used as the base for every free-text field in the API.
 */
export const safeText = (field: string, min = 1, max = 200) =>
  z
    .string({ error: `${field} must be a string` })
    .transform((value) => value.normalize('NFC').trim())
    .refine((value) => value.length >= min, { message: `${field} is required` })
    .refine((value) => value.length <= max, { message: `${field} must be at most ${max} characters` })
    .refine((value) => !UNSAFE_TEXT.test(value), {
      message: `${field} contains forbidden characters`,
    });

/** Person / guardian name: letters, spaces, hyphen, apostrophe. */
export const personName = (field = 'name') =>
  safeText(field, 1, 100).refine((value) => /^[\p{L}][\p{L}\s'.-]*$/u.test(value), {
    message: `${field} must be a valid person name`,
  });

/** URL/path id param: positive integer string → number. */
export const idParam = (field = 'id') =>
  z
    .string({ error: `${field} is required` })
    .regex(/^\d+$/, `${field} must be a positive integer`)
    .transform((value) => Number(value))
    .refine((value) => Number.isInteger(value) && value > 0, {
      message: `${field} must be a positive integer`,
    });

/** Tag-style slug: lowercase letters, digits, hyphen. */
export const tag = (field = 'tag') =>
  safeText(field, 1, 50)
    .transform((value) => value.toLowerCase())
    .refine((value) => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value), {
      message: `${field} must be a lowercase slug (e.g. "maths")`,
    });

/** Shared list pagination. Unknown query keys are ignored by the parent object. */
export const pagination = z.object({
  limit: z
    .string()
    .regex(/^\d+$/, 'limit must be a positive integer')
    .transform(Number)
    .refine((n) => n >= 1 && n <= 100, { message: 'limit must be between 1 and 100' })
    .optional()
    .default(20),
  offset: z
    .string()
    .regex(/^\d+$/, 'offset must be a non-negative integer')
    .transform(Number)
    .refine((n) => n >= 0, { message: 'offset must be >= 0' })
    .optional()
    .default(0),
});

/**
 * Escape `%` and `_` so user search input cannot widen an ILIKE pattern.
 * Always pass the result as a bound parameter, never concatenate into SQL.
 */
export const escapeLike = (value: string): string =>
  value.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');

/** At most two decimal places for a finite JSON number. */
export const atMostTwoDecimals = (field: string) =>
  z
    .number({ error: `${field} must be a number` })
    .finite(`${field} must be a finite number`)
    .refine((value) => Math.abs(value * 100 - Math.round(value * 100)) < 1e-8, {
      message: `${field} must have at most 2 decimal places`,
    });
