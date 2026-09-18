/**
 * Single Source of Truth for Legal Clause Categories & Classification.
 *
 * Canonical Categories:
 * - termination: Termination, expiration, cancellation, breach remedies
 * - liability: Limitation of liability, liability caps, damage disclaimers
 * - indemnity: Indemnification, hold harmless, defense obligations
 * - confidentiality: Non-disclosure, proprietary data protection, trade secrets
 * - intellectual_property: IP rights, patents, copyrights, trademarks, licenses, work product
 * - payment: Fees, invoicing, compensation, late charges, subscription pricing
 * - dispute_resolution: Arbitration, mediation, governing law, jurisdiction, venue
 * - warranty: Warranties, representations, fitness for purpose, disclaimers
 */

export const CANONICAL_CLAUSE_CATEGORIES = [
  'termination',
  'liability',
  'indemnity',
  'confidentiality',
  'intellectual_property',
  'payment',
  'dispute_resolution',
  'warranty',
] as const;

export type CanonicalClauseCategory = (typeof CANONICAL_CLAUSE_CATEGORIES)[number];

export interface ClauseCategoryMeta {
  id: CanonicalClauseCategory;
  label: string;
  description: string;
}

export const CLAUSE_CATEGORY_DEFINITIONS: Record<CanonicalClauseCategory, { label: string; description: string }> = {
  termination: {
    label: 'Termination',
    description: 'Provisions governing agreement end, notice periods, termination for cause/convenience, and default remedies.',
  },
  liability: {
    label: 'Liability',
    description: 'Clauses capping maximum damages, limiting liability, and disclaiming indirect/consequential damages.',
  },
  indemnity: {
    label: 'Indemnity',
    description: 'Obligations to defend, indemnify, and hold harmless against third-party claims, liabilities, or losses.',
  },
  confidentiality: {
    label: 'Confidentiality',
    description: 'Restrictions protecting proprietary data, non-disclosure requirements, and trade secret obligations.',
  },
  intellectual_property: {
    label: 'Intellectual Property',
    description: 'Ownership of preexisting IP, patent/copyright/trademark grants, work product assignment, and licenses.',
  },
  payment: {
    label: 'Payment',
    description: 'Financial compensation, invoicing schedules, late charges, subscription fees, and payment terms.',
  },
  dispute_resolution: {
    label: 'Dispute Resolution',
    description: 'Mechanisms for resolving disagreements: arbitration, mediation, governing law, jurisdiction, and venue.',
  },
  warranty: {
    label: 'Warranty',
    description: 'Representations, performance warranties, implied warranty disclaimers (e.g., merchantability, fitness for purpose).',
  },
};

/**
 * Filter list displayed in the UI. Always strictly ordered and labelled.
 */
export const CLAUSE_FILTER_OPTIONS = [
  { id: 'all', label: 'All' },
  { id: 'termination', label: 'Termination' },
  { id: 'liability', label: 'Liability' },
  { id: 'indemnity', label: 'Indemnity' },
  { id: 'confidentiality', label: 'Confidentiality' },
  { id: 'intellectual_property', label: 'Intellectual Property' },
  { id: 'payment', label: 'Payment' },
  { id: 'dispute_resolution', label: 'Dispute Resolution' },
  { id: 'warranty', label: 'Warranty' },
] as const;

/**
 * Normalizes any category string (from Gemini, legacy DB records, or user input)
 * to its canonical equivalent.
 */
