import type { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import { isProduction } from '../config/env';
import { isAppError } from '../errors/AppError';
import { sendError } from '../utils/response';

/** Flatten Zod issues into dotted paths: "guardian.phone", "marks.2.score". */
export const zodDetails = (err: ZodError): Record<string, string[]> => {
  const details: Record<string, string[]> = {};
  for (const issue of err.issues) {
    const path = issue.path.length > 0 ? issue.path.join('.') : '_errors';
    (details[path] ??= []).push(issue.message);
  }
  return details;
};

/**
 * The single place errors become HTTP responses, always in the standard
 * error shape: { success: false, message, details }.
 */
export const errorHandler: ErrorRequestHandler = (err, _req, res, next) => {
  if (res.headersSent) {
    next(err);
    return;
  }

  if (isAppError(err)) {
    sendError(res, err.statusCode, err.message, err.details ?? null);
    return;
  }

  if (err instanceof ZodError) {
    sendError(res, 400, 'Validation failed', zodDetails(err));
    return;
  }

  // Malformed JSON body from express.json()
  if (err?.type === 'entity.parse.failed') {
    sendError(res, 400, 'Malformed JSON body', err.message);
    return;
  }

  // Body larger than express.json limit
  if (err?.type === 'entity.too.large') {
    sendError(res, 413, 'Payload too large', err.message);
    return;
  }

  console.error('Unhandled error:', err);
  sendError(
    res,
    500,
    'Internal Server Error',
    isProduction ? null : { name: (err as Error).name, message: (err as Error).message },
  );
};
