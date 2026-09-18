/**
 * Content-Aware Mock AI provider for testing and Offline Demo Mode.
 *
 * Derives genuine, document-specific, deterministic legal analyses
 * from the actual text and chunks of uploaded documents without
 * contacting external APIs.
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
  DocumentReviewBrief,
} from './schemas';
import {
  analyzeSummary,
  extractClausesFromContent,
  analyzeRisksFromContent,
  extractObligationsFromContent,
  answerQuestionFromContent,
  compareDocumentsFromContent,
  generateChecklistFromContent,
  generateDocumentReviewBriefFromContent,
} from './content-analyzer';

export class MockAIProvider implements AIProvider {
  readonly name = 'mock';
  readonly isAvailable = true;

  async summarizeDocument(chunks: DocumentChunk[], fullText: string): Promise<DocumentSummary> {
    return analyzeSummary(chunks, fullText);
  }

  async extractClauses(chunks: DocumentChunk[]): Promise<ClauseExtractionResult> {
    return extractClausesFromContent(chunks);
  }

  async analyzeRisks(chunks: DocumentChunk[], summary: DocumentSummary): Promise<RiskAnalysisResult> {
    return analyzeRisksFromContent(chunks, summary);
  }

  async extractObligations(chunks: DocumentChunk[]): Promise<ObligationExtractionResult> {
    return extractObligationsFromContent(chunks);
  }

  async answerQuestion(question: string, chunks: DocumentChunk[], documentTitle: string): Promise<QuestionAnswer> {
    return answerQuestionFromContent(question, chunks, documentTitle);
  }

  async compareDocuments(
    chunksA: DocumentChunk[],
    chunksB: DocumentChunk[],
    titleA: string,
    titleB: string
  ): Promise<ComparisonResult> {
    return compareDocumentsFromContent(chunksA, chunksB, titleA, titleB);
  }

  async generateChecklist(
    chunks: DocumentChunk[],
    type: Checklist['type'],
    summary: DocumentSummary
  ): Promise<Checklist> {
    return generateChecklistFromContent(chunks, type, summary);
  }

  async generateDocumentReviewBrief(
    chunks: DocumentChunk[],
    summary: DocumentSummary,
    risks: RiskAnalysisResult
  ): Promise<DocumentReviewBrief> {
    return generateDocumentReviewBriefFromContent(chunks, summary, risks);
  }
}
