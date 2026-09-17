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

export const DocumentSummarySchema = z.object({
  plainLanguageSummary: z.string(),
  keyPoints: z.array(z.string()),
  metadata: DocumentMetadataSchema,
  wordCount: z.number().optional(),
  structureOverview: z.array(z.object({
    section: z.string(),
    description: z.string(),
  })).default([]),
});
export type DocumentSummary = z.infer<typeof DocumentSummarySchema>;

// ─── Clause ──────────────────────────────────────────────────────────────────

export const ClauseCategorySchema = z.enum([
  'payment', 'termination', 'renewal', 'confidentiality', 'non-disclosure',
  'non-compete', 'intellectual-property', 'liability', 'indemnity', 'warranty',
  'dispute-resolution', 'arbitration', 'governing-law', 'data-protection',
  'privacy', 'security', 'force-majeure', 'assignment', 'exclusivity',
  'employment', 'service-obligations', 'deliverables', 'sla', 'penalties',
  'refunds', 'compliance', 'other',
]);
export type ClauseCategory = z.infer<typeof ClauseCategorySchema>;

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

// ─── Lawyer Preparation ──────────────────────────────────────────────────────

export const LawyerPrepSchema = z.object({
  documentSummary: z.string(),
  keyClauses: z.array(z.string()),
  areasForReview: z.array(z.string()),
  importantDates: z.array(z.object({
    date: z.string(),
    description: z.string(),
  })),
  keyObligations: z.array(z.string()),
  questionsForLawyer: z.array(z.string()),
  unclearClauses: z.array(z.string()),
  missingInformation: z.array(z.string()),
});
export type LawyerPrep = z.infer<typeof LawyerPrepSchema>;
