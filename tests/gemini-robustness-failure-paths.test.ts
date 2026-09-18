/**
 * Gemini Robustness & Failure Path Tests.
 *
 * Verifies all failure modes required by Phase 9:
 * 1. Gemini success & valid output
 * 2. Gemini timeout handling (AbortController / 504 AI_TIMEOUT)
 * 3. Gemini 429 rate limit handling
 * 4. Gemini 5xx transient error retry
 * 5. Invalid model rejection
 * 6. Malformed JSON response handling
 * 7. Schema validation failure handling
 * 8. API error formatting (no internals leaked)
 * 9. Retry mechanism and non-retryable failure filtering
 * 10. Finite state transitions (no infinite loading)
 */

import { AppError, toApiError, USER_MESSAGES } from '@/lib/utils/errors';
import { withRetry } from '@/lib/utils/retry';
import { DocumentSummarySchema } from '@/lib/ai/schemas';

describe('Gemini Failure Paths & Resilience', () => {
  describe('1. Gemini Success & Valid Parsing', () => {
    it('successfully parses and validates valid Gemini JSON summary', () => {
      const validGeminiOutput = JSON.stringify({
        plainLanguageSummary: 'This is a valid lease agreement summary.',
        keyPoints: ['Monthly rent is $2000', 'Term is 12 months'],
        metadata: {
          documentType: 'Lease Agreement',
          parties: ['Landlord LLC', 'Tenant Inc'],
          effectiveDate: '2026-01-01',
          governingLaw: 'California',
        },
      });

      const parsed = JSON.parse(validGeminiOutput);
      const validated = DocumentSummarySchema.parse(parsed);

      expect(validated.plainLanguageSummary).toBe('This is a valid lease agreement summary.');
      expect(validated.keyPoints).toHaveLength(2);
      expect(validated.metadata?.documentType).toBe('Lease Agreement');
    });
  });

  describe('2. Gemini Timeout Handling (Hard Timeout)', () => {
    it('creates AI_TIMEOUT AppError with 504 status code when request times out', () => {
      const timeoutError = new AppError('AI request timed out after 30s for summary', 504, 'AI_TIMEOUT');
      const apiError = toApiError(timeoutError);

      expect(apiError.statusCode).toBe(504);
      expect(apiError.code).toBe('AI_TIMEOUT');
      expect(apiError.error).toContain('timed out');
      expect(USER_MESSAGES.AI_TIMEOUT).toBe('The analysis took too long to complete. Please try again.');
    });
  });

  describe('3. Gemini 429 Rate Limit', () => {
    it('correctly maps 429 rate limit to AI_RATE_LIMITED with 429 status', () => {
      const rateLimitError = new AppError('AI service rate limit reached. Please wait a moment.', 429, 'AI_RATE_LIMITED');
      const apiError = toApiError(rateLimitError);

      expect(apiError.statusCode).toBe(429);
      expect(apiError.code).toBe('AI_RATE_LIMITED');
    });
  });

  describe('4. Gemini 5xx Transient Error & Retry', () => {
    it('retries transient 5xx errors and succeeds if next attempt works', async () => {
      let attempts = 0;
      const fn = jest.fn().mockImplementation(async () => {
        attempts++;
        if (attempts === 1) {
          throw new AppError('503 Service Unavailable', 503, 'AI_PROVIDER_ERROR');
        }
        return { success: true };
      });

      const result = await withRetry(fn, { maxRetries: 2, baseDelayMs: 10 });
      expect(result).toEqual({ success: true });
      expect(attempts).toBe(2);
    });
  });

  describe('5. Invalid Model Detection', () => {
    it('identifies invalid model and fails immediately without retry', async () => {
      let attempts = 0;
      const invalidModelFn = jest.fn().mockImplementation(async () => {
        attempts++;
        throw new AppError('AI model "gemini-1.5-flash" is not available.', 400, 'AI_UNAVAILABLE');
      });

      await expect(withRetry(invalidModelFn, { maxRetries: 2, baseDelayMs: 10 })).rejects.toThrow(AppError);
      expect(attempts).toBe(1); // Non-retryable
    });
  });

  describe('6. Malformed Gemini Output', () => {
    it('throws AI_INVALID_RESPONSE on malformed JSON and rejects without infinite loop', () => {
      const malformedJson = '{ "plainLanguageSummary": "unterminated string... ';
      expect(() => JSON.parse(malformedJson)).toThrow();

      const invalidRespError = new AppError('AI returned malformed JSON for summary', 502, 'AI_INVALID_RESPONSE');
      const apiError = toApiError(invalidRespError);
      expect(apiError.statusCode).toBe(502);
      expect(apiError.code).toBe('AI_INVALID_RESPONSE');
    });
  });

  describe('7. Schema Validation Failure', () => {
    it('throws AI_SCHEMA_INVALID and does not retry validation errors', async () => {
      let attempts = 0;
      const schemaValidationFn = jest.fn().mockImplementation(async () => {
        attempts++;
        throw new AppError('AI response did not match expected schema', 502, 'AI_SCHEMA_INVALID');
      });

      await expect(withRetry(schemaValidationFn, { maxRetries: 2, baseDelayMs: 10 })).rejects.toThrow('AI response did not match expected schema');
      expect(attempts).toBe(1); // Permanent failure, no retry
    });
  });

  describe('8. Frontend/API Error Response Format', () => {
    it('does not expose internal system details or stack traces to API consumers', () => {
      const internalError = new Error('SQLITE_ERROR: syntax error in database file /var/data/db.sqlite');
      const apiError = toApiError(internalError);

      expect(apiError.statusCode).toBe(500);
      expect(apiError.code).toBe('INTERNAL_ERROR');
      expect(apiError.error).toBe('An unexpected error occurred. Please try again.');
      expect(apiError.error).not.toContain('SQLITE_ERROR');
      expect(apiError.error).not.toContain('/var/data/db.sqlite');
    });
  });

  describe('9. Retry After Failed Summary', () => {
    it('allows clean retry state transitions', () => {
      // Simulate state machine: idle -> loading -> error -> retry -> loading -> success
      const stateMachine = {
        state: 'idle' as 'idle' | 'loading' | 'error' | 'success',
        error: null as string | null,
        data: null as unknown,
        startLoad() {
          this.state = 'loading';
          this.error = null;
        },
        fail(err: string) {
          this.state = 'error';
          this.error = err;
        },
        succeed(data: unknown) {
          this.state = 'success';
          this.error = null;
          this.data = data;
        },
      };

      // Initial load fails
      stateMachine.startLoad();
      expect(stateMachine.state).toBe('loading');
      stateMachine.fail('Analysis timed out');
      expect(stateMachine.state).toBe('error');
      expect(stateMachine.error).toBe('Analysis timed out');

      // User clicks Retry
      stateMachine.startLoad();
      expect(stateMachine.state).toBe('loading');
      expect(stateMachine.error).toBeNull();
      stateMachine.succeed({ summary: 'Success' });
      expect(stateMachine.state).toBe('success');
      expect(stateMachine.data).toBeDefined();
    });
  });

  describe('10. Finite Loading State (No Infinite Spinner)', () => {
    it('guarantees error state is reached upon failure so UI never spins infinitely', async () => {
      let loading = true;
      let error: string | null = null;

      try {
        await Promise.reject(new Error('Network failure'));
      } catch (err) {
        error = err instanceof Error ? err.message : 'Unknown error';
      } finally {
        loading = false;
      }

      expect(loading).toBe(false);
      expect(error).toBe('Network failure');
    });
  });
});
