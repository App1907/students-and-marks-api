import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config({ quiet: true });

const academicYearSchema = z
  .string({ error: 'ACADEMIC_YEAR is required but missing' })
  .min(1, 'ACADEMIC_YEAR is required but missing')
  .regex(/^\d{4}-\d{2}$/, 'ACADEMIC_YEAR must be in YYYY-YY format (e.g. "2026-27")')
  .superRefine((value, ctx) => {
    const match = /^(\d{4})-(\d{2})$/.exec(value);
    if (!match) return;
    const first = Number(match[1]);
    const second = Number(match[2]);
    if (second !== (first + 1) % 100) {
      ctx.addIssue({
        code: 'custom',
        message: `ACADEMIC_YEAR: second year must follow the first (received "${value}")`,
      });
    }
  });

const passPercentageSchema = z
  .string({ error: 'PASS_PERCENTAGE is required but missing' })
  .trim()
  .min(1, 'PASS_PERCENTAGE is required but missing')
  .refine((value) => !Number.isNaN(Number(value)), {
    message: 'PASS_PERCENTAGE must be a number (received a non-numeric value)',
  })
  .transform((value) => Number(value))
  .refine((value) => value >= 0 && value <= 100, {
    message: 'PASS_PERCENTAGE must be between 0 and 100 inclusive',
  });

export const envSchema = z.object({
  NODE_ENV: z.string().default('development'),
  PORT: z.coerce.number().int().positive().default(3000),

  DB_HOST: z.string().default('localhost'),
  DB_PORT: z.coerce.number().int().positive().default(5432),
  DB_USER: z.string().min(1, 'DB_USER is required but missing'),
  DB_PASSWORD: z.string().default(''),
  DB_NAME: z.string().min(1, 'DB_NAME is required but missing'),

  PASS_PERCENTAGE: passPercentageSchema,
  ACADEMIC_YEAR: academicYearSchema,
});

export type Env = z.infer<typeof envSchema>;

/** Formats Zod issues into "VAR: message" lines for startup / tests. */
export const formatConfigErrors = (error: z.ZodError): string[] =>
  error.issues.map((issue) => {
    const key = String(issue.path[0] ?? 'CONFIG');
    const message = issue.message.startsWith(key) ? issue.message : `${key}: ${issue.message}`;
    return message;
  });

/**
 * Validates process env (or a provided bag). On failure prints one line per
 * variable naming what is wrong. Callers that boot the server should exit 1.
 */
export const validateConfig = (
  raw: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env,
): Env => {
  const result = envSchema.safeParse(raw);
  if (!result.success) {
    const messages = formatConfigErrors(result.error);
    for (const line of messages) {
      console.error(line);
    }
    const err = new Error(messages.join('\n')) as Error & { isConfigError: true; messages: string[] };
    err.isConfigError = true;
    err.messages = messages;
    throw err;
  }
  return result.data;
};

const loadEnv = (): Env => {
  try {
    return validateConfig(process.env);
  } catch {
    // Message already printed by validateConfig — refuse to start.
    process.exit(1);
  }
};

export const env: Env = loadEnv();

export const isProduction = env.NODE_ENV === 'production';
