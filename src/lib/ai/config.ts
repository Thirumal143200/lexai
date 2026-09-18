/**
 * Centralised AI Configuration for LexAI
 *
 * Single source of truth for:
 * - Primary AI model
 * - Fallback AI model
 * - Candidate models for graceful degradation
 * - Request timeouts and retry limits
 */

export interface AIExecutionMeta {
  modelAttempted: string;
  fallbackUsed: boolean;
  attemptCount: number;
  errorCategory?: string;
  latencyMs: number;
  source: 'primary' | 'fallback' | 'local';
}

export const AI_CONFIG = {
  /** Primary production model (default: gemini-2.5-flash) */
  get primaryModel(): string {
    return (
      process.env.GEMINI_PRIMARY_MODEL ??
      process.env.GEMINI_MODEL ??
      'gemini-2.5-flash'
    ).trim();
  },

  /** Secondary fallback model (default: gemini-2.5-flash-lite) */
  get fallbackModel(): string {
    return (
      process.env.GEMINI_FALLBACK_MODEL ??
      'gemini-2.5-flash-lite'
    ).trim();
  },

  /**
   * Additional models to attempt if both primary and fallback encounter
   * model-not-found / deprecation errors.
   */
  get candidateFallbacks(): string[] {
    const candidates = [
      this.primaryModel,
      this.fallbackModel,
      'gemini-3.6-flash',
      'gemini-3-flash',
      'gemini-flash-latest',
      'gemini-2.0-flash',
      'gemini-1.5-flash',
    ];
    return candidates.filter((m, idx, arr) => Boolean(m) && arr.indexOf(m) === idx);
  },

  /** Maximum time allowed for an individual Gemini API call (25 seconds) */
  requestTimeoutMs: 25_000,

  /** Maximum retry attempts per model for transient errors (1 controlled retry) */
  maxRetriesPerModel: 1,

  /** Base delay for retry backoff in ms */
  baseDelayMs: 600,

  /** Max delay for retry backoff in ms */
  maxDelayMs: 3_000,

  /** Maximum document context characters to include in prompt */
  maxContextChars: 60_000,
};
