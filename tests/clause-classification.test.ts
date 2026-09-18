import {
  classifyClause,
  normalizeClauseCategory,
  normalizeClauseText,
  CANONICAL_CLAUSE_CATEGORIES,
  CLAUSE_CATEGORY_DEFINITIONS,
  CLAUSE_FILTER_OPTIONS,
} from '../src/lib/ai/clause-classifier';
import { extractClausesFromContent } from '../src/lib/ai/content-analyzer';
import { SAMPLE_DOCUMENTS } from '../src/lib/documents/samples';
import { chunkText } from '../src/lib/documents/chunker';
import { ClauseExtractionResultSchema } from '../src/lib/ai/schemas';

describe('Legal Clause Classification & Breakdown System', () => {
  describe('1. Exact Legal Snippet Classification for All 8 Categories', () => {
    it('correctly classifies Termination snippet', () => {
      const text = "The Company may terminate this Agreement upon thirty days' written notice.";
      const res = classifyClause(text);
      expect(res.category).toBe('termination');
      expect(res.score).toBeGreaterThanOrEqual(10);
    });

    it('correctly classifies Liability snippet', () => {
      const text = "Neither party's aggregate liability under this Agreement shall exceed the fees paid in the prior twelve months.";
      const res = classifyClause(text);
      expect(res.category).toBe('liability');
      expect(res.score).toBeGreaterThanOrEqual(10);
    });

    it('correctly classifies Indemnity snippet', () => {
      const text = 'Supplier shall indemnify and hold harmless Customer against any third-party claims.';
      const res = classifyClause(text);
      expect(res.category).toBe('indemnity');
      expect(res.score).toBeGreaterThanOrEqual(10);
    });

    it('correctly classifies Confidentiality snippet', () => {
      const text = 'Each party shall maintain the confidentiality of all Confidential Information disclosed hereunder.';
      const res = classifyClause(text);
      expect(res.category).toBe('confidentiality');
      expect(res.score).toBeGreaterThanOrEqual(10);
    });

    it('correctly classifies Intellectual Property snippet', () => {
      const text = 'All intellectual property rights in the Work Product shall remain the exclusive property of Company.';
      const res = classifyClause(text);
      expect(res.category).toBe('intellectual_property');
      expect(res.score).toBeGreaterThanOrEqual(10);
    });

    it('correctly classifies Payment snippet', () => {
      const text = 'Customer shall pay all invoices within thirty days of the invoice date.';
      const res = classifyClause(text);
      expect(res.category).toBe('payment');
      expect(res.score).toBeGreaterThanOrEqual(10);
    });

    it('correctly classifies Dispute Resolution snippet', () => {
      const text = 'Any dispute arising under this Agreement shall be resolved by binding arbitration under AAA rules.';
      const res = classifyClause(text);
      expect(res.category).toBe('dispute_resolution');
      expect(res.score).toBeGreaterThanOrEqual(10);
    });

    it('correctly classifies Warranty snippet', () => {
      const text = 'Supplier warrants that the Services will conform to the published specifications in all material respects.';
      const res = classifyClause(text);
      expect(res.category).toBe('warranty');
      expect(res.score).toBeGreaterThanOrEqual(10);
    });
  });

  describe('2. Case Differences, Punctuation & Text Normalization', () => {
    it('handles uppercase legal headings and mixed casing', () => {
      expect(classifyClause('TERMINATION FOR CONVENIENCE UPON 30 DAYS NOTICE').category).toBe('termination');
      expect(classifyClause('LIMITATION OF LIABILITY AND DAMAGES WAIVER').category).toBe('liability');
      expect(classifyClause('DEFEND, INDEMNIFY, AND HOLD HARMLESS').category).toBe('indemnity');
      expect(classifyClause('PROPRIETARY AND CONFIDENTIAL INFORMATION').category).toBe('confidentiality');
      expect(classifyClause('INTELLECTUAL PROPERTY RIGHTS AND OWNERSHIP').category).toBe('intellectual_property');
      expect(classifyClause('FEES, PAYMENT TERMS, AND TAXES').category).toBe('payment');
      expect(classifyClause('GOVERNING LAW AND DISPUTE RESOLUTION').category).toBe('dispute_resolution');
      expect(classifyClause('WARRANTIES AND DISCLAIMERS OF MERCHANTABILITY').category).toBe('warranty');
    });

    it('normalizes smart quotes, dashes, and extraneous whitespace', () => {
      const norm = normalizeClauseText('“Party’s   Liability—Cap  Under  Section 9”');
      expect(norm).toBe('"party\'s liability cap under section 9"');
    });
  });

  describe('3. Singular & Plural Forms and Synonyms', () => {
    it('detects warranty / warranties / warranted / warrant', () => {
      expect(classifyClause('Vendor warrants that the platform will operate without defect.').category).toBe('warranty');
      expect(classifyClause('All express or implied warranties are hereby disclaimed.').category).toBe('warranty');
    });

    it('detects dispute / disputes / arbitration / mediation', () => {
      expect(classifyClause('Any disputes shall be submitted to mediation prior to litigation.').category).toBe('dispute_resolution');
      expect(classifyClause('The courts of San Francisco shall have exclusive jurisdiction.').category).toBe('dispute_resolution');
    });

    it('detects fee / fees / invoice / invoices / payment terms', () => {
      expect(classifyClause('Customer shall pay an annual fee of $48,000.').category).toBe('payment');
      expect(classifyClause('Monthly base rent of $14,000 shall be paid in advance.').category).toBe('payment');
    });
  });

  describe('4. False-Positive Suppression & Complex Legal Language', () => {
    it('suppresses false positive when confidentiality/indemnity is cited as an exception to liability cap', () => {
      const clauseText =
        'Except for gross negligence, willful misconduct, or breaches of Section 6 (Confidentiality) and Section 8 (Indemnification), neither party aggregate liability under this Agreement shall exceed the fees paid in the prior six months.';
      const res = classifyClause(clauseText, '9. Limitation of Liability');
      expect(res.category).toBe('liability');
    });

    it('correctly classifies IP Indemnification as Indemnity rather than generic IP ownership', () => {
      const clauseText =
        'Vendor shall defend, indemnify, and hold harmless Customer against any third-party claim alleging that the Service infringes a United States patent or copyright.';
      const res = classifyClause(clauseText, '8. Indemnification');
      expect(res.category).toBe('indemnity');
    });
  });

  describe('5. Gemini Category Normalization & Aliases', () => {
    it('normalizes various AI and legacy alias strings to canonical categories', () => {
      expect(normalizeClauseCategory('IP')).toBe('intellectual_property');
      expect(normalizeClauseCategory('IP Rights')).toBe('intellectual_property');
      expect(normalizeClauseCategory('intellectual-property')).toBe('intellectual_property');
      expect(normalizeClauseCategory('Intellectual Property Rights')).toBe('intellectual_property');
      expect(normalizeClauseCategory('dispute-resolution')).toBe('dispute_resolution');
      expect(normalizeClauseCategory('arbitration')).toBe('dispute_resolution');
      expect(normalizeClauseCategory('governing-law')).toBe('dispute_resolution');
      expect(normalizeClauseCategory('governing_law')).toBe('dispute_resolution');
      expect(normalizeClauseCategory('non-disclosure')).toBe('confidentiality');
      expect(normalizeClauseCategory('NDA')).toBe('confidentiality');
      expect(normalizeClauseCategory('limitation of liability')).toBe('liability');
      expect(normalizeClauseCategory('indemnification')).toBe('indemnity');
      expect(normalizeClauseCategory('warranties')).toBe('warranty');
      expect(normalizeClauseCategory('invoicing')).toBe('payment');
    });

    it('preserves domain categories like employment and compliance for backward compatibility', () => {
      expect(normalizeClauseCategory('employment')).toBe('employment');
      expect(normalizeClauseCategory('compliance')).toBe('compliance');
      expect(normalizeClauseCategory('renewal')).toBe('renewal');
    });
  });

  describe('6. Canonical Vocabulary & UI Filter Options', () => {
    it('provides all 8 canonical categories in CLAUSE_FILTER_OPTIONS', () => {
      const ids = CLAUSE_FILTER_OPTIONS.map((f) => f.id);
      expect(ids).toContain('all');
      for (const cat of CANONICAL_CLAUSE_CATEGORIES) {
        expect(ids).toContain(cat);
      }
      expect(CLAUSE_FILTER_OPTIONS.length).toBe(9); // All + 8 canonical
    });

    it('contains clear human-readable labels without formatting artifacts', () => {
      for (const opt of CLAUSE_FILTER_OPTIONS) {
        expect(opt.label).toBeDefined();
        expect(opt.label.length).toBeGreaterThan(1);
        expect(opt.label).not.toContain('-');
        expect(opt.label).not.toContain('_');
      }
    });

    it('has full metadata definitions for all canonical categories', () => {
      for (const cat of CANONICAL_CLAUSE_CATEGORIES) {
        const def = CLAUSE_CATEGORY_DEFINITIONS[cat];
        expect(def).toBeDefined();
        expect(def.label).toBeDefined();
        expect(def.description).toBeDefined();
      }
    });
  });

  describe('7. End-to-End Extraction with Sample Contracts', () => {
    it('extracts all primary legal clauses from the Enterprise SaaS Agreement', () => {
      const saasDoc = SAMPLE_DOCUMENTS.find((d) => d.id === 'sample-saas-msa')!;
      expect(saasDoc).toBeDefined();

      const chunks = chunkText(saasDoc.content);
      const result = extractClausesFromContent(chunks);

      const parsed = ClauseExtractionResultSchema.safeParse(result);
      expect(parsed.success).toBe(true);

      const categories = result.clauses.map((c) => normalizeClauseCategory(c.category));

      // Must detect all key categories in the SaaS Agreement
      expect(categories).toContain('payment');
      expect(categories).toContain('termination');
      expect(categories).toContain('intellectual_property');
      expect(categories).toContain('confidentiality');
      expect(categories).toContain('warranty');
      expect(categories).toContain('indemnity');
      expect(categories).toContain('liability');
      expect(categories).toContain('dispute_resolution');
    });

    it('extracts confidentiality, IP, and dispute clauses from Mutual NDA', () => {
      const ndaDoc = SAMPLE_DOCUMENTS.find((d) => d.id === 'sample-mutual-nda')!;
      expect(ndaDoc).toBeDefined();

      const chunks = chunkText(ndaDoc.content);
      const result = extractClausesFromContent(chunks);

      const categories = result.clauses.map((c) => normalizeClauseCategory(c.category));

      expect(categories).toContain('confidentiality');
      expect(categories).toContain('termination');
      expect(categories).toContain('intellectual_property');
      expect(categories).toContain('dispute_resolution');
    });

    it('extracts rent/payment, indemnity, and default clauses from Commercial Lease', () => {
      const leaseDoc = SAMPLE_DOCUMENTS.find((d) => d.id === 'sample-commercial-lease')!;
      expect(leaseDoc).toBeDefined();

      const chunks = chunkText(leaseDoc.content);
      const result = extractClausesFromContent(chunks);

      const categories = result.clauses.map((c) => normalizeClauseCategory(c.category));

      expect(categories).toContain('payment');
      expect(categories).toContain('indemnity');
      expect(categories).toContain('dispute_resolution');
    });
  });
});
