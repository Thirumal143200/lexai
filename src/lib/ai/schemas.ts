/**
 * Zod schemas for all AI-generated structured outputs.
 * All AI responses are validated against these schemas before use.
 */
import { z } from 'zod';

// ─── Citation ────────────────────────────────────────────────────────────────

export const CitationSchema = z.object({
  sectionId: z.string(),
  sectionTitle: z.string().optional(),
  excerpt: z.string(),
  pageNumber: z.number().optional(),
  confidence: z.number().min(0).max(1).default(1.0),
});
export type Citation = z.infer<typeof CitationSchema>;

// ─── Document Summary ────────────────────────────────────────────────────────

export const DocumentMetadataSchema = z.object({
  title: z.string().optional(),
  parties: z.array(z.string()).default([]),
  documentType: z.string().optional(),
  effectiveDate: z.string().optional(),
  expiryDate: z.string().optional(),
  jurisdiction: z.string().optional(),
  governingLaw: z.string().optional(),
  language: z.string().default('English'),
});
export type DocumentMetadata = z.infer<typeof DocumentMetadataSchema>;

export const DocumentSummarySchema = z.preprocess(
  (val: unknown) => {
    if (val && typeof val === 'object') {
      const obj = val as Record<string, unknown>;
      const summaryText =
        (typeof obj.documentOverview === 'string' && obj.documentOverview) ||
        (typeof obj.plainLanguageSummary === 'string' && obj.plainLanguageSummary) ||
        undefined;
      const res: Record<string, unknown> = { ...obj };
      if (summaryText !== undefined) {
        res.documentOverview = obj.documentOverview || summaryText;
        res.plainLanguageSummary = obj.plainLanguageSummary || summaryText;
      }
      if (Array.isArray(obj.importantCommitments) || Array.isArray(obj.keyPoints)) {
        res.importantCommitments = Array.isArray(obj.importantCommitments)
          ? obj.importantCommitments
          : obj.keyPoints;
        res.keyPoints = Array.isArray(obj.keyPoints)
          ? obj.keyPoints
          : obj.importantCommitments;
      }
      if (obj.purpose === undefined) {
        res.purpose = 'To establish terms and obligations between the parties';
      }
      const meta = obj.metadata as Record<string, unknown> | undefined;
      if (obj.parties === undefined && meta?.parties) {
        res.parties = meta.parties;
      }
      if (obj.financialTerms === undefined) res.financialTerms = [];
      if (obj.importantDates === undefined) res.importantDates = [];
      if (obj.majorRisksToReview === undefined) res.majorRisksToReview = [];
      if (obj.clausesRequiringAttention === undefined) res.clausesRequiringAttention = [];
      if (obj.suggestedQuestions === undefined) res.suggestedQuestions = [];
      if (obj.structureOverview === undefined) res.structureOverview = [];
      return res;
    }
    return val;
  },
  z.object({
    documentOverview: z.string(),
    plainLanguageSummary: z.string(),
    purpose: z.string().default(''),
    parties: z.array(z.string()).default([]),
    importantCommitments: z.array(z.string()).default([]),
    keyPoints: z.array(z.string()).default([]),
    financialTerms: z.array(z.string()).default([]),
    importantDates: z.array(z.string()).default([]),
    majorRisksToReview: z.array(z.string()).default([]),
    clausesRequiringAttention: z.array(z.string()).default([]),
    suggestedQuestions: z.array(z.string()).default([]),
    metadata: DocumentMetadataSchema,
    wordCount: z.number().optional(),
    structureOverview: z.array(
      z.object({
        section: z.string(),
        description: z.string(),
      })
    ).default([]),
  })
);
export type DocumentSummary = z.infer<typeof DocumentSummarySchema>;

// ─── Clause ──────────────────────────────────────────────────────────────────

import { normalizeClauseCategory } from './clause-classifier';

export const VALID_CLAUSE_CATEGORIES = [
  'termination',
  'liability',
  'indemnity',
  'confidentiality',
  'intellectual_property',
  'intellectual-property',
  'payment',
  'dispute_resolution',
  'dispute-resolution',
  'warranty',
  'renewal',
  'governing_law',
  'governing-law',
  'arbitration',
  'compliance',
  'employment',
  'data_protection',
  'data-protection',
  'privacy',
  'security',
  'force_majeure',
  'force-majeure',
  'non-disclosure',
  'non_disclosure',
  'assignment',
  'exclusivity',
  'service-obligations',
  'deliverables',
  'sla',
  'penalties',
  'refunds',
  'other',
] as const;

export const ClauseCategorySchema = z
  .enum(VALID_CLAUSE_CATEGORIES)
  .transform((val) => normalizeClauseCategory(val));
export type ClauseCategory = string;

export const ClauseSchema = z.object({
  id: z.string(),
  category: ClauseCategorySchema,
  title: z.string(),
  originalText: z.string(),
  plainLanguageExplanation: z.string(),
  obligations: z.array(z.string()).default([]),
  affectedParty: z.string().optional(),
  trigger: z.string().optional(),
  deadline: z.string().optional(),
  riskLevel: z.enum(['low', 'medium', 'high']).default('low'),
  sourceSection: z.string(),
  pageNumber: z.number().optional(),
});
export type Clause = z.infer<typeof ClauseSchema>;

export const ClauseExtractionResultSchema = z.object({
  clauses: z.array(ClauseSchema),
  definedTerms: z.array(z.object({
    term: z.string(),
    definition: z.string(),
  })).default([]),
});
export type ClauseExtractionResult = z.infer<typeof ClauseExtractionResultSchema>;

// ─── Risk ────────────────────────────────────────────────────────────────────

