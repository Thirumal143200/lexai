/**
 * Resilient Multi-Tier AI Provider for LexAI
 *
 * Implements a 3-tier fallback architecture:
 *   Tier 1: Primary Gemini Model (e.g. gemini-2.5-flash)
 *   Tier 2: Fallback Gemini Model (e.g. gemini-2.5-flash-lite)
 *   Tier 3: Grounded Local Deterministic Analyzer (MockAIProvider)
 *
 * Grounding & Security guarantees:
 * - All models receive identical document data delimiters, system instructions, and schema validation.
 * - Local fallback uses the exact same document text/chunks without faking AI.
 * - Never blindly catches authorization failures or safety-filter blocks.
 */

import type { AIProvider, DocumentChunk } from './provider';
import type {
  DocumentSummary,
  ClauseExtractionResult,
  RiskAnalysisResult,
  ObligationExtractionResult,
  QuestionAnswer,
  ComparisonResult,
  Checklist,
  LawyerPrep,
} from './schemas';
import type { GeminiProvider } from './gemini';
import type { MockAIProvider } from './mock';
import type { AIExecutionMeta } from './config';
import { AppError } from '@/lib/utils/errors';
import { logger } from '@/lib/utils/logger';

export class ResilientAIProvider implements AIProvider {
  readonly name = 'resilient-ai';
  readonly isAvailable: boolean;
  public lastExecutionMeta: AIExecutionMeta | null = null;

  constructor(
    private readonly gemini: GeminiProvider,
    private readonly local: MockAIProvider
  ) {
    this.isAvailable = this.gemini.isAvailable || this.local.isAvailable;
  }

  /**
   * Determine if an error is a capacity/rate-limit/network failure that can
   * cleanly fall back to local content-aware analysis.
   */
  private isRecoverableByLocalFallback(err: unknown): boolean {
    if (!(err instanceof AppError)) return true;

    // Safety/security and authorization errors must NEVER be bypassed silently
    if (
      err.statusCode === 401 ||
      err.statusCode === 403 ||
      err.code === 'UNAUTHORIZED' ||
      err.code === 'FORBIDDEN' ||
      err.code === 'AI_BLOCKED_RESPONSE' ||
      err.code === 'VALIDATION_ERROR'
    ) {
      return false;
    }

    // Rate limits, timeouts, capacity overload, and transient 5xx can fall back
    return (
      err.code === 'AI_RATE_LIMITED' ||
      err.code === 'AI_UNAVAILABLE' ||
      err.code === 'AI_TIMEOUT' ||
      err.code === 'AI_PROVIDER_ERROR' ||
      err.code === 'AI_EMPTY_RESPONSE' ||
      err.code === 'AI_INVALID_RESPONSE' ||
      err.code === 'AI_SCHEMA_INVALID'
    );
  }

  private async executeWithFallback<T>(
    operationName: string,
    liveFn: () => Promise<T>,
    localFn: () => Promise<T>
  ): Promise<T> {
    const startMs = Date.now();

    if (!this.gemini.isAvailable) {
      logger.info(`Running ${operationName} via local analyzer (Live AI not configured)`);
      const result = await localFn();
      this.lastExecutionMeta = {
        modelAttempted: 'local-analysis',
        fallbackUsed: true,
        attemptCount: 1,
        latencyMs: Date.now() - startMs,
        source: 'local',
      };
      return result;
    }

    try {
      const result = await liveFn();
      this.lastExecutionMeta = this.gemini.lastExecutionMeta ?? {
        modelAttempted: this.gemini.primaryModel,
        fallbackUsed: false,
        attemptCount: 1,
        latencyMs: Date.now() - startMs,
        source: 'primary',
      };
      return result;
    } catch (err) {
      if (this.isRecoverableByLocalFallback(err)) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        const errorCode = err instanceof AppError ? err.code : 'UNKNOWN';

        logger.warn(
          `Live Gemini failed for ${operationName} (${errorCode}: ${errorMsg}). Falling back to local content-aware analyzer.`
        );

        const localResult = await localFn();
        this.lastExecutionMeta = {
          modelAttempted: 'local-analysis',
          fallbackUsed: true,
          attemptCount: (this.gemini.lastExecutionMeta?.attemptCount ?? 1) + 1,
          errorCategory: errorCode,
          latencyMs: Date.now() - startMs,
          source: 'local',
        };
        return localResult;
      }

      // Non-recoverable error (e.g. auth, prompt safety block)
      this.lastExecutionMeta = this.gemini.lastExecutionMeta;
      throw err;
    }
  }

  async summarizeDocument(chunks: DocumentChunk[], fullText: string): Promise<DocumentSummary> {
    return this.executeWithFallback(
      'summarizeDocument',
      () => this.gemini.summarizeDocument(chunks, fullText),
      () => this.local.summarizeDocument(chunks, fullText)
    );
  }

  async extractClauses(chunks: DocumentChunk[]): Promise<ClauseExtractionResult> {
    return this.executeWithFallback(
      'extractClauses',
      () => this.gemini.extractClauses(chunks),
      () => this.local.extractClauses(chunks)
    );
  }

  async analyzeRisks(chunks: DocumentChunk[], summary: DocumentSummary): Promise<RiskAnalysisResult> {
    return this.executeWithFallback(
      'analyzeRisks',
      () => this.gemini.analyzeRisks(chunks, summary),
      () => this.local.analyzeRisks(chunks, summary)
    );
  }

  async extractObligations(chunks: DocumentChunk[]): Promise<ObligationExtractionResult> {
    return this.executeWithFallback(
      'extractObligations',
      () => this.gemini.extractObligations(chunks),
      () => this.local.extractObligations(chunks)
    );
  }

  async answerQuestion(
    question: string,
    chunks: DocumentChunk[],
    documentTitle: string
  ): Promise<QuestionAnswer> {
    return this.executeWithFallback(
      'answerQuestion',
      () => this.gemini.answerQuestion(question, chunks, documentTitle),
      () => this.local.answerQuestion(question, chunks, documentTitle)
    );
  }

  async compareDocuments(
    chunksA: DocumentChunk[],
    chunksB: DocumentChunk[],
    titleA: string,
    titleB: string
  ): Promise<ComparisonResult> {
    return this.executeWithFallback(
      'compareDocuments',
      () => this.gemini.compareDocuments(chunksA, chunksB, titleA, titleB),
      () => this.local.compareDocuments(chunksA, chunksB, titleA, titleB)
    );
  }

  async generateChecklist(
    chunks: DocumentChunk[],
    type: Checklist['type'],
    summary: DocumentSummary
  ): Promise<Checklist> {
    return this.executeWithFallback(
      'generateChecklist',
      () => this.gemini.generateChecklist(chunks, type, summary),
      () => this.local.generateChecklist(chunks, type, summary)
    );
  }

  async generateLawyerPrep(
    chunks: DocumentChunk[],
    summary: DocumentSummary,
    risks: RiskAnalysisResult
  ): Promise<LawyerPrep> {
    return this.executeWithFallback(
      'generateLawyerPrep',
      () => this.gemini.generateLawyerPrep(chunks, summary, risks),
      () => this.local.generateLawyerPrep(chunks, summary, risks)
    );
  }
}
