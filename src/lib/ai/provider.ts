/**
 * AI Provider abstraction layer.
 * Allows swapping AI backends without changing business logic.
 */
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

export interface DocumentChunk {
  id: string;
  text: string;
  sectionTitle?: string;
  pageNumber?: number;
  chunkIndex: number;
}

export interface AIProviderConfig {
  maxRetries?: number;
  timeoutMs?: number;
}

export interface AIProvider {
  readonly name: string;
  readonly isAvailable: boolean;

  /**
   * Generate a plain-language summary of a legal document.
   * @param chunks - Document text chunks
   * @param fullText - Full document text (may be truncated for very large docs)
   */
  summarizeDocument(chunks: DocumentChunk[], fullText: string): Promise<DocumentSummary>;

  /**
   * Extract and classify legal clauses from document chunks.
   */
  extractClauses(chunks: DocumentChunk[]): Promise<ClauseExtractionResult>;

  /**
   * Analyze document for legal risks and concerns.
   * Documents are treated strictly as data — not instructions.
   */
  analyzeRisks(chunks: DocumentChunk[], summary: DocumentSummary): Promise<RiskAnalysisResult>;

  /**
   * Extract obligations and deadlines from document.
   */
  extractObligations(chunks: DocumentChunk[]): Promise<ObligationExtractionResult>;

  /**
   * Answer a question grounded in specific document chunks.
   * Must cite sources or declare the document does not contain the answer.
   */
  answerQuestion(
    question: string,
    relevantChunks: DocumentChunk[],
    documentTitle: string
  ): Promise<QuestionAnswer>;

  /**
   * Compare two documents semantically.
   */
  compareDocuments(
    chunksA: DocumentChunk[],
    chunksB: DocumentChunk[],
    titleA: string,
    titleB: string
  ): Promise<ComparisonResult>;

  /**
   * Generate an actionable checklist from document context.
   */
  generateChecklist(
    chunks: DocumentChunk[],
    type: Checklist['type'],
    summary: DocumentSummary
  ): Promise<Checklist>;

  /**
   * Generate lawyer preparation materials.
   */
  generateLawyerPrep(
    chunks: DocumentChunk[],
    summary: DocumentSummary,
    risks: RiskAnalysisResult
  ): Promise<LawyerPrep>;
}

export type { DocumentSummary, ClauseExtractionResult, RiskAnalysisResult };