export const RiskLevelSchema = z.enum(['high-attention', 'review', 'informational']);
export type RiskLevel = z.infer<typeof RiskLevelSchema>;

export const RiskSchema = z.object({
  id: z.string(),
  level: RiskLevelSchema,
  title: z.string(),
  description: z.string(),
  whyItMatters: z.string(),
  affectedParty: z.string().optional(),
  potentialConsequence: z.string(),
  suggestedAction: z.string(),
  questionToConsider: z.string().optional(),
  clauseReference: z.string(),
  excerpt: z.string(),
  professionalReviewRecommended: z.boolean().default(false),
});
export type Risk = z.infer<typeof RiskSchema>;

export const RiskAnalysisResultSchema = z.object({
  risks: z.array(RiskSchema),
  overallAssessment: z.string(),
  highAttentionCount: z.number(),
  reviewCount: z.number(),
  informationalCount: z.number(),
});
export type RiskAnalysisResult = z.infer<typeof RiskAnalysisResultSchema>;

// ─── Obligation ──────────────────────────────────────────────────────────────

export const ObligationSchema = z.object({
  id: z.string(),
  party: z.string(),
  obligation: z.string(),
  trigger: z.string().optional(),
  deadline: z.string().optional(),
  deadlineDate: z.string().optional(), // ISO date if extractable
  condition: z.string().optional(),
  consequence: z.string().optional(),
  statusOrReviewAction: z.string().optional(),
  sourceSection: z.string(),
  excerpt: z.string(),
  pageNumber: z.number().optional(),
});
export type Obligation = z.infer<typeof ObligationSchema>;

export const ObligationExtractionResultSchema = z.object({
  obligations: z.array(ObligationSchema),
});
export type ObligationExtractionResult = z.infer<typeof ObligationExtractionResultSchema>;

// ─── Q&A ─────────────────────────────────────────────────────────────────────

export const QuestionAnswerSchema = z.object({
  question: z.string(),
  answer: z.string(),
  isGrounded: z.boolean(),
  citations: z.array(CitationSchema),
  confidence: z.number().min(0).max(1),
  uncertaintyNote: z.string().optional(),
  suggestsProfessionalReview: z.boolean().default(false),
  suggestedFollowUp: z.array(z.string()).default([]),
});
export type QuestionAnswer = z.infer<typeof QuestionAnswerSchema>;

// ─── Comparison ──────────────────────────────────────────────────────────────

export const ComparisonChangeTypeSchema = z.enum(['unchanged', 'added', 'removed', 'modified']);
export type ComparisonChangeType = z.infer<typeof ComparisonChangeTypeSchema>;

export const ClauseComparisonSchema = z.object({
  id: z.string(),
  category: ClauseCategorySchema,
  changeType: ComparisonChangeTypeSchema,
  docAText: z.string().optional(),
  docBText: z.string().optional(),
  changeSummary: z.string().optional(),
  whyItMatters: z.string().optional(),
  docASection: z.string().optional(),
  docBSection: z.string().optional(),
});
export type ClauseComparison = z.infer<typeof ClauseComparisonSchema>;

export const ComparisonResultSchema = z.object({
  docATitle: z.string(),
  docBTitle: z.string(),
  overallSummary: z.string(),
  keyDifferences: z.array(z.string()),
  clauseComparisons: z.array(ClauseComparisonSchema),
  addedCount: z.number(),
  removedCount: z.number(),
  modifiedCount: z.number(),
  unchangedCount: z.number(),
});
export type ComparisonResult = z.infer<typeof ComparisonResultSchema>;

// ─── Checklist ───────────────────────────────────────────────────────────────

export const ChecklistItemSchema = z.object({
  id: z.string(),
  category: z.string(),
  item: z.string(),
  description: z.string().optional(),
  sourceSection: z.string().optional(),
  priority: z.enum(['high', 'medium', 'low']).default('medium'),
  completed: z.boolean().default(false),
});
export type ChecklistItem = z.infer<typeof ChecklistItemSchema>;

export const ChecklistSchema = z.object({
  id: z.string(),
  type: z.enum(['before-signing', 'after-signing', 'termination', 'renewal', 'lawyer-questions']),
  title: z.string(),
  description: z.string(),
  items: z.array(ChecklistItemSchema),
  generatedAt: z.string(),
});
export type Checklist = z.infer<typeof ChecklistSchema>;

// ─── Document Review Brief ──────────────────────────────────────────────────────

export const NextStepSchema = z.object({
  category: z.string(), // e.g. 'Review', 'Clarify', 'Confirm', 'Gather information', 'Discuss with the other party', 'Ask a legal professional'
  action: z.string(),
  reason: z.string(),
  source: z.string().optional(),
});
export type NextStep = z.infer<typeof NextStepSchema>;

export const QuestionToConsiderSchema = z.object({
  category: z.string(), // e.g. 'Obligations', 'Risks', 'Payment', 'Termination', 'Liability', 'For the other party', 'For a legal professional'
  question: z.string(),
  reason: z.string(),
  source: z.string().optional(),
});
export type QuestionToConsider = z.infer<typeof QuestionToConsiderSchema>;

export const DocumentReviewBriefSchema = z.object({
  documentPurpose: z.string(),
  parties: z.array(z.string()),
  keyObligations: z.array(z.string()),
  importantDates: z.array(z.string()),
  financialCommitments: z.array(z.string()),
  majorClauses: z.array(z.string()),
  nextSteps: z.array(NextStepSchema),
  questionsToConsider: z.array(QuestionToConsiderSchema),
});
export type DocumentReviewBrief = z.infer<typeof DocumentReviewBriefSchema>;
