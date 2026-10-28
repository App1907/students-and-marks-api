import type { RequestHandler } from 'express';
import { badRequest, createError } from '../errors/AppError';

const DANGEROUS_KEYS = new Set(['__proto__', 'constructor', 'prototype']);
const MAX_ARRAY_LENGTH = 100;
const MAX_DEPTH = 8;

type WalkResult = { ok: true } | { ok: false; reason: string; status: number };

const walk = (value: unknown, depth: number): WalkResult => {
  if (value === null || typeof value !== 'object') return { ok: true };
  if (depth > MAX_DEPTH) {
    return { ok: false, reason: 'Payload nesting is too deep', status: 413 };
  }

  if (Array.isArray(value)) {
    if (value.length > MAX_ARRAY_LENGTH) {
      return {
        ok: false,
        reason: `Array exceeds maximum length of ${MAX_ARRAY_LENGTH}`,
        status: 413,
      };
    }
    for (const item of value) {
      const result = walk(item, depth + 1);
      if (!result.ok) return result;
    }
    return { ok: true };
  }

  for (const key of Reflect.ownKeys(value as object)) {
    const name = String(key);
    if (DANGEROUS_KEYS.has(name)) {
      return {
        ok: false,
        reason: `Forbidden property "${name}" is not allowed`,
        status: 400,
      };
    }
    const result = walk((value as Record<string | symbol, unknown>)[key as string], depth + 1);
    if (!result.ok) return result;
  }

  return { ok: true };
};

/**
 * Rejects prototype-pollution keys and oversized nested arrays BEFORE Zod /
 * repositories run. Oversized payloads → 413; dangerous keys → 400.
 */
export const rejectDangerousPayload: RequestHandler = (req, _res, next) => {
  for (const part of [req.body, req.query, req.params] as unknown[]) {
    if (part === undefined || part === null) continue;
    const result = walk(part, 0);
    if (!result.ok) {
      if (result.status === 413) {
        next(createError(413, 'Payload too large', { payload: [result.reason] }));
        return;
      }
      next(badRequest('Dangerous payload rejected', { payload: [result.reason] }));
      return;
    }
  }
  next();
};
