import { MockAIProvider } from '@/lib/ai/mock';
import {
  DocumentSummarySchema,
  ClauseExtractionResultSchema,
  RiskAnalysisResultSchema,
  ObligationExtractionResultSchema,
  QuestionAnswerSchema,
  ComparisonResultSchema,
  ChecklistSchema,
} from '@/lib/ai/schemas';
import type { DocumentChunk } from '@/lib/ai/provider';

describe('Mock AI Provider and Schema Validation', () => {
  const provider = new MockAIProvider();
  const sampleChunks: DocumentChunk[] = [
    {
      id: 'c1',
      chunkIndex: 0,
      text: 'Section 1. Term. This agreement begins Jan 1, 2025 and lasts for 1 year.',
    },
    {
      id: 'c2',
      chunkIndex: 1,
      text: 'Section 2. Fees. The subscription fee is $10,000 annually payable in advance.',
    },
  ];

  it('generates summary that validates against DocumentSummarySchema', async () => {
    const summary = await provider.summarizeDocument(sampleChunks, 'Document content');
    const parsed = DocumentSummarySchema.safeParse(summary);
    expect(parsed.success).toBe(true);
    expect(summary.plainLanguageSummary.length).toBeGreaterThan(10);
    expect(Array.isArray(summary.keyPoints)).toBe(true);
  });

  it('generates clause extraction that validates against ClauseExtractionResultSchema', async () => {
    const result = await provider.extractClauses(sampleChunks);
    const parsed = ClauseExtractionResultSchema.safeParse(result);
    expect(parsed.success).toBe(true);
    expect(result.clauses.length).toBeGreaterThan(0);
  });

  it('generates risk analysis that validates against RiskAnalysisResultSchema', async () => {
    const summary = await provider.summarizeDocument(sampleChunks, 'Document content');
    const result = await provider.analyzeRisks(sampleChunks, summary);
    const parsed = RiskAnalysisResultSchema.safeParse(result);
    expect(parsed.success).toBe(true);
    expect(result.risks.length).toBeGreaterThan(0);
  });

  it('generates obligations that validate against ObligationExtractionResultSchema', async () => {
    const result = await provider.extractObligations(sampleChunks);
    const parsed = ObligationExtractionResultSchema.safeParse(result);
    expect(parsed.success).toBe(true);
    expect(result.obligations.length).toBeGreaterThan(0);
  });

  it('generates Q&A that validates against QuestionAnswerSchema', async () => {
    const answer = await provider.answerQuestion('What are the fees?', sampleChunks, 'test.txt');
    const parsed = QuestionAnswerSchema.safeParse(answer);
    expect(parsed.success).toBe(true);
    expect(answer.isGrounded).toBe(true);
  });

  it('generates comparison that validates against ComparisonResultSchema', async () => {
    const comparison = await provider.compareDocuments(sampleChunks, sampleChunks, 'Doc A', 'Doc B');
    const parsed = ComparisonResultSchema.safeParse(comparison);
    expect(parsed.success).toBe(true);
    expect(comparison.clauseComparisons.length).toBeGreaterThan(0);
  });

  it('generates checklist that validates against ChecklistSchema', async () => {
    const summary = await provider.summarizeDocument(sampleChunks, 'Document content');
    const checklist = await provider.generateChecklist(sampleChunks, 'before-signing', summary);
    const parsed = ChecklistSchema.safeParse(checklist);
    expect(parsed.success).toBe(true);
    expect(checklist.items.length).toBeGreaterThan(0);
  });
});
