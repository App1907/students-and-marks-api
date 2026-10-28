import type { RequestHandler } from 'express';
import type { ZodType } from 'zod';

/**
 * Validates req.body against a DTO schema and replaces it with the parsed
 * (trimmed, coerced) value. A ZodError is thrown -> central error handler -> 400.
 */
export const validateBody =
  (schema: ZodType): RequestHandler =>
  (req, _res, next) => {
    req.body = schema.parse(req.body);
    next();
  };

/**
 * Validates req.params. Express 5 exposes params/query as getter-only, so we
 * attach the parsed value on `res.locals` instead of reassigning the request.
 */
export const validateParams =
  (schema: ZodType, key = 'params'): RequestHandler =>
  (req, res, next) => {
    res.locals[key] = schema.parse(req.params);
    next();
  };

/** Validates req.query and stores the result on `res.locals` (default key: query). */
export const validateQuery =
  (schema: ZodType, key = 'query'): RequestHandler =>
  (req, res, next) => {
    res.locals[key] = schema.parse(req.query);
    next();
  };
