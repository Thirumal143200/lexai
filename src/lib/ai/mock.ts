/**
 * Mock AI provider for testing.
 * Returns realistic, deterministic responses without calling external APIs.
 */
import { randomUUID } from 'crypto';
import type { AIProvider, DocumentChunk } from './provider';
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

export class MockAIProvider implements AIProvider {
  readonly name = 'mock';
  readonly isAvailable = true;

  async summarizeDocument(_chunks: DocumentChunk[], _fullText: string): Promise<DocumentSummary> {
    return {
      plainLanguageSummary:
        'This is a synthetic test document used for development and evaluation. It contains standard contractual provisions including payment terms, termination rights, and confidentiality obligations.',
      keyPoints: [
        'Both parties agree to the terms outlined in this agreement',
        'Payment is due within 30 days of invoice',
        'Either party may terminate with 30 days written notice',
        'Confidential information must not be disclosed to third parties',
      ],
      metadata: {
        title: 'Test Service Agreement',
        parties: ['Service Provider Ltd', 'Client Corporation'],
        documentType: 'Service Agreement',
        effectiveDate: '2024-01-01',
        expiryDate: '2024-12-31',
        jurisdiction: 'England and Wales',
        governingLaw: 'English Law',
        language: 'English',
      },
      wordCount: 1250,
      structureOverview: [
        { section: '1. Definitions', description: 'Defines key terms used throughout the agreement' },
        { section: '2. Services', description: 'Describes the services to be provided' },
        { section: '3. Payment', description: 'Sets out payment terms and schedule' },
        { section: '4. Termination', description: 'Conditions under which the agreement may end' },
        { section: '5. Confidentiality', description: 'Obligations to protect confidential information' },
      ],
    };
  }

  async extractClauses(_chunks: DocumentChunk[]): Promise<ClauseExtractionResult> {
    return {
      clauses: [
        {
          id: 'clause-1',
          category: 'payment',
          title: 'Payment Terms',
          originalText: 'Payment shall be made within 30 days of receipt of invoice.',
          plainLanguageExplanation: 'The client must pay within 30 days of receiving an invoice.',
          obligations: ['Pay invoiced amount within 30 days'],
          affectedParty: 'Client',
          trigger: 'Receipt of invoice',
          deadline: '30 days',
          riskLevel: 'low',
          sourceSection: 'Section 3.1',
          pageNumber: 2,
        },
        {
          id: 'clause-2',
          category: 'termination',
          title: 'Termination for Convenience',
          originalText: 'Either party may terminate this Agreement on 30 days written notice.',
          plainLanguageExplanation: 'Either side can end the contract by giving 30 days written notice.',
          obligations: ['Provide 30 days written notice before terminating'],
          affectedParty: 'Either party',
          trigger: 'Written notice given',
          deadline: '30 days',
          riskLevel: 'medium',
          sourceSection: 'Section 4.2',
          pageNumber: 3,
        },
        {
          id: 'clause-3',
          category: 'confidentiality',
          title: 'Confidentiality',
          originalText: 'Each party agrees to keep confidential all information received from the other party.',
          plainLanguageExplanation: 'Both sides must keep each other\'s information private.',
          obligations: ['Maintain confidentiality of received information', 'Do not disclose to third parties'],
          affectedParty: 'Both parties',
          trigger: 'Receipt of confidential information',
          deadline: undefined,
          riskLevel: 'medium',
          sourceSection: 'Section 5.1',
          pageNumber: 4,
        },
      ],
      definedTerms: [
        { term: 'Services', definition: 'The professional services described in Schedule A' },
        { term: 'Confidential Information', definition: 'Any information marked as confidential or that a reasonable person would consider confidential' },
      ],
    };
  }

