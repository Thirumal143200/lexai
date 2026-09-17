/**
 * AI Output Validation & Robustness Tests.
 *
 * Verifies that malformed, corrupted, or hallucinated AI responses are caught
 * and rejected by Zod schemas before persisting or rendering to the user.
 */

import {
  DocumentSummarySchema,
  ClauseExtractionResultSchema,
  RiskAnalysisResultSchema,
  QuestionAnswerSchema,
  ComparisonResultSchema,
  ChecklistSchema,
} from '@/lib/ai/schemas';

describe('AI Output Schema Validation & Error Rejection', () => {
  describe('DocumentSummarySchema', () => {
    it('rejects summary missing plainLanguageSummary', () => {
      const invalid = {
        keyPoints: ['Point 1'],
        metadata: { title: 'Test' },
      };
      const result = DocumentSummarySchema.safeParse(invalid);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some((i) => i.path.includes('plainLanguageSummary'))).toBe(true);
      }
    });

    it('rejects summary where keyPoints is not an array', () => {
      const invalid = {
        plainLanguageSummary: 'Valid summary text.',
        keyPoints: 'Not an array',
      };
      const result = DocumentSummarySchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe('ClauseExtractionResultSchema', () => {
    it('rejects clause with invalid enum category', () => {
      const invalid = {
        clauses: [
          {
            id: 'c-1',
            category: 'super-invalid-category-xyz', // Invalid enum
            title: 'Sample',
            originalText: 'Text',
            plainLanguageExplanation: 'Explanation',
            sourceSection: 'Sec 1',
          },
        ],
      };
      const result = ClauseExtractionResultSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('rejects clause missing required originalText or plainLanguageExplanation', () => {
      const invalid = {
        clauses: [
          {
            id: 'c-1',
            category: 'liability',
            title: 'Liability Cap',
            // Missing originalText and plainLanguageExplanation
            sourceSection: 'Sec 9',
          },
        ],
      };
      const result = ClauseExtractionResultSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe('RiskAnalysisResultSchema', () => {
    it('rejects risk with invalid severity level', () => {
      const invalid = {
        overallAssessment: 'Overall assessment text',
        highAttentionCount: 1,
        reviewCount: 0,
        informationalCount: 0,
        risks: [
          {
            id: 'r-1',
            level: 'catastrophic', // Not in 'high-attention' | 'review' | 'informational'
            title: 'Severe risk',
            description: 'Description',
            whyItMatters: 'Why',
            potentialConsequence: 'Consequence',
            suggestedAction: 'Action',
            clauseReference: 'Sec 2',
            excerpt: 'Excerpt',
          },
        ],
      };
      const result = RiskAnalysisResultSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe('QuestionAnswerSchema', () => {
    it('rejects Q&A missing answer or confidence', () => {
      const invalid = {
        question: 'What is the governing law?',
        // Missing answer
        isGrounded: true,
        citations: [],
      };
      const result = QuestionAnswerSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('rejects citation with invalid confidence outside [0, 1]', () => {
      const invalid = {
        question: 'Who pays?',
        answer: 'Tenant pays.',
        isGrounded: true,
        confidence: 0.9,
        citations: [
          {
            sectionId: 'c-1',
            excerpt: 'Tenant pays rent.',
            confidence: 2.5, // Exceeds max 1.0
          },
        ],
      };
      const result = QuestionAnswerSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe('ComparisonResultSchema', () => {
    it('rejects comparison missing docATitle or clauseComparisons', () => {
      const invalid = {
        docBTitle: 'Doc B',
        overallSummary: 'Summary',
        keyDifferences: [],
      };
      const result = ComparisonResultSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('rejects clause comparison with invalid changeType', () => {
      const invalid = {
        docATitle: 'Doc A',
        docBTitle: 'Doc B',
        overallSummary: 'Summary',
        keyDifferences: ['Diff 1'],
        addedCount: 0,
        removedCount: 0,
        modifiedCount: 1,
        unchangedCount: 0,
        clauseComparisons: [
          {
            id: 'cmp-1',
            category: 'payment',
            changeType: 'demolished', // Invalid changeType enum
          },
        ],
      };
      const result = ComparisonResultSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe('ChecklistSchema', () => {
    it('rejects checklist with invalid lifecycle type', () => {
      const invalid = {
        id: 'chk-1',
        type: 'invalid-lifecycle-type',
        title: 'Checklist',
        description: 'Desc',
        items: [],
        generatedAt: new Date().toISOString(),
      };
      const result = ChecklistSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });
});
