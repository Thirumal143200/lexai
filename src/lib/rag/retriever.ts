/**
 * Keyword-based retrieval for RAG.
 *
 * We use TF-IDF cosine similarity rather than dense embeddings.
 * Rationale: avoids a second paid API (embedding model) while still
 * providing meaningful retrieval for legal text — legal documents tend
 * to use consistent terminology, which TF-IDF handles well.
 *
 * For a production system with larger document sets, swap this for
 * a vector store (e.g., pgvector, Pinecone, Weaviate).
 */

import type { DocumentChunk } from '@/lib/ai/provider';

interface ScoredChunk {
  chunk: DocumentChunk;
  score: number;
}

/**
 * Retrieves the most relevant chunks for a query using TF-IDF scoring.
 * Returns up to `topK` chunks sorted by relevance.
 */
export function retrieveRelevantChunks(
  query: string,
  chunks: DocumentChunk[],
  topK = 5
): DocumentChunk[] {
  if (chunks.length === 0) return [];
  if (chunks.length <= topK) return chunks;

  const queryTerms = tokenize(query);
  if (queryTerms.length === 0) return chunks.slice(0, topK);

  const corpus = chunks.map((c) => tokenize(c.text));
  const idf = computeIdf(corpus);

  const scored: ScoredChunk[] = chunks.map((chunk, i) => ({
    chunk,
    score: tfidfScore(queryTerms, corpus[i], idf),
  }));

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
    .map((s) => s.chunk);
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 2 && !STOP_WORDS.has(t));
}

function computeIdf(corpus: string[][]): Map<string, number> {
  const docCount = corpus.length;
  const termDocFreq = new Map<string, number>();

  for (const doc of corpus) {
    const unique = new Set(doc);
    for (const term of unique) {
      termDocFreq.set(term, (termDocFreq.get(term) ?? 0) + 1);
    }
  }

  const idf = new Map<string, number>();
  for (const [term, freq] of termDocFreq) {
    idf.set(term, Math.log((docCount + 1) / (freq + 1)) + 1);
  }
  return idf;
}

function tfidfScore(queryTerms: string[], docTerms: string[], idf: Map<string, number>): number {
  const termFreq = new Map<string, number>();
  for (const term of docTerms) {
    termFreq.set(term, (termFreq.get(term) ?? 0) + 1);
  }

  let score = 0;
  for (const qTerm of queryTerms) {
    const tf = (termFreq.get(qTerm) ?? 0) / Math.max(docTerms.length, 1);
    const idfVal = idf.get(qTerm) ?? 1;
    score += tf * idfVal;
  }
  return score;
}

const STOP_WORDS = new Set([
  'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had',
  'her', 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his',
  'how', 'its', 'may', 'new', 'now', 'old', 'see', 'two', 'who', 'did',
  'any', 'each', 'from', 'have', 'that', 'this', 'they', 'will', 'with',
  'such', 'been', 'than', 'then', 'when', 'also', 'into', 'more', 'some',
  'than', 'shall', 'upon', 'which', 'would', 'could', 'should', 'their',
  'there', 'where', 'while', 'after', 'before', 'between', 'pursuant',
]);
