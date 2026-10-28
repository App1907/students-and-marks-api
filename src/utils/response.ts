import type { Response } from 'express';

/**
 * Standard response envelope used by EVERY module.
 *
 * Success: { "success": true,  "message": "...", "data": ... }
 * Error:   { "success": false, "message": "...", "details": ... }
 */
export interface SuccessResponse<T> {
  success: true;
  message: string;
  data: T;
  curl?: string;
}

export interface ErrorResponse {
  success: false;
  message: string;
  details: unknown;
  curl?: string;
}

export const sendSuccess = <T>(res: Response, data: T, message = 'Success', statusCode = 200): void => {
  res.status(statusCode).json({ success: true, message, data } satisfies SuccessResponse<T>);
};

export const sendError = (res: Response, statusCode: number, message: string, details: unknown = null): void => {
  res.status(statusCode).json({ success: false, message, details } satisfies ErrorResponse);
};
