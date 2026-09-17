/**
 * Centralised error types.
 * Using a typed error class keeps API responses consistent and avoids
 * accidentally leaking internal details (stack traces, DB paths, etc.).
 */

export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'NOT_FOUND'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'RATE_LIMITED'
  | 'FILE_TOO_LARGE'
  | 'UNSUPPORTED_FILE_TYPE'
  | 'EMPTY_DOCUMENT'
  | 'EXTRACTION_FAILED'
  | 'AI_UNAVAILABLE'
  | 'AI_EMPTY_RESPONSE'
  | 'AI_INVALID_RESPONSE'
  | 'AI_SCHEMA_INVALID'
  | 'AI_BLOCKED_RESPONSE'
  | 'AI_RATE_LIMITED'
  | 'AI_PROVIDER_ERROR'
  | 'AI_TIMEOUT'
  | 'PROCESSING_FAILED'
  | 'DATABASE_ERROR'
  | 'INTERNAL_ERROR';

export class AppError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly code: ErrorCode,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = 'AppError';
  }
}

/** Safe error message for API responses — never exposes internal details. */
export function toApiError(err: unknown): { error: string; code: string; statusCode: number } {
  if (err instanceof AppError) {
    return { error: err.message, code: err.code, statusCode: err.statusCode };
  }
  // Unknown errors: log internally but return a generic message
  console.error('[AppError] Unhandled error:', err instanceof Error ? err.message : String(err));
  return { error: 'An unexpected error occurred. Please try again.', code: 'INTERNAL_ERROR', statusCode: 500 };
}

/** User-readable error messages for the UI. */
export const USER_MESSAGES: Record<ErrorCode, string> = {
  VALIDATION_ERROR: 'The request could not be processed. Please check your input.',
  NOT_FOUND: 'The requested document was not found.',
  UNAUTHORIZED: 'You are not authorised to access this resource.',
  FORBIDDEN: 'Access to this document is not permitted.',
  RATE_LIMITED: 'Too many requests. Please wait a moment before trying again.',
  FILE_TOO_LARGE: 'The file is too large. Maximum size is 10 MB.',
  UNSUPPORTED_FILE_TYPE: 'This file type is not supported. Please upload a PDF, DOCX, or TXT file.',
  EMPTY_DOCUMENT: 'No readable text was found in the document. The file may be scanned or image-based.',
  EXTRACTION_FAILED: 'The document could not be read. It may be corrupted or password-protected.',
  AI_UNAVAILABLE: 'The analysis service is currently unavailable. Please check your API configuration.',
  AI_EMPTY_RESPONSE: 'The AI returned an incomplete response. Please try again.',
  AI_INVALID_RESPONSE: 'The analysis result was in an unexpected format. Please try again.',
  AI_SCHEMA_INVALID: 'The analysis result did not match the expected structure. Please try again.',
  AI_BLOCKED_RESPONSE: 'This request was blocked by AI content filters. Please try rephrasing your query.',
  AI_RATE_LIMITED: 'AI service rate limit reached. Please wait a moment before trying again.',
  AI_PROVIDER_ERROR: 'A temporary error occurred with the AI service. Please try again.',
  AI_TIMEOUT: 'The analysis took too long to complete. Please try again.',
  PROCESSING_FAILED: 'Document processing failed. Please try uploading again.',
  DATABASE_ERROR: 'A storage error occurred. Please try again.',
  INTERNAL_ERROR: 'An unexpected error occurred. Please try again.',
};