  async analyzeRisks(_chunks: DocumentChunk[], _summary: DocumentSummary): Promise<RiskAnalysisResult> {
    return {
      risks: [
        {
          id: 'risk-1',
          level: 'review',
          title: 'Broad confidentiality scope',
          description: 'The confidentiality clause does not specify a time limit for the obligations.',
          whyItMatters: 'Without a defined end date, confidentiality obligations could technically continue indefinitely.',
          affectedParty: 'Both parties',
          potentialConsequence: 'Ongoing obligation to maintain secrecy with no clear end point',
          suggestedAction: 'Consider whether a time limit (e.g., 2-5 years after termination) is appropriate for your situation.',
          clauseReference: 'Section 5.1',
          excerpt: 'Each party agrees to keep confidential all information received from the other party.',
          professionalReviewRecommended: true,
        },
        {
          id: 'risk-2',
          level: 'informational',
          title: 'Termination notice period',
          description: 'The 30-day termination notice period is a standard provision.',
          whyItMatters: 'This affects how quickly either party can exit the agreement.',
          affectedParty: 'Both parties',
          potentialConsequence: 'Minimum 30-day commitment once notice is given',
          suggestedAction: 'Consider whether 30 days gives sufficient time to transition responsibilities.',
          clauseReference: 'Section 4.2',
          excerpt: 'Either party may terminate this Agreement on 30 days written notice.',
          professionalReviewRecommended: false,
        },
      ],
      overallAssessment: 'This appears to be a relatively straightforward service agreement. The main area that may warrant attention is the unlimited duration of the confidentiality obligations. This analysis is for informational purposes only and does not constitute legal advice.',
      highAttentionCount: 0,
      reviewCount: 1,
      informationalCount: 1,
    };
  }

  async extractObligations(_chunks: DocumentChunk[]): Promise<ObligationExtractionResult> {
    return {
      obligations: [
        {
          id: 'obl-1',
          party: 'Client',
          obligation: 'Pay invoiced amount',
          trigger: 'Receipt of invoice',
          deadline: '30 days',
          deadlineDate: undefined,
          condition: 'Services delivered as agreed',
          consequence: 'Late payment may incur interest',
          sourceSection: 'Section 3.1',
          excerpt: 'Payment shall be made within 30 days of receipt of invoice.',
          pageNumber: 2,
        },
        {
          id: 'obl-2',
          party: 'Service Provider',
          obligation: 'Deliver services as described in Schedule A',
          trigger: 'Agreement commencement',
          deadline: 'As per project schedule',
          deadlineDate: undefined,
          condition: undefined,
          consequence: 'Breach may entitle client to terminate',
          sourceSection: 'Section 2.1',
          excerpt: 'The Service Provider shall deliver the Services in accordance with Schedule A.',
          pageNumber: 1,
        },
      ],
    };
  }

  async answerQuestion(question: string, chunks: DocumentChunk[], documentTitle: string): Promise<QuestionAnswer> {
    const firstChunk = chunks.length > 0 ? chunks[0] : null;
    const chunkId = firstChunk ? firstChunk.id : 'section-1';
    const excerpt = firstChunk
      ? firstChunk.text.slice(0, Math.min(120, firstChunk.text.length)).trim()
      : 'Payment shall be made within 30 days of receipt of invoice.';
    const sectionTitle = firstChunk?.sectionTitle ?? 'Section 1';

    return {
      question,
      answer: `Based on ${documentTitle}, ${excerpt.length > 10 ? excerpt : 'the agreement outlines the relevant terms'}.`,
      isGrounded: true,
      citations: [
        {
          sectionId: chunkId,
          sectionTitle,
          excerpt,
          confidence: 0.9,
        },
      ],
      confidence: 0.85,
      uncertaintyNote: 'This is mock data for testing purposes.',
      suggestsProfessionalReview: false,
      suggestedFollowUp: [
        'What happens if payment is late?',
        'Are there any payment penalties?',
      ],
    };
  }