export function normalizeClauseCategory(input: string | undefined | null): string {
  if (!input) return 'other';
  const clean = input.toLowerCase().trim().replace(/[-_\s]+/g, '_');

  // Exact canonical match
  if (CANONICAL_CLAUSE_CATEGORIES.includes(clean as CanonicalClauseCategory)) {
    return clean;
  }

  // Termination aliases
  if (
    clean === 'term_and_termination' ||
    clean === 'cancellation' ||
    clean === 'expiration' ||
    clean.includes('termination') ||
    clean === 'default_and_remedies'
  ) {
    return 'termination';
  }

  // Liability aliases
  if (
    clean === 'limitation_of_liability' ||
    clean === 'liability_cap' ||
    clean === 'damages' ||
    clean === 'consequential_damages' ||
    clean.includes('liability')
  ) {
    return 'liability';
  }

  // Indemnity aliases
  if (
    clean === 'indemnification' ||
    clean === 'indemnify' ||
    clean === 'hold_harmless' ||
    clean.includes('indemn')
  ) {
    return 'indemnity';
  }

  // Confidentiality aliases
  if (
    clean === 'non_disclosure' ||
    clean === 'nda' ||
    clean === 'proprietary_information' ||
    clean === 'confidential' ||
    clean.includes('confident')
  ) {
    return 'confidentiality';
  }

  // Intellectual Property aliases
  if (
    clean === 'ip' ||
    clean === 'ip_rights' ||
    clean === 'intellectual_property_rights' ||
    clean === 'copyright' ||
    clean === 'copyrights' ||
    clean === 'patent' ||
    clean === 'patents' ||
    clean === 'trademark' ||
    clean === 'trademarks' ||
    clean === 'licensing' ||
    clean === 'license' ||
    clean === 'work_product' ||
    clean === 'proprietary_rights' ||
    clean.includes('intellectual_property') ||
    clean.includes('intellectual-property')
  ) {
    return 'intellectual_property';
  }

  // Payment aliases
  if (
    clean === 'fees' ||
    clean === 'invoicing' ||
    clean === 'invoice' ||
    clean === 'pricing' ||
    clean === 'billing' ||
    clean === 'compensation' ||
    clean === 'charges' ||
    clean === 'rent' ||
    clean.includes('payment')
  ) {
    return 'payment';
  }

  // Dispute Resolution aliases
  if (
    clean === 'arbitration' ||
    clean === 'mediation' ||
    clean === 'governing_law' ||
    clean === 'governing-law' ||
    clean === 'jurisdiction' ||
    clean === 'venue' ||
    clean === 'settlement' ||
    clean.includes('dispute')
  ) {
    return 'dispute_resolution';
  }

  // Warranty aliases
  if (
    clean === 'warranties' ||
    clean === 'warrant' ||
    clean === 'warranted' ||
    clean === 'representation_and_warranty' ||
    clean === 'representations_and_warranties' ||
    clean === 'warranty_disclaimer' ||
    clean === 'disclaimers' ||
    clean === 'disclaimer' ||
    clean.includes('warrant')
  ) {
    return 'warranty';
  }

  // Preserve other specific domain categories (e.g., employment, compliance, renewal)
  if (
    clean === 'renewal' ||
    clean === 'compliance' ||
    clean === 'employment' ||
    clean === 'data_protection' ||
    clean === 'privacy' ||
    clean === 'security' ||
    clean === 'force_majeure'
  ) {
    return clean;
  }

  return 'other';
}

/**
 * Normalizes clause text for robust pattern matching.
 */
export function normalizeClauseText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[-_—–]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Weighted classification patterns for legal clause extraction.
 */
interface CategoryRule {
  category: CanonicalClauseCategory;
  titleKeywords: RegExp;
  strongPhrases: RegExp[];
  mediumKeywords: RegExp[];
}

