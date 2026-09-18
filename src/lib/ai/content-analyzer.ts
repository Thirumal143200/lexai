/**
 * Deterministic Legal Content Analyzer for Offline Demo Mode.
 *
 * Extracts and synthesizes genuine, document-derived legal insights from
 * the actual text and chunks of uploaded documents without external API calls.
 * Ensures that different documents yield distinctly different, accurate analyses.
 */

import { randomUUID } from 'crypto';
import type { DocumentChunk } from './provider';
import type {
  DocumentSummary,
  ClauseExtractionResult,
  RiskAnalysisResult,
  ObligationExtractionResult,
  QuestionAnswer,
  ComparisonResult,
  Checklist,
  DocumentReviewBrief,
  Clause,
  Risk,
  Obligation,
  ClauseCategory,
  ChecklistItem,
} from './schemas';
import {
  classifyClause,
  normalizeClauseCategory,
  CLAUSE_CATEGORY_DEFINITIONS,
  CanonicalClauseCategory,
} from './clause-classifier';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function cleanText(text: string): string {
  return text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
}

function stemWord(word: string): string {
  const w = word.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (w.length <= 2) return w;
  if (w.endsWith('ies')) return w.slice(0, -3) + 'y';
  if (w.endsWith('es') && !w.endsWith('ees')) return w.slice(0, -2);
  if (w.endsWith('s') && !w.endsWith('ss')) return w.slice(0, -1);
  if (w.endsWith('ing') && w.length > 4) return w.slice(0, -3);
  if (w.endsWith('ed') && w.length > 3) return w.slice(0, -2);
  return w;
}

function getSentences(text: string): string[] {
  const normalized = cleanText(text);
  const parts = normalized
    .split(/(?<=[.?!;])\s+|\n+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 8);
  return parts.length > 0 ? parts : [normalized];
}

// ─── Metadata & Type Detection ───────────────────────────────────────────────

export function detectDocumentType(text: string, titleHint?: string): string {
  const combined = `${titleHint ?? ''} ${text.slice(0, 3000)}`.toLowerCase();

  if (/\b(lease|tenant|premises|landlord)\b/i.test(combined)) {
    return 'Commercial Lease Agreement';
  }
  if (/\b(employment|employee|salary|probation|job title|annual compensation)\b/i.test(combined)) {
    return 'Employment Agreement';
  }
  if (/\b(non-disclosure|confidentiality agreement|mutual nda|\bnda\b)\b/i.test(combined)) {
    return 'Mutual Non-Disclosure Agreement (NDA)';
  }
  if (combined.includes('software as a service') || combined.includes('saas') || combined.includes('subscription grant')) {
    return 'SaaS Subscription Agreement';
  }
  if (combined.includes('consulting') || combined.includes('contractor') || combined.includes('statement of work') || combined.includes('services agreement')) {
    return 'Professional Services Agreement';
  }
  if (combined.includes('license agreement') || combined.includes('licensor') || combined.includes('intellectual property')) {
    return 'Software License Agreement';
  }
  if (combined.includes('privacy policy') || combined.includes('personal data') || combined.includes('cookies')) {
    return 'Privacy Policy';
  }
  return 'Commercial Contract';
}