  async compareDocuments(
    _chunksA: DocumentChunk[],
    _chunksB: DocumentChunk[],
    titleA: string,
    titleB: string
  ): Promise<ComparisonResult> {
    return {
      docATitle: titleA,
      docBTitle: titleB,
      overallSummary: 'Mock comparison result. In production, this would reflect actual semantic differences between the two documents.',
      keyDifferences: [
        'Document B extends the payment period from 30 to 45 days',
        'Document B adds a liability cap clause not present in Document A',
      ],
      clauseComparisons: [
        {
          id: 'comp-1',
          category: 'payment',
          changeType: 'modified',
          docAText: 'Payment shall be made within 30 days of receipt of invoice.',
          docBText: 'Payment shall be made within 45 days of receipt of invoice.',
          changeSummary: 'Payment period extended from 30 to 45 days',
          whyItMatters: 'This affects cash flow — the client has 15 additional days to pay.',
          docASection: 'Section 3.1',
          docBSection: 'Section 3.1',
        },
      ],
      addedCount: 1,
      removedCount: 0,
      modifiedCount: 1,
      unchangedCount: 3,
    };
  }

  async generateChecklist(_chunks: DocumentChunk[], type: Checklist['type'], _summary: DocumentSummary): Promise<Checklist> {
    const titles: Record<Checklist['type'], string> = {
      'before-signing': 'Before Signing',
      'after-signing': 'After Signing',
      'termination': 'Termination',
      'renewal': 'Renewal',
      'lawyer-questions': 'Questions for a Lawyer',
    };

    return {
      id: randomUUID(),
      type,
      title: titles[type],
      description: `A checklist of steps for the "${titles[type]}" phase of this agreement.`,
      items: [
        {
          id: 'item-1',
          category: 'Review',
          item: 'Read the full agreement',
          description: 'Ensure you have read every section, including any schedules or appendices.',
          sourceSection: undefined,
          priority: 'high',
          completed: false,
        },
        {
          id: 'item-2',
          category: 'Obligations',
          item: 'Note all your obligations and deadlines',
          description: 'Check the obligations section and calendar any important dates.',
          sourceSection: 'Section 3',
          priority: 'high',
          completed: false,
        },
        {
          id: 'item-3',
          category: 'Professional advice',
          item: 'Seek legal advice if uncertain',
          description: 'If any clause is unclear, consult a qualified legal professional.',
          sourceSection: undefined,
          priority: 'medium',
          completed: false,
        },
      ],
      generatedAt: new Date().toISOString(),
    };
  }

  async generateLawyerPrep(_chunks: DocumentChunk[], _summary: DocumentSummary, _risks: RiskAnalysisResult): Promise<LawyerPrep> {
    return {
      documentSummary: 'This is a service agreement between a service provider and client, covering services, payment (30 days), termination (30 days notice), and confidentiality.',
      keyClauses: [
        'Payment Terms: 30 days from invoice',
        'Termination: 30 days written notice by either party',
        'Confidentiality: Mutual, no specified end date',
      ],
      areasForReview: [
        'Unlimited confidentiality duration — consider requesting a time limit',
        'Termination notice period — check if 30 days is workable for your situation',
      ],
      importantDates: [
        { date: '2024-01-01', description: 'Agreement effective date' },
        { date: '2024-12-31', description: 'Agreement expiry date' },
      ],
      keyObligations: [
        'Client: Pay within 30 days of invoice',
        'Service Provider: Deliver services per Schedule A',
        'Both parties: Maintain confidentiality of received information',
      ],
      questionsForLawyer: [
        'Is an unlimited confidentiality period enforceable in our jurisdiction?',
        'Are there implied warranties not included in the written agreement?',
        'What is our position if the other party disputes the scope of services?',
      ],
      unclearClauses: [
        'The definition of "Confidential Information" may be broader than intended',
      ],
      missingInformation: [
        'Schedule A (services description) is referenced but not included in this text',
        'No dispute resolution mechanism is specified',
        'No limitation of liability clause is present',
      ],
    };
  }
}
