/**
 * Citation Integrity Validator.
 *
 * Enforces ground-truth verification: ensures every citation produced
 * by AI or retrieval actually exists within the document chunks and
 * matches real extracted text.
 *
 * Defense against LLM hallucinated citations and provenance mismatch.
 */

import type { DocumentChunk } from '@/lib/ai/provider';
import type { Citation } from '@/lib/ai/schemas';

export interface CitationVerificationResult {
  valid: boolean;
  citation: Citation;
  reason?: 'matched' | 'chunk_not_found' | 'text_not_in_chunk' | 'foreign_document';
  similarityScore?: number;
}

/**
 * Normalizes text for robust excerpt matching (ignores whitespace differences,
 * curly vs straight quotes, case differences).
 */
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[''""`]/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Verifies that a citation references an existing chunk and that the cited excerpt
 * is genuinely present in that chunk's text.
 */
export function verifyCitation(
  citation: Citation,
  documentChunks: DocumentChunk[]
): CitationVerificationResult {
  if (!citation.sectionId) {
    return {
      valid: false,
      citation,
      reason: 'chunk_not_found',
    };
  }

  // 1. Locate the referenced chunk
  const chunk = documentChunks.find((c) => c.id === citation.sectionId);
  if (!chunk) {
    // Check if the excerpt appears in ANY chunk in this document (in case of mislabeled ID)
    const normalizedExcerpt = normalizeText(citation.excerpt);
    if (normalizedExcerpt.length > 10) {
      const alternateChunk = documentChunks.find((c) =>
        normalizeText(c.text).includes(normalizedExcerpt)
      );
      if (alternateChunk) {
        return {
          valid: true,
          citation: {
            ...citation,
            sectionId: alternateChunk.id,
            sectionTitle: alternateChunk.sectionTitle || citation.sectionTitle,
          },
          reason: 'matched',
          similarityScore: 1.0,
        };
      }
    }

    return {
      valid: false,
      citation,
      reason: 'chunk_not_found',
    };
  }

  // 2. Check excerpt presence within the chunk
  const normalizedChunkText = normalizeText(chunk.text);
  const normalizedExcerpt = normalizeText(citation.excerpt);

  if (!normalizedExcerpt || normalizedExcerpt.length < 5) {
    return {
      valid: false,
      citation,
      reason: 'text_not_in_chunk',
    };
  }

  // Exact or substring match
  if (normalizedChunkText.includes(normalizedExcerpt)) {
    return {
      valid: true,
      citation,
      reason: 'matched',
      similarityScore: 1.0,
    };
  }

  // Sub-phrase verification: check if at least 70% of words in the excerpt are in the chunk
  const excerptWords = normalizedExcerpt.split(' ').filter((w) => w.length > 3);
  if (excerptWords.length > 0) {
    const matchedWords = excerptWords.filter((w) => normalizedChunkText.includes(w));
    const ratio = matchedWords.length / excerptWords.length;
    if (ratio >= 0.75) {
      return {
        valid: true,
        citation,
        reason: 'matched',
        similarityScore: ratio,
      };
    }
  }

  return {
    valid: false,
    citation,
    reason: 'text_not_in_chunk',
  };
}

/**
 * Validates a full list of citations for an answer against the document chunks.
 * Returns only verified citations, or flags if none could be grounded.
 */
export function validateAndFilterCitations(
  citations: Citation[],
  documentChunks: DocumentChunk[]
): {
  verifiedCitations: Citation[];
  unverifiedCitations: Citation[];
  allValid: boolean;
} {
  const verifiedCitations: Citation[] = [];
  const unverifiedCitations: Citation[] = [];

  for (const c of citations) {
    const result = verifyCitation(c, documentChunks);
    if (result.valid) {
      verifiedCitations.push(result.citation);
    } else {
      unverifiedCitations.push(c);
    }
  }

  return {
    verifiedCitations,
    unverifiedCitations,
    allValid: unverifiedCitations.length === 0,
  };
}
