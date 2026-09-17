/**
 * Retry utility with exponential backoff.
 *
 * Design decisions:
 * - Non-retryable errors: blocked content, validation errors, schema mismatches
 *   re-throwing these immediately avoids wasting quota and API time.
 * - Retryable errors: network timeouts, 5xx, transient provider failures.
 * - Jitter: avoids retry storms when multiple requests fail simultaneously.
 */

import { AppError } from './errors';

/** Error codes that should never be retried — the problem is in the request. */
const NON_RETRYABLE_CODES = new Set([
  'AI_BLOCKED_RESPONSE',
  'AI_INVALID_RESPONSE',
  'AI_SCHEMA_INVALID',
  'VALIDATION_ERROR',
  'UNSUPPORTED_FILE_TYPE',
  'FILE_TOO_LARGE',
  'EMPTY_DOCUMENT',
  'NOT_FOUND',
  'FORBIDDEN',
  'UNAUTHORIZED',
]);

interface RetryOptions {
  maxRetries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const { maxRetries = 2, baseDelayMs = 500, maxDelayMs = 8000 } = options;
  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;

      // Don't retry permanent failures
      if (err instanceof AppError && NON_RETRYABLE_CODES.has(err.code)) {
        throw err;
      }

      if (attempt < maxRetries) {
        // Exponential backoff with ±10% jitter to avoid retry storms
        const base = Math.min(baseDelayMs * 2 ** attempt, maxDelayMs);
        const jitter = base * 0.1 * (Math.random() * 2 - 1);
        await sleep(Math.round(base + jitter));
      }
    }
  }

  throw lastError;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
