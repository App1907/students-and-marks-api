import type { Request, RequestHandler } from 'express';
import { isProduction } from '../config/env';

/** Headers that curl sets itself or that are noise when replaying a request. */
const SKIP_HEADERS = new Set([
  'host',
  'content-length',
  'connection',
  'accept-encoding',
  'user-agent',
  'postman-token',
  'cache-control',
]);

/** Wrap a value in single quotes for the shell, escaping any single quotes inside it. */
const shellQuote = (value: string): string => `'${value.replace(/'/g, `'\\''`)}'`;

/** Rebuilds the incoming request as a copy-pasteable curl command. */
export const buildCurl = (req: Request): string => {
  const url = `${req.protocol}://${req.get('host')}${req.originalUrl}`;
  const parts = [`curl --location --request ${req.method} ${shellQuote(url)}`];

  for (const [name, value] of Object.entries(req.headers)) {
    if (SKIP_HEADERS.has(name) || value === undefined) continue;
    parts.push(`--header ${shellQuote(`${name}: ${Array.isArray(value) ? value.join(', ') : value}`)}`);
  }

  const hasBody = req.body !== undefined && Object.keys(req.body ?? {}).length > 0;
  if (hasBody) parts.push(`--data ${shellQuote(JSON.stringify(req.body))}`);

  return parts.join(' ');
};

/**
 * Adds a `curl` field to every JSON response of the router it is mounted on,
 * including error responses from the central error handler.
 *
 * Disabled in production: the curl echoes request headers (e.g. Authorization).
 */
export const curlResponse: RequestHandler = (req, res, next) => {
  if (isProduction) {
    next();
    return;
  }

  // Build it now, before validateBody replaces req.body with the parsed DTO.
  const curl = buildCurl(req);

  // Wrap res.json so whatever responds later (handler or errorHandler) includes the curl.
  const originalJson = res.json.bind(res);
  res.json = (body: unknown) => {
    const isPlainObject = typeof body === 'object' && body !== null && !Array.isArray(body);
    // console.log(`\n curl: ${curl}\n`);
    return originalJson(isPlainObject ? { ...body, curl } : body);
  };

  // Done here - hand the request to the next middleware/controller in the chain.
  next();
};
