/**
 * Tests for Content-Aware Legal Document Intelligence.
 *
 * Verifies that the AI engine (in Demo/Mock mode) derives its analysis
 * directly from actual source document content, ensuring that different
 * legal documents produce distinctly different, accurate, and grounded outputs.
 */

import { MockAIProvider } from '@/lib/ai/mock';
import { chunkText } from '@/lib/documents/chunker';
import { retrieveRelevantChunks } from '@/lib/rag/retriever';
import { validateAndFilterCitations } from '@/lib/rag/citation-validator';
import { validateUploadedFile } from '@/lib/security/validator';
import { AppError } from '@/lib/utils/errors';

describe('Content-Aware Document Analysis & Differentiation', () => {
  const provider = new MockAIProvider();

  // Synthetic Document A: Executive Employment Agreement
  const DOC_A_EMPLOYMENT = `EXECUTIVE EMPLOYMENT AGREEMENT

This Executive Employment Agreement ("Agreement") is entered into as of January 10, 2025, by and between Horizon Tech Solutions Inc. ("Employer") and Alexander Wright ("Employee").

1. POSITION AND DUTIES
Employee shall serve as Vice President of Engineering, reporting to the Chief Executive Officer. Employee shall devote full business time and best efforts to the performance of duties.

2. COMPENSATION AND BENEFITS
2.1 Base Salary. Employer shall pay Employee an annual base salary of $220,000, payable in semi-monthly installments in accordance with standard payroll.
2.2 Signing Bonus. Employee shall receive a one-time signing bonus of $25,000 upon commencement of employment.
2.3 Probationary Period. Employment shall be subject to an initial ninety (90) day probationary period.

3. TERMINATION AND NOTICE
Either party may terminate this employment relationship at will upon thirty (30) days prior written notice. Employer may terminate immediately for Cause upon written notice.

4. CONFIDENTIALITY AND IP
Employee agrees to maintain strict confidentiality of all proprietary source code, architecture designs, and business strategies. All inventions developed during employment shall be the sole property of Employer.

5. GOVERNING LAW
This Agreement shall be governed by the laws of the State of Washington. Exclusive venue shall lie in King County, Washington.`;

  // Synthetic Document B: Commercial Property Lease
  const DOC_B_LEASE = `COMMERCIAL LEASE AGREEMENT

This Commercial Lease Agreement ("Lease") is made and entered into as of February 1, 2025, by and between Apex Realty Partners LLC ("Landlord") and Vanguard Logistics Corp ("Tenant").

1. PREMISES
Landlord leases to Tenant Suite 800 containing approximately 6,500 rentable square feet located at 1200 Industrial Parkway, Austin, TX 78701.

2. TERM AND RENEWAL
2.1 Term. The term of this Lease shall be sixty (60) months, commencing March 1, 2025.
2.2 Holding Over. If Tenant holds over after expiration without Landlord consent, Tenant shall pay monthly Base Rent at 200% of the last applicable rate.

3. RENT AND SECURITY DEPOSIT
3.1 Base Rent. Tenant shall pay Base Rent in monthly installments of $18,500 on or before the first day of each calendar month.
3.2 Security Deposit. Tenant shall deposit $37,000 upon lease execution as a security deposit.

4. REPAIRS AND MAINTENANCE
Tenant shall, at its sole cost, keep the Premises, interior electrical wiring, HVAC units, and plumbing fixtures in good order and repair. Tenant waives all rights under any statute permitting tenants to make repairs at landlord's expense.

5. DEFAULT AND NOTICE
Tenant shall be in default if Rent remains unpaid five (5) days after written notice from Landlord. Upon default, Landlord may accelerate the entire remaining rent balance.

6. GOVERNING LAW
This Lease shall be governed by the laws of the State of Texas. Venue shall lie in Travis County, Texas.`;

  // Synthetic Document C: Similar Commercial Lease with Different Economic Terms
  const DOC_C_LEASE_NY = `COMMERCIAL LEASE AGREEMENT

This Commercial Lease Agreement ("Lease") is made and entered into as of June 1, 2025, by and between Empire Property Trust ("Landlord") and Metro Retail Group ("Tenant").

1. PREMISES
Landlord leases to Tenant Retail Storefront A containing 3,000 square feet located at 450 Fifth Avenue, New York, NY 10018.

2. TERM
The term of this Lease shall be twenty-four (24) months, commencing July 1, 2025.

3. RENT
Tenant shall pay Base Rent in monthly installments of $32,000 on or before the first day of each month.

4. GOVERNING LAW
This Lease shall be governed by the laws of the State of New York.`;

  const chunksA = chunkText(DOC_A_EMPLOYMENT, 'doc-a');
  const chunksB = chunkText(DOC_B_LEASE, 'doc-b');
  const chunksC = chunkText(DOC_C_LEASE_NY, 'doc-c');

  // ─── 1. Document Summary Differentiation ─────────────────────────────────

  it('produces document-specific summaries that reflect the distinct document types and parties', async () => {
    const summaryA = await provider.summarizeDocument(chunksA, DOC_A_EMPLOYMENT);
    const summaryB = await provider.summarizeDocument(chunksB, DOC_B_LEASE);

    // Type detection must differ
    expect(summaryA.metadata.documentType).toBe('Employment Agreement');
    expect(summaryB.metadata.documentType).toBe('Commercial Lease Agreement');

    // Parties must match the actual text
    expect(summaryA.metadata.parties).toContain('Horizon Tech Solutions Inc.');
    expect(summaryA.metadata.parties).toContain('Alexander Wright');

    expect(summaryB.metadata.parties).toContain('Apex Realty Partners LLC');
    expect(summaryB.metadata.parties).toContain('Vanguard Logistics Corp');

    // Governing law must reflect actual contract clauses
    expect(summaryA.metadata.governingLaw).toMatch(/Washington/i);
    expect(summaryB.metadata.governingLaw).toMatch(/Texas/i);

    // Key points must mention specific economic terms from the respective files
    const keyPointsA = summaryA.keyPoints.join(' ');
    const keyPointsB = summaryB.keyPoints.join(' ');

    expect(keyPointsA).toMatch(/\$220,000/); // Salary
    expect(keyPointsB).toMatch(/\$18,500/);  // Monthly rent

    // Summaries must not be identical
    expect(summaryA.plainLanguageSummary).not.toEqual(summaryB.plainLanguageSummary);
    expect(summaryA.plainLanguageSummary).toContain('Employment Agreement');
    expect(summaryB.plainLanguageSummary).toContain('Commercial Lease Agreement');
  });

  // ─── 2. Clause Extraction Differentiation ────────────────────────────────

  it('extracts document-specific clauses with authentic original excerpts', async () => {
    const clausesA = await provider.extractClauses(chunksA);
    const clausesB = await provider.extractClauses(chunksB);

    const categoriesA = clausesA.clauses.map((c) => c.category);
    const categoriesB = clausesB.clauses.map((c) => c.category);

    // Doc A should contain employment and compensation clauses
    expect(categoriesA).toContain('employment');
    expect(categoriesA).toContain('payment');
    const salaryClause = clausesA.clauses.find((c) => c.originalText.includes('$220,000'));
    expect(salaryClause).toBeDefined();
    expect(salaryClause?.sourceSection).toMatch(/Compensation/i);

    // Doc B should contain lease maintenance, rent, and holdover/renewal clauses
    expect(categoriesB).toContain('compliance'); // maintenance / repairs
    const rentClause = clausesB.clauses.find((c) => c.originalText.includes('$18,500'));
    expect(rentClause).toBeDefined();
    expect(rentClause?.sourceSection).toMatch(/Rent/i);

    // Original texts must be pulled verbatim from the respective documents
    expect(salaryClause?.originalText).toContain('annual base salary of $220,000');
    expect(rentClause?.originalText).toContain('monthly installments of $18,500');
  });

  // ─── 3. Risk Analysis Differentiation ────────────────────────────────────

  it('identifies genuine, content-derived risks specific to each document', async () => {
    const summaryA = await provider.summarizeDocument(chunksA, DOC_A_EMPLOYMENT);
    const summaryB = await provider.summarizeDocument(chunksB, DOC_B_LEASE);

    const risksA = await provider.analyzeRisks(chunksA, summaryA);
    const risksB = await provider.analyzeRisks(chunksB, summaryB);

    // Doc B contains punitive 200% holdover rent, statutory waiver, and 5-day default
    const riskTitlesB = risksB.risks.map((r) => r.title);
    expect(riskTitlesB).toContain('Liquidated Damages or Holdover Rent Multiplier');
    expect(riskTitlesB).toContain('Statutory Right Waiver');
    expect(riskTitlesB).toContain('Short Cure Period for Monetary Default');

    // Doc A does NOT contain lease holdover rent or statutory tenant repair waivers
    const riskTitlesA = risksA.risks.map((r) => r.title);
    expect(riskTitlesA).not.toContain('Liquidated Damages or Holdover Rent Multiplier');
    expect(riskTitlesA).not.toContain('Statutory Right Waiver');

    // Excerpts in Doc B must match Doc B's exact text
    const holdoverRisk = risksB.risks.find((r) => r.title === 'Liquidated Damages or Holdover Rent Multiplier');
    expect(holdoverRisk?.excerpt).toContain('200%');
    expect(holdoverRisk?.level).toBe('high-attention');
  });

  // ─── 4. Obligation Extraction Differentiation ────────────────────────────

  it('extracts obligations mapped to the actual contracting parties', async () => {
    const obligationsA = await provider.extractObligations(chunksA);
    const obligationsB = await provider.extractObligations(chunksB);

    const partiesA = obligationsA.obligations.map((o) => o.party);
    const partiesB = obligationsB.obligations.map((o) => o.party);

    // Doc A has Employee and Employer obligations
    expect(partiesA.some((p) => p === 'Employee' || p === 'Employer')).toBe(true);
    expect(partiesA).not.toContain('Tenant');

    // Doc B has Tenant obligations (rent, repairs)
    expect(partiesB.some((p) => p === 'Tenant')).toBe(true);
    expect(partiesB).not.toContain('Employee');

    const tenantObligation = obligationsB.obligations.find((o) => o.party === 'Tenant');
    expect(tenantObligation?.excerpt).toMatch(/Tenant shall/i);
  });

  // ─── 5. Grounded Q&A and Citation Integrity ──────────────────────────────

  it('answers questions grounded in the correct document and refuses unmentioned queries', async () => {
    // Query Doc A about salary
    const answerSalaryA = await provider.answerQuestion('What is the annual base salary?', chunksA, 'DocA.txt');
    expect(answerSalaryA.isGrounded).toBe(true);
    expect(answerSalaryA.answer).toContain('$220,000');
    expect(answerSalaryA.citations.length).toBeGreaterThan(0);
    expect(answerSalaryA.citations[0].excerpt).toContain('$220,000');

    // Query Doc B about salary (NOT present in Doc B)
    const answerSalaryB = await provider.answerQuestion('What is the annual base salary?', chunksB, 'DocB.txt');
    expect(answerSalaryB.isGrounded).toBe(false);
    expect(answerSalaryB.citations.length).toBe(0);
    expect(answerSalaryB.answer).toContain('does not provide sufficient information');

    // Query Doc B about rent
    const answerRentB = await provider.answerQuestion('How much is the monthly rent?', chunksB, 'DocB.txt');
    expect(answerRentB.isGrounded).toBe(true);
    expect(answerRentB.answer).toContain('$18,500');
    expect(answerRentB.citations[0].excerpt).toContain('$18,500');

    // Query Doc A about rent (NOT present in Doc A)
    const answerRentA = await provider.answerQuestion('How much is the monthly rent?', chunksA, 'DocA.txt');
    expect(answerRentA.isGrounded).toBe(false);

    // Citation integrity verification against source chunks
    const { verifiedCitations } = validateAndFilterCitations(answerSalaryA.citations, chunksA);
    expect(verifiedCitations.length).toBe(1);

    // Verifying Doc A's citation against Doc B's chunks must fail
    const crossCheck = validateAndFilterCitations(answerSalaryA.citations, chunksB);
    expect(crossCheck.verifiedCitations.length).toBe(0);
  });

  // ─── 6. Document Comparison Differentiation ──────────────────────────────

  it('compares two distinct documents and identifies added, removed, and modified clauses', async () => {
    const comparison = await provider.compareDocuments(chunksA, chunksB, 'Employment Agreement', 'Commercial Lease');

    expect(comparison.docATitle).toBe('Employment Agreement');
    expect(comparison.docBTitle).toBe('Commercial Lease');
    expect(comparison.keyDifferences.length).toBeGreaterThan(0);

    // Cross-type comparison detects substantive structural differences
    expect(comparison.overallSummary).toContain('Cross-agreement comparison');
    expect(comparison.clauseComparisons.length).toBeGreaterThan(0);

    // Differences must mention real categories
    const diffsText = comparison.keyDifferences.join(' ');
    expect(diffsText).toMatch(/PAYMENT|GOVERNING-LAW|COMPLIANCE|TERMINATION|EMPLOYMENT/);
  });

  it('compares two similar leases and accurately highlights modified economic terms', async () => {
    const comparison = await provider.compareDocuments(chunksB, chunksC, 'Austin Lease', 'New York Lease');

    expect(comparison.overallSummary).toContain('Austin Lease');
    expect(comparison.overallSummary).toContain('New York Lease');

    // Payment/rent clause should be marked modified because amounts ($18,500 vs $32,000) differ
    const rentComparison = comparison.clauseComparisons.find((c) => c.category === 'payment');
    expect(rentComparison).toBeDefined();
    expect(rentComparison?.changeType).toBe('modified');
    expect(rentComparison?.docAText).toContain('$18,500');
    expect(rentComparison?.docBText).toContain('$32,000');

    // Governing law should be marked modified (Texas vs New York)
    const lawComparison = comparison.clauseComparisons.find((c) => c.category === 'governing-law');
    expect(lawComparison).toBeDefined();
    expect(lawComparison?.changeType).toBe('modified');
    expect(lawComparison?.docAText).toContain('Texas');
    expect(lawComparison?.docBText).toContain('New York');
  });

  // ─── 7. File Type Validation ─────────────────────────────────────────────

  it('strictly validates allowed file types (PDF, DOCX, TXT) and rejects PPT/PPTX', () => {
    // Valid types
    expect(() => validateUploadedFile('contract.pdf', 'application/pdf', 1024)).not.toThrow();
    expect(() => validateUploadedFile('agreement.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 2048)).not.toThrow();
    expect(() => validateUploadedFile('terms.txt', 'text/plain', 512)).not.toThrow();

    // Unsupported presentation formats
    expect(() => validateUploadedFile('presentation.pptx', 'application/vnd.openxmlformats-officedocument.presentationml.presentation', 4096))
      .toThrow(AppError);

    expect(() => validateUploadedFile('slides.ppt', 'application/vnd.ms-powerpoint', 4096))
      .toThrow(AppError);

    // Unsupported executable formats
    expect(() => validateUploadedFile('script.sh', 'text/x-sh', 100))
      .toThrow(AppError);
  });
});