const CATEGORY_RULES: CategoryRule[] = [
  {
    category: 'termination',
    titleKeywords: /\b(termination|term and termination|term and duration|duration of obligations|term,\s*auto[- ]renewal,\s*and termination|cancellation|expiration|default and remedies)\b/i,
    strongPhrases: [
      /\btermination for convenience\b/i,
      /\btermination for cause\b/i,
      /\btermination upon notice\b/i,
      /\btermination upon \d+\b/i,
      /\bright to terminate\b/i,
      /\bmay terminate this agreement\b/i,
      /\beither party may terminate\b/i,
      /\bterminated earlier by either party\b/i,
      /\bunless terminated earlier\b/i,
      /\bterminate earlier\b/i,
      /\bsurvives? termination\b/i,
      /\bcure (?:such )?breach\b/i,
      /\bagreement may be ended\b/i,
      /\bholding over after expiration\b/i,
      /\bautomatic(?:ally)? renew(?:s|al)? unless.*notice\b/i,
      /\binitial term of this agreement shall be\b/i,
      /\bshall remain in effect for a period of\b/i,
    ],
    mediumKeywords: [
      /\bterminate\b/i,
      /\btermination\b/i,
      /\bcancellation\b/i,
      /\bexpiration\b/i,
      /\bexpire\b/i,
      /\bcure period\b/i,
      /\bwritten notice of non renewal\b/i,
      /\bnon-renewal\b/i,
    ],
  },
  {
    category: 'liability',
    titleKeywords: /\b(limitation of liability|liability|damages|liability cap|waiver of damages)\b/i,
    strongPhrases: [
      /\blimitation of liability\b/i,
      /\baggregate liability\b/i,
      /\bindirect damages\b/i,
      /\bconsequential damages\b/i,
      /\bincidental (?:or|and) consequential damages\b/i,
      /\bliability cap\b/i,
      /\bmaximum liability\b/i,
      /\btotal cumulative aggregate liability\b/i,
      /\bin no event shall (?:either party|provider|customer|vendor)\b/i,
      /\bneither party'?s? aggregate liability\b/i,
      /\bneither party shall be liable\b/i,
      /\bdeliberate allocation of risk\b/i,
      /\bpunitive damages\b/i,
    ],
    mediumKeywords: [
      /\bliable\b/i,
      /\bliability\b/i,
      /\bdamages alone\b/i,
      /\bloss of profits\b/i,
      /\bbusiness interruption\b/i,
    ],
  },
  {
    category: 'indemnity',
    titleKeywords: /\b(indemnif(?:y|ication|ied)|hold harmless|defense and indemnity)\b/i,
    strongPhrases: [
      /\bindemnif(?:y|ies)? and hold harmless\b/i,
      /\bdefend,? indemnif(?:y|ies)?,? and hold harmless\b/i,
      /\bdefend and indemnif(?:y|ies)?\b/i,
      /\bindemnif(?:y|ies)? against (?:any|all) (?:third party )?claims\b/i,
      /\bindemnifying party\b/i,
      /\bindemnified party\b/i,
      /\bindemnification obligations?\b/i,
      /\bshall indemnif(?:y|ies)?\b/i,
    ],
    mediumKeywords: [
      /\bindemnif(?:y|ication|ied)\b/i,
      /\bhold harmless\b/i,
      /\bthird party claims?\b/i,
      /\bdefense control\b/i,
    ],
  },
  {
    category: 'confidentiality',
    titleKeywords: /\b(confidentiality|non disclosure|confidential information|proprietary information|trade secrets?)\b/i,
    strongPhrases: [
      /\bconfidential information\b/i,
      /\bnon disclosure\b/i,
      /\bproprietary information\b/i,
      /\bmaintain (?:the )?confidentiality\b/i,
      /\bmaintain .* in strict confidence\b/i,
      /\bdisclosure restrictions?\b/i,
      /\breceiving party shall protect\b/i,
      /\bduty of confidentiality\b/i,
      /\bdisclos(?:e|ing) (?:party|confidential information)\b/i,
      /\btrade secrets? shall remain\b/i,
      /\bexceptions? from confidentiality\b/i,
    ],
    mediumKeywords: [
      /\bconfidential\b/i,
      /\bconfidentiality\b/i,
      /\bnon-disclosure\b/i,
      /\bnda\b/i,
      /\btrade secrets?\b/i,
      /\bproprietary\b/i,
    ],
  },
  {
    category: 'intellectual_property',
    titleKeywords: /\b(intellectual property|ip rights|proprietary rights|ownership|copyright|patent|trademark|licensing|work product|no license|no ip rights)\b/i,
    strongPhrases: [
      /\bintellectual property rights?\b/i,
      /\bintellectual property\b/i,
      /\bip rights?\b/i,
      /\bwork product\b/i,
      /\bproprietary rights?\b/i,
      /\bownership of materials\b/i,
      /\bpatents?,? copyrights?,? (?:and|or) trademarks?\b/i,
      /\bretains? all rights?,? title,? and interest\b/i,
      /\bno ip rights granted\b/i,
      /\bno license or obligation\b/i,
      /\bnothing in this agreement grants.*(?:patent|trademark|copyright|intellectual property)\b/i,
      /\bcustomer data ownership\b/i,
      /\blicense grant and restrictions?\b/i,
      /\bnon exclusive, non transferable.*license\b/i,
      /\binventions? and improvements?\b/i,
    ],
    mediumKeywords: [
      /\bcopyrights?\b/i,
      /\btrademarks?\b/i,
      /\bpatents?\b/i,
      /\blicense grant\b/i,
      /\bintellectual property\b/i,
      /\bip\b/i,
      /\bwork product\b/i,
      /\binventions?\b/i,
      /\bproprietary\b/i,
    ],
  },
  {
    category: 'payment',
    titleKeywords: /\b(fees?|payment terms?|invoicing?|rent|compensation|pricing|charges|salary|benefits)\b/i,
    strongPhrases: [
      /\bpayment terms?\b/i,
      /\bshall pay all invoices?\b/i,
      /\bpayable within \d+ days\b/i,
      /\bannual fee of \$[\d,]+\b/i,
      /\bmonthly (?:base )?rent\b/i,
      /\bbase salary\b/i,
      /\bannual base salary\b/i,
      /\bsalary of \$[\d,]+\b/i,
      /\bcompensation and benefits\b/i,
      /\bsigning bonus\b/i,
      /\bshall pay .* (?:salary|rent|fee|bonus)\b/i,
      /\bpayable annually in advance\b/i,
      /\bpayable in .* installments\b/i,
      /\blate charges?\b/i,
      /\baccrue interest at the rate\b/i,
      /\bprice adjustments?\b/i,
      /\bsubscription fees?\b/i,
      /\bfees?,? payment terms?,? and taxes\b/i,
      /\bdue date\b/i,
      /\boverdue amounts?\b/i,
    ],
    mediumKeywords: [
      /\bpayment\b/i,
      /\bpayments\b/i,
      /\bfees?\b/i,
      /\binvoices?\b/i,
      /\binvoicing\b/i,
      /\bcompensation\b/i,
      /\bcharges?\b/i,
      /\brent\b/i,
      /\bsalary\b/i,
      /\bbonus\b/i,
      /\binstallments\b/i,
      /\bsecurity deposit\b/i,
    ],
  },
  {
    category: 'dispute_resolution',
    titleKeywords: /\b(governing law|dispute resolution|jurisdiction|venue|arbitration|forum|remedies and injunctive relief)\b/i,
    strongPhrases: [
      /\bdispute resolution\b/i,
      /\bgoverning law and (?:jurisdiction|dispute resolution|forum)\b/i,
      /\bshall be governed by and (?:interpreted|construed) under the laws\b/i,
      /\bshall be governed by and construed in accordance with the laws\b/i,
      /\bresolved by (?:binding )?arbitration\b/i,
      /\barbitration association\b/i,
      /\bexclusive jurisdiction\b/i,
      /\bvenue for any dispute\b/i,
      /\bany legal suit or proceeding\b/i,
      /\bcourts located in\b/i,
      /\bcourts sitting in\b/i,
      /\bstate or federal courts\b/i,
      /\blaws of the state of\b/i,
      /\bconflict of laws principles?\b/i,
      /\bany dispute arising under\b/i,
      /\bmediation\b/i,
    ],
    mediumKeywords: [
      /\bdispute\b/i,
      /\bdisputes\b/i,
      /\barbitration\b/i,
      /\bmediation\b/i,
      /\bgoverning law\b/i,
      /\bjurisdiction\b/i,
      /\bvenue\b/i,
      /\bsettlement\b/i,
    ],
  },
  {
    category: 'warranty',
    titleKeywords: /\b(warrant(?:y|ies)|disclaimers?|representations? and warrant(?:y|ies))\b/i,
    strongPhrases: [
      /\brepresentations? and warrant(?:y|ies)\b/i,
      /\bwarrant(?:y|ies) and disclaimers?\b/i,
      /\bwarrants? that the services?\b/i,
      /\bwarrants? that\b/i,
      /\bexpress or implied warranties?\b/i,
      /\bimplied warranties? of merchantability\b/i,
      /\bfitness for a particular purpose\b/i,
      /\bas is and as available\b/i,
      /\bprovided ["']as is["']\b/i,
      /\bwarranty disclaimer\b/i,
      /\bdisclaims all other warranties\b/i,
      /\bsole and exclusive remedy for breach of this warranty\b/i,
      /\bwarranted to conform\b/i,
    ],
    mediumKeywords: [
      /\bwarranty\b/i,
      /\bwarranties\b/i,
      /\bwarrants?\b/i,
      /\bwarranted\b/i,
      /\bmerchantability\b/i,
      /\bdisclaims?\b/i,
      /\brepresentations?\b/i,
    ],
  },
];

export interface ClassificationResult {
  category: CanonicalClauseCategory | string;
  score: number;
  confidence: 'high' | 'medium' | 'low';
}

/**
 * Classifies an individual clause or text chunk into a legal category using
 * weighted phrase matching, heading analysis, and false-positive suppression.
 */
export function classifyClause(
  text: string,
  sectionTitle?: string
): ClassificationResult {
  const normText = normalizeClauseText(text);
  const normTitle = sectionTitle ? normalizeClauseText(sectionTitle) : '';

  const scores: Record<CanonicalClauseCategory, number> = {
    termination: 0,
    liability: 0,
    indemnity: 0,
    confidentiality: 0,
    intellectual_property: 0,
    payment: 0,
    dispute_resolution: 0,
    warranty: 0,
  };

  for (const rule of CATEGORY_RULES) {
    let score = 0;

    // 1. Heading weight (Section title is the strongest contextual clue)
    if (normTitle && rule.titleKeywords.test(normTitle)) {
      score += 15;
    }

    // 2. Strong legal multi-word phrases (+10 each)
    for (const phrase of rule.strongPhrases) {
      if (phrase.test(normText) || (normTitle && phrase.test(normTitle))) {
        score += 10;
      }
    }

    // 3. Medium keywords (+3 each, capped at 9)
    let mediumHits = 0;
    for (const kw of rule.mediumKeywords) {
      if (kw.test(normText)) {
        mediumHits++;
      }
    }
    score += Math.min(mediumHits * 3, 9);

    scores[rule.category] = score;
  }

  // 4. False-Positive Suppression
  // In contracts, limitation of liability clauses often state:
  // "Except for breach of Section 6 (Confidentiality) or Section 8 (Indemnification), neither party's liability shall exceed..."
  // If liability has strong phrases, confidentiality/indemnity mentioned merely as exception references should not hijack the clause.
  if (scores.liability >= 10) {
    if (scores.confidentiality < 15) scores.confidentiality = Math.max(0, scores.confidentiality - 8);
    if (scores.indemnity < 15) scores.indemnity = Math.max(0, scores.indemnity - 8);
  }

  // If indemnity clause mentions "infringes a patent, copyright, or trademark", that's IP Indemnity, not an IP ownership clause
  if (scores.indemnity >= 12 && /infringes?.*patent|trademark|copyright/i.test(normText)) {
    if (scores.intellectual_property < 15) {
      scores.intellectual_property = Math.max(0, scores.intellectual_property - 8);
    }
  }

  // Determine top scoring category
  let bestCategory: CanonicalClauseCategory = 'termination';
  let maxScore = -1;

  for (const cat of CANONICAL_CLAUSE_CATEGORIES) {
    if (scores[cat] > maxScore) {
      maxScore = scores[cat];
      bestCategory = cat;
    }
  }

  // Minimum threshold to classify into one of the 8 canonical categories
  if (maxScore >= 5) {
    return {
      category: bestCategory,
      score: maxScore,
      confidence: maxScore >= 15 ? 'high' : maxScore >= 8 ? 'medium' : 'low',
    };
  }

  // Check secondary domain categories (e.g. renewal, compliance, employment)
  if (/\b(duties|job title|probation|salary|employee covenants|reporting to)\b/i.test(normText)) {
    return { category: 'employment', score: 6, confidence: 'medium' };
  }
  if (/\b(repairs|maintenance|premises|alterations|fixtures|good order|inspection)\b/i.test(normText)) {
    return { category: 'compliance', score: 6, confidence: 'medium' };
  }
  if (/\b(automatic renewal|renew|renewal term|holding over)\b/i.test(normText)) {
    return { category: 'renewal', score: 6, confidence: 'medium' };
  }

  return {
    category: 'other',
    score: 0,
    confidence: 'low',
  };
}
