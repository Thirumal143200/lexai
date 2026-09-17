/**
 * Citation Integrity & Provenance Verification Tests.
 *
 * Verifies that citations correspond strictly to authentic extracted document text,
 * preventing hallucinated references, mismatched chunk IDs, and cross-document contamination.
 */

import { verifyCitation, validateAndFilterCitations } from '@/lib/rag/citation-validator';
import type { DocumentChunk } from '@/lib/ai/provider';
import type { Citation } from '@/lib/ai/schemas';

describe('Citation Integrity & Verification', () => {
  const documentChunks: DocumentChunk[] = [
    {
      id: 'chunk-101',
      chunkIndex: 0,
      sectionTitle: 'Section 4. Termination',
      text: 'Section 4.1. Either party may terminate this Agreement upon thirty (30) days prior written notice if the other party breaches any material term.',
    },
    {
      id: 'chunk-102',
      chunkIndex: 1,
      sectionTitle: 'Section 9. Limitation of Liability',
      text: 'Section 9.2. In no event shall either party aggregate liability exceed the total fees paid in the twelve (12) months preceding the claim.',
    },
  ];

  it('validates authentic citation with exact text match', () => {
    const validCitation: Citation = {
      sectionId: 'chunk-101',
      sectionTitle: 'Section 4. Termination',
      excerpt: 'Either party may terminate this Agreement upon thirty (30) days prior written notice',
      confidence: 0.95,
    };

    const result = verifyCitation(validCitation, documentChunks);
    expect(result.valid).toBe(true);
    expect(result.reason).toBe('matched');
  });

  it('rejects citation referencing nonexistent chunk ID', () => {
    const fakeCitation: Citation = {
      sectionId: 'chunk-fabricated-999',
      sectionTitle: 'Section 99. Ghost Clause',
      excerpt: 'This clause was completely fabricated by a hallucinating model.',
      confidence: 0.5,
    };

    const result = verifyCitation(fakeCitation, documentChunks);
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('chunk_not_found');
  });

  it('rejects citation where chunk exists but excerpt is not in chunk', () => {
    const mismatchedCitation: Citation = {
      sectionId: 'chunk-101', // Termination chunk
      sectionTitle: 'Section 4. Termination',
      excerpt: 'The subscriber shall pay a $50,000 onboarding setup fee upon signature.', // Financial terms not in chunk 101!
      confidence: 0.8,
    };

    const result = verifyCitation(mismatchedCitation, documentChunks);
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('text_not_in_chunk');
  });

  it('filters out unverified citations from a mixed batch', () => {
    const citations: Citation[] = [
      {
        sectionId: 'chunk-102',
        sectionTitle: 'Section 9. Liability',
        excerpt: 'aggregate liability exceed the total fees paid in the twelve (12) months',
        confidence: 0.9,
      },
      {
        sectionId: 'chunk-999',
        sectionTitle: 'Section 99. Made Up',
        excerpt: 'Totally fictitious clause text not in this contract.',
        confidence: 0.2,
      },
    ];

    const { verifiedCitations, unverifiedCitations, allValid } = validateAndFilterCitations(
      citations,
      documentChunks
    );

    expect(allValid).toBe(false);
    expect(verifiedCitations.length).toBe(1);
    expect(verifiedCitations[0].sectionId).toBe('chunk-102');
    expect(unverifiedCitations.length).toBe(1);
    expect(unverifiedCitations[0].sectionId).toBe('chunk-999');
  });

  it('tolerates minor formatting differences (quotes, whitespace, casing)', () => {
    const citationWithQuotes: Citation = {
      sectionId: 'chunk-101',
      excerpt: 'either party may terminate this agreement upon "thirty (30) days" prior written notice',
      confidence: 0.85,
    };

    const result = verifyCitation(citationWithQuotes, documentChunks);
    expect(result.valid).toBe(true);
  });
});