export function detectParties(text: string): string[] {
  const parties: string[] = [];
  const topText = text.slice(0, 2500);

  // Pattern 1: between X ("...") and Y ("...")
  const betweenMatch = topText.match(/between\s+([A-Z0-9][A-Za-z0-9\s,.'&-]+?)(?:,\s*(?:a|an)\s+[A-Za-z\s]+)?\s+(?:\([^\)]+\)\s+)?and\s+([A-Z0-9][A-Za-z0-9\s,.'&-]+?)(?:,\s*(?:a|an)\s+[A-Za-z\s]+)?(?:\s*\(|\.|\;|\n)/i);
  if (betweenMatch) {
    const p1 = betweenMatch[1].replace(/^(a|an|the)\s+/i, '').trim();
    const p2 = betweenMatch[2].replace(/^(a|an|the)\s+/i, '').trim();
    if (p1.length > 2 && p1.length < 60) parties.push(p1);
    if (p2.length > 2 && p2.length < 60) parties.push(p2);
  }

  // Pattern 2: Explicit role designations
  if (parties.length < 2) {
    const roles = [
      { name: 'Employer', re: /(?:Employer|Company):\s*([A-Z0-9][A-Za-z0-9\s,.'&-]+)/i },
      { name: 'Employee', re: /(?:Employee):\s*([A-Z0-9][A-Za-z0-9\s,.'&-]+)/i },
      { name: 'Landlord', re: /(?:Landlord):\s*([A-Z0-9][A-Za-z0-9\s,.'&-]+)/i },
      { name: 'Tenant', re: /(?:Tenant):\s*([A-Z0-9][A-Za-z0-9\s,.'&-]+)/i },
      { name: 'Provider', re: /(?:Provider|Vendor):\s*([A-Z0-9][A-Za-z0-9\s,.'&-]+)/i },
      { name: 'Customer', re: /(?:Customer|Client):\s*([A-Z0-9][A-Za-z0-9\s,.'&-]+)/i },
    ];
    for (const r of roles) {
      const m = topText.match(r.re);
      if (m && m[1] && m[1].trim().length > 2 && !parties.includes(m[1].trim())) {
        parties.push(m[1].trim());
      }
    }
  }

  return parties.slice(0, 4);
}

export function detectDates(text: string): { effectiveDate?: string; expiryDate?: string } {
  const topText = text.slice(0, 3000);
  let effectiveDate: string | undefined;
  let expiryDate: string | undefined;

  const effMatch = topText.match(/(?:effective\s+(?:date|as of)?|dated|entered into as of)\s*:?\s*([A-Za-z]+\s+\d{1,2},?\s+\d{4}|\d{1,2}[/-]\d{1,2}[/-]\d{2,4})/i);
  if (effMatch) effectiveDate = effMatch[1].trim();

  const expMatch = text.match(/(?:expir(?:ing|es|ation)|term\s+ends|termination\s+date)\s*(?:on|as of)?\s*:?\s*([A-Za-z]+\s+\d{1,2},?\s+\d{4}|\d{1,2}[/-]\d{1,2}[/-]\d{2,4})/i);
  if (expMatch) expiryDate = expMatch[1].trim();

  return { effectiveDate, expiryDate };
}

export function detectGoverningLaw(text: string): { governingLaw?: string; jurisdiction?: string } {
  let governingLaw: string | undefined;
  let jurisdiction: string | undefined;

  const lawMatch = text.match(/(?:governed by|construed in accordance with)(?: the laws of)?\s+(?:the State of\s+)?([A-Za-z\s]+?)(?:,|\.|\;|\n|without)/i);
  if (lawMatch) {
    const raw = lawMatch[1].trim();
    if (raw.length > 2 && raw.length < 50) governingLaw = raw;
  }

  const jurMatch = text.match(/(?:exclusive jurisdiction|venue|courts of|sitting in)\s+(?:located in\s+)?([A-Za-z\s,]+?)(?:\.|\;|\n)/i);
  if (jurMatch) {
    const raw = jurMatch[1].trim();
    if (raw.length > 3 && raw.length < 60) jurisdiction = raw;
  }

  return { governingLaw, jurisdiction };
}

// ─── Summary Generation ──────────────────────────────────────────────────────

export function analyzeSummary(chunks: DocumentChunk[], fullText: string): DocumentSummary {
  const text = fullText.length > 0 ? fullText : chunks.map((c) => c.text).join('\n');
  const docType = detectDocumentType(text);
  const parties = detectParties(text);
  const { effectiveDate, expiryDate } = detectDates(text);
  const { governingLaw, jurisdiction } = detectGoverningLaw(text);

  // Extract distinct sections from chunks or text
  const structureOverview: { section: string; description: string }[] = [];
  for (const chunk of chunks) {
    if (chunk.sectionTitle && !structureOverview.some((s) => s.section === chunk.sectionTitle)) {
      const firstSentence = getSentences(chunk.text)[0] || 'Detailed contractual provisions and obligations.';
      const truncated = firstSentence.length > 120 ? `${firstSentence.slice(0, 117)}...` : firstSentence;
      structureOverview.push({
        section: chunk.sectionTitle,
        description: truncated,
      });
    }
  }

  // Fallback section parsing if chunks didn't extract section headings
  if (structureOverview.length === 0) {
    const sectionLines = text.match(/^(?:(?:\d+\.|\b[IVXLCDM]+\.)\s+[A-Z\s]{3,}|[A-Z\s]{5,}:)/gm) || [];
    for (const s of sectionLines.slice(0, 8)) {
      const clean = s.trim().replace(/:$/, '');
      structureOverview.push({
        section: clean,
        description: `Covers terms and specifications for ${clean.toLowerCase()}.`,
      });
    }
  }

  const wordCount = text.trim().split(/\s+/).filter(Boolean).length;
  const partyNames = parties.length >= 2 ? `${parties[0]} and ${parties[1]}` : 'the contracting parties';

  // Construct key points based on real topics found
  const keyPoints: string[] = [];
  keyPoints.push(`Agreement classified as a ${docType} between ${partyNames}.`);
  if (effectiveDate) keyPoints.push(`Effective Date specified as ${effectiveDate}${expiryDate ? ` expiring on ${expiryDate}` : ''}.`);

  // Detect monetary amounts
  const moneyMatches = text.match(/\$[\d,]+(?:\.\d{2})?(?:\s*(?:per month|annually|in advance|fee|deposit|rent))?/gi);
  if (moneyMatches && moneyMatches.length > 0) {
    keyPoints.push(`Financial consideration includes: ${moneyMatches.slice(0, 2).join(' and ')}.`);
  }

  // Detect termination / notice
  const noticeMatch = text.match(/(?:terminate|cancellation|notice of non-renewal)[^.;]{0,60}(\d+\s*(?:days|business days|months)[^.;]{0,40})/i);
  if (noticeMatch) {
    keyPoints.push(`Notice and termination conditions require ${noticeMatch[1].trim()}.`);
  }

  // Detect confidentiality / restrictions
  if (text.toLowerCase().includes('confidential')) {
    keyPoints.push('Contains explicit non-disclosure and confidentiality obligations protecting proprietary information.');
  }

  if (governingLaw) {
    keyPoints.push(`Governed by the laws of ${governingLaw}${jurisdiction ? ` with venue in ${jurisdiction}` : ''}.`);
  }

  const plainLanguageSummary = `This document is an executed or drafted ${docType} between ${partyNames}. ` +
    `It formally establishes the legal and commercial terms governing their relationship, including ${structureOverview.slice(0, 4).map((s) => s.section.toLowerCase()).join(', ')}. ` +
    `Key obligations, payment structures, default triggers, and dispute mechanisms are defined across ${chunks.length} structured sections.`;

  return {
    documentOverview: plainLanguageSummary,
    plainLanguageSummary,
    purpose: `To formally establish the legal and commercial terms for ${docType.toLowerCase()}`,
    parties,
    importantCommitments: keyPoints.slice(0, 3),
    keyPoints,
    financialTerms: moneyMatches ? moneyMatches.slice(0, 3) : ['No explicit financial terms detected'],
    importantDates: [
      effectiveDate ? `Effective Date: ${effectiveDate}` : null,
      expiryDate ? `Expiry Date: ${expiryDate}` : null
    ].filter((d): d is string => d !== null),
    majorRisksToReview: ['Verify indemnification and liability caps', 'Confirm termination notice periods'],
    clausesRequiringAttention: structureOverview.slice(0, 3).map(s => s.section),
    suggestedQuestions: ['What are the termination conditions?', 'Are there any hidden fees?'],
    metadata: {
      title: structureOverview[0]?.section ?? `${docType}`,
      parties,
      documentType: docType,
      effectiveDate,
      expiryDate,
      governingLaw,
      jurisdiction,
      language: 'English',
    },
    wordCount,
    structureOverview,
  };
}

// ─── Clause Extraction ───────────────────────────────────────────────────────

const CATEGORY_EXPLANATIONS: Record<string, (party: string) => string> = {
  termination: () =>
    'Governs how and when either party can end the contract, notice windows, termination for cause/convenience, and default remedies.',
  liability: () =>
    'Caps maximum financial damages that can be recovered and waives consequential, special, or indirect damages.',
  indemnity: (party) =>
    `Transfers third-party legal defense obligations and financial loss from claims to ${party}.`,
  confidentiality: () =>
    'Requires the receiving party to protect proprietary information and restricts unauthorized disclosure or competitive use.',
  intellectual_property: () =>
    'Clarifies ownership of preexisting technology, data, work product developed under the agreement, and license grants.',
  payment: (party) =>
    `Defines the financial schedule, invoicing dates, late penalties, and payment amounts binding ${party}.`,
  dispute_resolution: () =>
    'Specifies the binding dispute mechanism (arbitration or litigation), applicable governing law, and exclusive venue.',
  warranty: () =>
    'Establishes performance standards, express warranties, and disclaimers of implied warranties like merchantability.',
  renewal: () =>
    'Specifies contract duration, automatic renewal mechanics, and advance non-renewal notice requirements.',
  compliance: () =>
    'Allocates operational maintenance duties, inspection rights, and permitted property or service use.',
  employment: () =>
    'Specifies professional duties, compensation structures, reporting lines, and restrictive covenants.',
  other: () =>
    'Establishes contractual rights and administrative terms governing the parties.',
};

const DEFAULT_CATEGORY_RISK: Record<string, 'low' | 'medium' | 'high'> = {
  termination: 'high',
  liability: 'high',
  indemnity: 'high',
  confidentiality: 'medium',
  intellectual_property: 'medium',
  payment: 'low',
  dispute_resolution: 'low',
  warranty: 'medium',
  renewal: 'medium',
  compliance: 'medium',
  employment: 'low',
  other: 'low',
};

export function extractClausesFromContent(chunks: DocumentChunk[]): ClauseExtractionResult {
  const clauses: Clause[] = [];
  const seenClauseKeys = new Set<string>();
  const sectionCatCounts = new Map<string, number>();

  for (const chunk of chunks) {
    const chunkText = chunk.text;
    const sectionTitle = chunk.sectionTitle || `Section ${chunk.chunkIndex + 1}`;

    // Split chunk into paragraphs / distinct clauses
    const paragraphs = chunkText
      .split(/\n\s*\n|\n(?=\d+\.[\d.]*\s+[A-Z])/)
      .map((p) => p.trim())
      .filter((p) => p.length > 25);

    const blocksToInspect = paragraphs.length > 0 ? paragraphs : [chunkText];

    for (const block of blocksToInspect) {
      // Check for paragraph-level heading, e.g. "5.1 Proprietary Rights." or "3.2 Late Charges."
      const headingMatch = block.match(/^(\d+\.[\d.]*\s+[^.\n:]+[:.])/);
      const blockHeading = headingMatch ? headingMatch[1].trim() : undefined;
      const combinedHeading = blockHeading ? `${sectionTitle} - ${blockHeading}` : sectionTitle;

      const classification = classifyClause(block, combinedHeading);

      if (classification.score >= 5 && classification.category !== 'other') {
        const category = classification.category;
        const normCat = normalizeClauseCategory(category);

        // Cap at 2 clauses of the exact same category per section to prevent starvation of later sections
        const secCatKey = `${normCat}::${sectionTitle}`;
        const count = sectionCatCounts.get(secCatKey) || 0;
        if (count >= 2) continue;

        // Deduplication key per category and section/block
        const key = `${normCat}-${sectionTitle}-${blockHeading || block.slice(0, 40).toLowerCase()}`;
        if (seenClauseKeys.has(key)) continue;
        seenClauseKeys.add(key);
        sectionCatCounts.set(secCatKey, count + 1);

        const sentences = getSentences(block);

        // Select the most representative sentence for this clause
        const matchingSentence =
          sentences.find(
            (s) =>
              /\$[\d,]+|\bbase salary\b|\bbase rent\b|\bannual fee\b|\bmonthly\b|\bshall pay\b/i.test(s) &&
              s.length > 25
          ) ||
          sentences.find((s) => classifyClause(s, sectionTitle).category === category && s.length > 30) ||
          sentences.find((s) => /\b(?:shall|must|agrees to|warrants|indemnif|terminat|liab)\b/i.test(s) && s.length > 25) ||
          sentences[0] ||
          block.slice(0, 250);

        // Extract obligations
        const obligations: string[] = [];
        const obMatches = block.matchAll(/\b(?:shall|must|agrees to|will)\s+([^,.;]+(?:within|to|by|against)?[^,.;]*)/gi);
        for (const m of obMatches) {
          if (m[1] && obligations.length < 3) {
            obligations.push(m[1].trim());
          }
        }

        // Extract deadlines
        const deadlineMatch = block.match(
          /\b(?:within|by|on or before|prior to)\s+([^,.;]+(?:days?|months?|hours?|date|advance|term))/i
        );

        // Determine affected party
        const affectedParty = block.includes('Tenant')
          ? 'Tenant'
          : block.includes('Landlord')
          ? 'Landlord'
          : block.includes('Provider') || block.includes('Vendor')
          ? 'Provider / Vendor'
          : block.includes('Customer') || block.includes('Subscriber')
          ? 'Customer / Subscriber'
          : block.includes('Employee')
          ? 'Employee'
          : 'All Contracting Parties';

        // Assess risk level
        let riskLevel = DEFAULT_CATEGORY_RISK[normCat] || 'low';
        if (
          /\b(in no event shall|sole and exclusive|unilateral|accelerated|accrue interest|waives all rights|indemnif.*against all claims)\b/i.test(
            block
          )
        ) {
          riskLevel = 'high';
        }

        const categoryLabel =
          CLAUSE_CATEGORY_DEFINITIONS[normCat as CanonicalClauseCategory]?.label ||
          normCat.replace(/[-_]/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());

        const displayTitle = blockHeading
          ? `${sectionTitle} — ${blockHeading.replace(/[:.]/g, '').trim()}`
          : `${sectionTitle}: ${categoryLabel}`;

        const explanationFn = CATEGORY_EXPLANATIONS[normCat] || CATEGORY_EXPLANATIONS.other;

        clauses.push({
          id: `clause-${clauses.length + 1}`,
          category: normCat,
          title: displayTitle,
          originalText: matchingSentence.trim(),
          plainLanguageExplanation: explanationFn(affectedParty),
          obligations: obligations.length > 0 ? obligations : [`Comply with terms specified in ${sectionTitle}`],
          affectedParty,
          trigger: block.includes('upon') ? 'Occurrence of designated triggering event' : undefined,
          deadline: deadlineMatch ? deadlineMatch[1].trim() : undefined,
          riskLevel,
          sourceSection: sectionTitle,
          pageNumber: chunk.pageNumber,
        });
      }
    }

    // Ensure section-level category is represented if not already added
    const chunkClassification = classifyClause(chunkText, sectionTitle);
    if (chunkClassification.score >= 10 && chunkClassification.category !== 'other') {
      const normCat = normalizeClauseCategory(chunkClassification.category);
      const sectionKey = `${normCat}-${sectionTitle}`;
      if (!clauses.some((c) => normalizeClauseCategory(c.category) === normCat && c.sourceSection === sectionTitle)) {
        seenClauseKeys.add(sectionKey);
        const sentences = getSentences(chunkText);
        const matchingSentence =
          sentences.find((s) => classifyClause(s, sectionTitle).category === normCat && s.length > 25) ||
          sentences[0] ||
          chunkText.slice(0, 250);

        const categoryLabel =
          CLAUSE_CATEGORY_DEFINITIONS[normCat as CanonicalClauseCategory]?.label ||
          normCat.replace(/[-_]/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());

        const explanationFn = CATEGORY_EXPLANATIONS[normCat] || CATEGORY_EXPLANATIONS.other;

        clauses.push({
          id: `clause-${clauses.length + 1}`,
          category: normCat,
          title: `${sectionTitle}: ${categoryLabel}`,
          originalText: matchingSentence.trim(),
          plainLanguageExplanation: explanationFn('All Contracting Parties'),
          obligations: [`Comply with terms specified in ${sectionTitle}`],
          affectedParty: 'All Contracting Parties',
          riskLevel: DEFAULT_CATEGORY_RISK[normCat] || 'low',
          sourceSection: sectionTitle,
          pageNumber: chunk.pageNumber,
        });
      }
    }
  }

  // Fallback: If no clauses were extracted (unusual formatting), scan whole chunk text
  if (clauses.length === 0) {
    for (const chunk of chunks) {
      const classification = classifyClause(chunk.text, chunk.sectionTitle);
      if (classification.score >= 5) {
        const normCat = normalizeClauseCategory(classification.category);
        const sectionTitle = chunk.sectionTitle || `Section ${chunk.chunkIndex + 1}`;
        const sentences = getSentences(chunk.text);
        const sentence = sentences[0] || chunk.text.slice(0, 200);

        clauses.push({
          id: `clause-${clauses.length + 1}`,
          category: normCat,
          title: `${sectionTitle}: ${normCat.toUpperCase()}`,
          originalText: sentence,
          plainLanguageExplanation: `Provisions governing ${normCat.replace(/_/g, ' ')} under ${sectionTitle}.`,
          obligations: [`Comply with obligations in ${sectionTitle}`],
          affectedParty: 'All Parties',
          riskLevel: DEFAULT_CATEGORY_RISK[normCat] || 'low',
          sourceSection: sectionTitle,
          pageNumber: chunk.pageNumber,
        });
      }
    }
  }

  // Extract defined terms: "Term" means ...
  const fullText = chunks.map((c) => c.text).join('\n');
  const definedTerms: { term: string; definition: string }[] = [];
  const termMatches = fullText.matchAll(/["“]([A-Za-z\s]{3,30})["”]\s+(?:means|shall mean|refers to)\s+([^.\n]{15,150})/gi);
  for (const match of termMatches) {
    if (definedTerms.length < 8 && !definedTerms.some((t) => t.term === match[1])) {
      definedTerms.push({
        term: match[1].trim(),
        definition: match[2].trim(),
      });
    }
  }

  return {
    clauses: clauses.slice(0, 40),
    definedTerms,
  };
}

// ─── Risk Analysis ───────────────────────────────────────────────────────────

interface RiskRule {
  pattern: RegExp;
  level: 'high-attention' | 'review' | 'informational';
  title: string;
  whyItMatters: string;
  consequence: string;
  action: string;
}

const RISK_RULES: RiskRule[] = [
  {
    pattern: /unilateral modification|modify the features|modify (?:at any time|without prior notice)/i,
    level: 'high-attention',
    title: 'Unilateral Modification Rights',
    whyItMatters: 'One party can alter services or terms without requiring affirmative mutual agreement.',
    consequence: 'Unexpected changes to specifications, pricing, or terms during the active term.',
    action: 'Negotiate mutual written consent for material contract amendments.',
  },
  {
    pattern: /holding over|200%|accelerated balance|accelerat/i,
    level: 'high-attention',
    title: 'Liquidated Damages or Holdover Rent Multiplier',
    whyItMatters: 'Imposes severe punitive financial multipliers (e.g. 200% rent) if deadlines are missed.',
    consequence: 'Substantial immediate debt and potential default proceedings upon lease expiration.',
    action: 'Cap holdover rent at a lower percentage (e.g., 125%) and clarify move-out notice provisions.',
  },
  {
    pattern: /waives all rights under any statute|waive[s]?\s+any right to/i,
    level: 'high-attention',
    title: 'Statutory Right Waiver',
    whyItMatters: 'Surrenders statutory legal protections that would otherwise safeguard against landlord/vendor breach.',
    consequence: 'Inability to deduct necessary emergency repair expenses or assert statutory defenses.',
    action: 'Have a licensed attorney review whether statutory waivers are enforceable and strike if possible.',
  },
  {
    pattern: /limited to the actual fees paid.*in the (?:three|3|six|6)\s+months/i,
    level: 'high-attention',
    title: 'Abnormally Restrictive Liability Cap',
    whyItMatters: 'Limits vendor liability to only 3-6 months of fees, shifting significant operational risk to customer.',
    consequence: 'Gross damages from data loss, downtime, or security breach cannot be financially recovered.',
    action: 'Seek a 12-month trailing fee liability cap or specific super-caps for IP and data breach.',
  },
  {
    pattern: /automatically renew|automatic renewal/i,
    level: 'review',
    title: 'Automatic Renewal Provision',
    whyItMatters: 'The contract will roll over into a subsequent multi-month/year term without proactive cancellation.',
    consequence: 'Accidental long-term financial commitment if notice windows are missed.',
    action: 'Set calendar reminders 90 days before expiration to evaluate whether to renew or cancel.',
  },
  {
    pattern: /indemnif.*from all claims|hold harmless.*all claims/i,
    level: 'review',
    title: 'Broad Indemnification Burden',
    whyItMatters: 'Requires covering legal defense costs and third-party liabilities generated around the agreement.',
    consequence: 'Exposure to external litigation expenses that could exceed the contract value.',
    action: 'Ensure indemnification is reciprocal and tied strictly to direct gross negligence or breach.',
  },
  {
    pattern: /train artificial intelligence|de-identify.*data/i,
    level: 'review',
    title: 'Customer Data Utilization for Model Training',
    whyItMatters: 'Vendor reserves right to train internal machine learning models using aggregated data.',
    consequence: 'Corporate or user data may be processed into algorithmic outputs without opt-out.',
    action: 'Confirm whether data anonymization satisfies internal compliance and data protection policies.',
  },
  {
    pattern: /unpaid\s+(?:\w+|\d+)\s*(?:\(\d+\)\s*)?days|cure.*within\s+(?:\w+|\d+)\s*(?:\(\d+\)\s*)?days/i,
    level: 'review',
    title: 'Short Cure Period for Monetary Default',
    whyItMatters: 'A very short notice window to cure missed payments before default remedies are triggered.',
    consequence: 'Administrative or banking delays could quickly put the party into formal legal default.',
    action: 'Request at least a 10 to 15 business day cure notice period.',
  },
];

export function analyzeRisksFromContent(chunks: DocumentChunk[], summary: DocumentSummary): RiskAnalysisResult {
  const risks: Risk[] = [];
  const fullText = chunks.map((c) => c.text).join('\n');

  for (const rule of RISK_RULES) {
    for (const chunk of chunks) {
      if (rule.pattern.test(chunk.text)) {
        const sentences = getSentences(chunk.text);
        const excerpt = sentences.find((s) => rule.pattern.test(s) && s.length > 30)
          || sentences.find((s) => rule.pattern.test(s))
          || chunk.text.slice(0, 220);
        const section = chunk.sectionTitle || `Section ${chunk.chunkIndex + 1}`;

        if (!risks.some((r) => r.title === rule.title)) {
          risks.push({
            id: `risk-${risks.length + 1}`,
            level: rule.level,
            title: rule.title,
            description: `${rule.title} detected in ${section}: "${excerpt.slice(0, 140)}..."`,
            whyItMatters: rule.whyItMatters,
            affectedParty: summary.metadata.parties[1] || 'Obligated Party',
            potentialConsequence: rule.consequence,
            suggestedAction: rule.action,
            questionToConsider: `Can we clarify or negotiate the terms around ${rule.title.toLowerCase()}?`,
            clauseReference: section,
            excerpt,
            professionalReviewRecommended: rule.level === 'high-attention',
          });
        }
      }
    }
  }

  // If no high-risk patterns matched, add informational baseline
  if (risks.length === 0) {
    risks.push({
      id: 'risk-1',
      level: 'informational',
      title: 'Standard Commercial Terms Detected',
      description: 'The document appears to utilize standard commercial provisions without aggressive outlier penalties.',
      whyItMatters: 'Standard terms reduce negotiation complexity but still impose binding commitments.',
      affectedParty: 'Both parties',
      potentialConsequence: 'Normal commercial contractual performance obligations.',
      suggestedAction: 'Verify operational capability to meet all listed deadlines and deliverables.',
      questionToConsider: 'Are there any operational concerns with meeting these standard terms?',
      clauseReference: summary.clausesRequiringAttention?.[0] || 'General Provisions',
      excerpt: fullText.slice(0, 180),
      professionalReviewRecommended: false,
    });
  }

  const highAttentionCount = risks.filter((r) => r.level === 'high-attention').length;
  const reviewCount = risks.filter((r) => r.level === 'review').length;
  const informationalCount = risks.filter((r) => r.level === 'informational').length;

  const overallAssessment = highAttentionCount > 0
    ? `Identified ${highAttentionCount} high-attention clause(s) that shift significant risk, including ${risks.filter((r) => r.level === 'high-attention').map((r) => r.title).join(', ')}. Professional legal review is strongly recommended before signing.`
    : `The document presents a standard commercial risk profile with ${reviewCount} item(s) to verify prior to execution.`;

  return {
    risks,
    overallAssessment,
    highAttentionCount,
    reviewCount,
    informationalCount,
  };
}

// ─── Obligations Extraction ──────────────────────────────────────────────────

export function extractObligationsFromContent(chunks: DocumentChunk[]): ObligationExtractionResult {
  const obligations: Obligation[] = [];

  for (const chunk of chunks) {
    const sentences = getSentences(chunk.text);
    const section = chunk.sectionTitle || `Section ${chunk.chunkIndex + 1}`;

    for (const s of sentences) {
      if (/\b(?:shall|must|agrees to|is required to|will pay|will maintain|shall not|payable|due within|fee is|rent is|compensation|subscription fee|pay|deliver)\b/i.test(s)) {
        // Determine subject party
        let party = 'Both Parties';
        if (/\b(tenant|lessee)\b/i.test(s)) party = 'Tenant';
        else if (/\b(landlord|lessor)\b/i.test(s)) party = 'Landlord';
        else if (/\b(customer|subscriber|client)\b/i.test(s)) party = 'Customer';
        else if (/\b(provider|vendor|service provider)\b/i.test(s)) party = 'Provider';
        else if (/\b(employee)\b/i.test(s)) party = 'Employee';
        else if (/\b(employer|company)\b/i.test(s)) party = 'Employer';
        else if (/\b(receiving party)\b/i.test(s)) party = 'Receiving Party';
        else if (/\b(disclosing party)\b/i.test(s)) party = 'Disclosing Party';

        // Extract action
        const actionMatch = s.match(/\b(?:shall|must|agrees to|will|is required to)\s+([^,.;]{8,120})/i) ||
          s.match(/(?:fee|rent|deposit|payment)\s+is\s+([^,.;]{5,100})/i);
        const action = actionMatch ? actionMatch[1].trim() : s.slice(0, 100);

        // Extract deadline
        const deadlineMatch = s.match(/\b(?:within|by|on or before|at least|payable in)\s+([^,.;]+(?:days|months|hours|date|prior|advance))/i);
        const triggerMatch = s.match(/\b(?:upon|in the event of|after|following)\s+([^,.;]{10,80})/i);

        if (!obligations.some((o) => o.obligation.toLowerCase() === action.toLowerCase())) {
          obligations.push({
            id: `obl-${obligations.length + 1}`,
            party,
            obligation: action.charAt(0).toUpperCase() + action.slice(1),
            trigger: triggerMatch ? triggerMatch[0].trim() : undefined,
            deadline: deadlineMatch ? deadlineMatch[0].trim() : undefined,
            condition: s.includes('provided that') ? 'Subject to specified proviso' : undefined,
            consequence: s.includes('default') ? 'Failure constitutes breach or default' : undefined,
            statusOrReviewAction: 'Review and add to calendar',
            sourceSection: section,
            excerpt: s,
            pageNumber: chunk.pageNumber,
          });
        }
      }
    }
  }

  // Fallback: if no formal obligations were matched in very short snippets, extract from first available chunk
  if (obligations.length === 0 && chunks.length > 0) {
    const firstChunk = chunks[0];
    const sentence = getSentences(firstChunk.text)[0] || firstChunk.text;
    obligations.push({
      id: 'obl-1',
      party: 'Contracting Party',
      obligation: 'Perform terms and contractual covenants specified in this section',
      sourceSection: firstChunk.sectionTitle || 'Section 1',
      excerpt: sentence,
      pageNumber: firstChunk.pageNumber,
    });
  }

  return { obligations: obligations.slice(0, 12) };
}

// ─── Grounded Q&A ────────────────────────────────────────────────────────────

export function answerQuestionFromContent(
  question: string,
  chunks: DocumentChunk[],
  documentTitle: string
): QuestionAnswer {
  if (chunks.length === 0) {
    return {
      question,
      answer: `The document "${documentTitle}" does not contain relevant sections to answer this question.`,
      isGrounded: false,
      citations: [],
      confidence: 0,
      uncertaintyNote: 'No matching text chunks were retrieved for the provided question.',
      suggestsProfessionalReview: false,
      suggestedFollowUp: [],
    };
  }

  const STOP_WORDS = new Set([
    'what', 'when', 'where', 'which', 'how', 'does', 'the', 'and', 'for', 'are', 'is',
    'much', 'many', 'any', 'all', 'can', 'will', 'with', 'from', 'this', 'that', 'about',
    'tell', 'explain', 'give', 'show', 'please', 'there', 'happens', 'happen', 'occur', 'result',
  ]);

  const MODIFIER_WORDS = new Set([
    'monthly', 'annual', 'annually', 'daily', 'weekly', 'total', 'period', 'terms', 'base', 'general', 'standard',
  ]);

  const queryTerms = question
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !STOP_WORDS.has(w));

  // Score chunks by query overlap
  let bestChunk: DocumentChunk | null = null;
  let bestSentence = '';
  let highestScore = 0;

  for (const chunk of chunks) {
    const candidateTexts = [...getSentences(chunk.text), chunk.text];
    for (const sentence of candidateTexts) {
      const lower = sentence.toLowerCase();
      const matchedTerms: string[] = [];

      for (const term of queryTerms) {
        const stem = stemWord(term);
        const termRegex = new RegExp(`\\b${term}\\b`, 'i');
        const stemRegex = new RegExp(`\\b${stem}`, 'i');
        if (termRegex.test(lower) || (stem.length >= 3 && stemRegex.test(lower))) {
          matchedTerms.push(term);
        }
      }

      // Grounding criteria:
      // - 2 or more distinct query terms matched, OR
      // - 1 substantive term matched that is NOT merely a frequency/generic modifier
      const hasSubstantiveMatch = matchedTerms.some((t) => !MODIFIER_WORDS.has(t));
      const isAcceptable = matchedTerms.length >= 2 || (matchedTerms.length === 1 && hasSubstantiveMatch);

      if (isAcceptable) {
        let totalScore = matchedTerms.length * 2;
        if (/\$[\d,]+/.test(sentence)) totalScore += 3;

        if (totalScore > highestScore) {
          highestScore = totalScore;
          bestChunk = chunk;
          bestSentence = sentence.length > 250 ? sentence.slice(0, 247) + '...' : sentence;
        }
      }
    }
  }

  if (!bestChunk || highestScore === 0) {
    return {
      question,
      answer: `The document "${documentTitle}" does not provide sufficient information regarding "${question}". The retrieved provisions do not explicitly address this topic.`,
      isGrounded: false,
      citations: [],
      confidence: 0.15,
      uncertaintyNote: 'Low keyword correlation with document text.',
      suggestsProfessionalReview: true,
      suggestedFollowUp: ['What are the termination terms?', 'What are the payment provisions?'],
    };
  }

  const sectionName = bestChunk.sectionTitle || `Section ${bestChunk.chunkIndex + 1}`;
  const answer = `According to ${sectionName} of ${documentTitle}: "${bestSentence}" This directly defines the terms and stipulations governing ${queryTerms.slice(0, 3).join(', ')}.`;

  return {
    question,
    answer,
    isGrounded: true,
    citations: [
      {
        sectionId: bestChunk.id,
        sectionTitle: sectionName,
        excerpt: bestSentence,
        pageNumber: bestChunk.pageNumber,
        confidence: Math.min(1.0, 0.7 + highestScore * 0.1),
      },
    ],
    confidence: Math.min(0.95, 0.65 + highestScore * 0.1),
    uncertaintyNote: undefined,
    suggestsProfessionalReview: highestScore === 1,
    suggestedFollowUp: [
      'What are the obligations under this section?',
      'Are there deadlines or notice periods associated with this?',
    ],
  };
}

// ─── Semantic Document Comparison ────────────────────────────────────────────

export function compareDocumentsFromContent(
  chunksA: DocumentChunk[],
  chunksB: DocumentChunk[],
  titleA: string,
  titleB: string
): ComparisonResult {
  const textA = chunksA.map((c) => c.text).join('\n');
  const textB = chunksB.map((c) => c.text).join('\n');

  const typeA = detectDocumentType(textA, titleA);
  const typeB = detectDocumentType(textB, titleB);

  const clausesA = extractClausesFromContent(chunksA).clauses;
  const clausesB = extractClausesFromContent(chunksB).clauses;

  const comparisons: ComparisonResult['clauseComparisons'] = [];
  const keyDifferences: string[] = [];

  let addedCount = 0;
  let removedCount = 0;
  let modifiedCount = 0;
  let unchangedCount = 0;

  function getPrimaryClauseForCategory(clauses: Clause[], category: ClauseCategory): Clause | undefined {
    const normTarget = normalizeClauseCategory(category);
    const matching = clauses.filter((c) => normalizeClauseCategory(c.category) === normTarget);
    if (matching.length === 0) return undefined;
    return matching.find((c) => /\$[\d,]+/.test(c.originalText))
      || matching.find((c) => /\bbase salary\b|\bbase rent\b|\bannual fee\b/i.test(c.originalText))
      || matching[0];
  }

  const allCategories = new Set([...clausesA.map((c) => c.category), ...clausesB.map((c) => c.category)]);

  for (const cat of allCategories) {
    const clauseA = getPrimaryClauseForCategory(clausesA, cat);
    const clauseB = getPrimaryClauseForCategory(clausesB, cat);

    if (clauseA && clauseB) {
      // Both have category: check if text differs
      const isDifferent = clauseA.originalText.trim().toLowerCase() !== clauseB.originalText.trim().toLowerCase();
      if (isDifferent) {
        modifiedCount++;
        const summary = `${cat.toUpperCase()}: "${titleA}" sets terms as "${clauseA.originalText.slice(0, 80)}...", whereas "${titleB}" stipulates "${clauseB.originalText.slice(0, 80)}...".`;
        keyDifferences.push(summary);
        comparisons.push({
          id: `comp-${comparisons.length + 1}`,
          category: cat,
          changeType: 'modified',
          docAText: clauseA.originalText,
          docBText: clauseB.originalText,
          changeSummary: summary,
          whyItMatters: `Shifts the commercial and operational commitments between ${titleA} and ${titleB}.`,
          docASection: clauseA.sourceSection,
          docBSection: clauseB.sourceSection,
        });
      } else {
        unchangedCount++;
        comparisons.push({
          id: `comp-${comparisons.length + 1}`,
          category: cat,
          changeType: 'unchanged',
          docAText: clauseA.originalText,
          docBText: clauseB.originalText,
          changeSummary: `Provisions for ${cat} are structurally equivalent in both documents.`,
          docASection: clauseA.sourceSection,
          docBSection: clauseB.sourceSection,
        });
      }
    } else if (clauseA && !clauseB) {
      removedCount++;
      keyDifferences.push(`Clause present only in ${titleA}: ${clauseA.title} (${clauseA.sourceSection}).`);
      comparisons.push({
        id: `comp-${comparisons.length + 1}`,
        category: cat,
        changeType: 'removed',
        docAText: clauseA.originalText,
        changeSummary: `Present in ${titleA} (${clauseA.sourceSection}) but absent in ${titleB}.`,
        whyItMatters: `${titleB} omits protections or restrictions present in ${titleA}.`,
        docASection: clauseA.sourceSection,
      });
    } else if (!clauseA && clauseB) {
      addedCount++;
      keyDifferences.push(`Clause added in ${titleB}: ${clauseB.title} (${clauseB.sourceSection}).`);
      comparisons.push({
        id: `comp-${comparisons.length + 1}`,
        category: cat,
        changeType: 'added',
        docBText: clauseB.originalText,
        changeSummary: `Newly introduced in ${titleB} (${clauseB.sourceSection}); not in ${titleA}.`,
        whyItMatters: `Imposes new legal covenants not previously applicable in ${titleA}.`,
        docBSection: clauseB.sourceSection,
      });
    }
  }

  const overallSummary = typeA === typeB
    ? `Comparative analysis between "${titleA}" and "${titleB}" (both ${typeA}s) identified ${modifiedCount} modified clause(s), ${addedCount} added term(s), and ${removedCount} omitted provision(s).`
    : `Cross-agreement comparison between "${titleA}" (${typeA}) and "${titleB}" (${typeB}) highlights substantial structural differences across ${comparisons.length} core provisions.`;

  return {
    docATitle: titleA,
    docBTitle: titleB,
    overallSummary,
    keyDifferences: keyDifferences.slice(0, 6),
    clauseComparisons: comparisons.slice(0, 15),
    addedCount,
    removedCount,
    modifiedCount,
    unchangedCount,
  };
}

// ─── Checklist Generation ────────────────────────────────────────────────────

export function generateChecklistFromContent(
  chunks: DocumentChunk[],
  type: Checklist['type'],
  summary: DocumentSummary
): Checklist {
  const items: ChecklistItem[] = [];
  const risks = analyzeRisksFromContent(chunks, summary).risks;
  const obligations = extractObligationsFromContent(chunks).obligations;

  if (type === 'before-signing') {
    for (const r of risks.slice(0, 4)) {
      items.push({
        id: `item-${items.length + 1}`,
        category: 'Risk Review',
        item: `Review ${r.title} in ${r.clauseReference}`,
        description: r.suggestedAction,
        sourceSection: r.clauseReference,
        priority: r.level === 'high-attention' ? 'high' : 'medium',
        completed: false,
      });
    }
    items.push({
      id: `item-${items.length + 1}`,
      category: 'Authority',
      item: 'Confirm executing signatory authority for all named parties',
      description: `Ensure proper execution authority on behalf of ${summary.metadata.parties.join(' and ') || 'the company'}.`,
      priority: 'high',
      completed: false,
    });
  } else if (type === 'after-signing') {
    for (const o of obligations.slice(0, 5)) {
      items.push({
        id: `item-${items.length + 1}`,
        category: 'Operational Obligation',
        item: `Calendar obligation: ${o.obligation}`,
        description: o.deadline ? `Due: ${o.deadline}. Trigger: ${o.trigger || 'Commencement'}` : o.excerpt,
        sourceSection: o.sourceSection,
        priority: 'high',
        completed: false,
      });
    }
  } else if (type === 'termination') {
    items.push({
      id: `item-1`,
      category: 'Notice Delivery',
      item: 'Verify mandatory written notice period and delivery address',
      description: 'Ensure notice is sent via certified mail or designated platform per general provisions.',
      priority: 'high',
      completed: false,
    });
    items.push({
      id: `item-2`,
      category: 'Data / Property Return',
      item: 'Surrender materials, premises, or confidential assets',
      description: 'Satisfy return or destruction covenants within the required post-termination window.',
      priority: 'medium',
      completed: false,
    });
  } else {
    // renewal or lawyer-questions
    items.push({
      id: `item-1`,
      category: 'Legal Review',
      item: 'Clarify unaddressed liabilities and indemnification reciprocity',
      description: 'Request formal clarification from licensed counsel on exposure under limitation of liability.',
      priority: 'high',
      completed: false,
    });
    items.push({
      id: `item-2`,
      category: 'Commercial Alignment',
      item: 'Audit pricing adjustments and renewal thresholds',
      description: 'Confirm fee structures against current operational budget.',
      priority: 'medium',
      completed: false,
    });
  }

  const titles: Record<Checklist['type'], string> = {
    'before-signing': 'Pre-Execution Verification Checklist',
    'after-signing': 'Post-Execution Compliance Checklist',
    'termination': 'Contract Termination Checklist',
    'renewal': 'Term Renewal & Extension Checklist',
    'lawyer-questions': 'Legal Counsel Advisory Checklist',
  };

  return {
    id: randomUUID(),
    type,
    title: titles[type] || 'Action Checklist',
    description: `Actionable, document-grounded checklist synthesized from ${summary.metadata.documentType || 'the agreement'}.`,
    items,
    generatedAt: new Date().toISOString(),
  };
}

// ─── Document Review Brief Generation ───────────────────────────────────────

export function generateDocumentReviewBriefFromContent(
  chunks: DocumentChunk[],
  summary: DocumentSummary,
  risks: RiskAnalysisResult
): DocumentReviewBrief {
  const obligations = extractObligationsFromContent(chunks).obligations;

  return {
    documentPurpose: summary.purpose || 'Legal agreement',
    parties: summary.metadata.parties || [],
    keyObligations: obligations.slice(0, 5).map((o) => `${o.party}: ${o.obligation} (${o.sourceSection})`),
    importantDates: summary.importantDates || [],
    financialCommitments: summary.financialTerms || [],
    majorClauses: summary.clausesRequiringAttention || [],
    nextSteps: risks.risks.slice(0, 3).map(r => ({
      category: 'Review',
      action: r.suggestedAction,
      reason: r.whyItMatters,
      source: r.clauseReference
    })),
    questionsToConsider: risks.risks.slice(0, 3).map(r => ({
      category: 'Risks',
      question: r.questionToConsider || `Review ${r.title}?`,
      reason: r.whyItMatters,
      source: r.clauseReference
    }))
  };
}
