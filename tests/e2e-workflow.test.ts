/**
 * Complete End-to-End User Flow Integration Test.
 *
 * Verifies the full user journey:
 * 1. Seed/upload a contract
 * 2. Background processing (text extraction, chunking, analysis)
 * 3. Retrieve plain-language summary & metadata
 * 4. Retrieve categorized clauses & verify risk tags
 * 5. Retrieve risk audit & missing protections
 * 6. Query grounded Q&A with real citations
 * 7. Retrieve obligations matrix
 * 8. Generate lifecycle checklist
 * 9. Compare two contracts semantically
 * 10. Delete contract and verify cascading cleanup
 */

import { createTestDb } from '@/lib/db';
import {
  insertDocument,
  getDocumentById,
  insertChunks,
  getChunksByDocumentId,
  upsertAnalysis,
  getAnalysis,
  deleteDocument,
} from '@/lib/db/queries';
import { MockAIProvider } from '@/lib/ai/mock';
import { chunkText } from '@/lib/documents/chunker';
import { retrieveRelevantChunks } from '@/lib/rag/retriever';
import { validateAndFilterCitations } from '@/lib/rag/citation-validator';
import { SAMPLE_DOCUMENTS } from '@/lib/documents/samples';
import type {
  DocumentSummary,
  ClauseExtractionResult,
  RiskAnalysisResult,
  ObligationExtractionResult,
  Checklist,
} from '@/lib/ai/schemas';

describe('End-to-End Legal Analysis & Navigation Workflow', () => {
  let db: ReturnType<typeof createTestDb>;
  const provider = new MockAIProvider();

  beforeEach(() => {
    db = createTestDb();
  });

  afterEach(() => {
    db.close();
  });

  it('completes the entire end-to-end contract intelligence flow', async () => {
    // 1. Ingest Sample Agreement
    const sample = SAMPLE_DOCUMENTS[0]; // SaaS Agreement
    const docRecord = insertDocument(db, {
      filename: sample.name,
      original_name: sample.name,
      mime_type: 'text/plain',
      size_bytes: Buffer.byteLength(sample.content),
    });
    expect(docRecord.id).toBeDefined();

    // 2. Chunking & Storage
    const chunks = chunkText(sample.content, docRecord.id);
    expect(chunks.length).toBeGreaterThan(0);
    insertChunks(db, docRecord.id, chunks);
    const storedChunks = getChunksByDocumentId(db, docRecord.id);
    expect(storedChunks.length).toBe(chunks.length);

    // 3. Generate Summary & Metadata
    const summary = await provider.summarizeDocument(storedChunks, sample.content);
    upsertAnalysis(db, docRecord.id, 'summary', summary, provider.name);
    const retrievedSummary = getAnalysis<DocumentSummary>(db, docRecord.id, 'summary');
    expect(retrievedSummary?.plainLanguageSummary).toBeDefined();
    expect(retrievedSummary?.keyPoints.length).toBeGreaterThan(0);

    // 4. Extract Clauses
    const clauseResult = await provider.extractClauses(storedChunks);
    upsertAnalysis(db, docRecord.id, 'clauses', clauseResult, provider.name);
    const retrievedClauses = getAnalysis<ClauseExtractionResult>(db, docRecord.id, 'clauses');
    expect(retrievedClauses?.clauses.length).toBeGreaterThan(0);

    // 5. Audit Risks
    const riskResult = await provider.analyzeRisks(storedChunks, summary);
    upsertAnalysis(db, docRecord.id, 'risks', riskResult, provider.name);
    const retrievedRisks = getAnalysis<RiskAnalysisResult>(db, docRecord.id, 'risks');
    expect(retrievedRisks?.risks.length).toBeGreaterThan(0);

    // 6. Ask Grounded Question with Citation Integrity Pass
    const question = 'What happens if payment is delayed?';
    const relevantChunks = retrieveRelevantChunks(question, storedChunks, 4);
    expect(relevantChunks.length).toBeGreaterThan(0);

    const answer = await provider.answerQuestion(question, relevantChunks, docRecord.original_name);
    expect(answer.isGrounded).toBe(true);

    const citationVerification = validateAndFilterCitations(answer.citations, storedChunks);
    expect(citationVerification.allValid).toBe(true);

    // 7. Extract Obligations
    const obligations = await provider.extractObligations(storedChunks);
    upsertAnalysis(db, docRecord.id, 'obligations', obligations, provider.name);
    const retrievedObligations = getAnalysis<ObligationExtractionResult>(db, docRecord.id, 'obligations');
    expect(retrievedObligations?.obligations.length).toBeGreaterThan(0);

    // 8. Generate Checklist
    const checklist = await provider.generateChecklist(storedChunks, 'before-signing', summary);
    expect(checklist.items.length).toBeGreaterThan(0);
    expect(checklist.type).toBe('before-signing');

    // 9. Semantic Comparison with Second Document
    const sample2 = SAMPLE_DOCUMENTS[1]; // Mutual NDA
    const docRecord2 = insertDocument(db, {
      filename: sample2.name,
      original_name: sample2.name,
      mime_type: 'text/plain',
      size_bytes: Buffer.byteLength(sample2.content),
    });
    const chunks2 = chunkText(sample2.content, docRecord2.id);
    insertChunks(db, docRecord2.id, chunks2);

    const comparison = await provider.compareDocuments(
      storedChunks,
      chunks2,
      docRecord.original_name,
      docRecord2.original_name
    );
    expect(comparison.clauseComparisons.length).toBeGreaterThan(0);

    // 10. Cascading Deletion
    deleteDocument(db, docRecord.id);
    expect(getDocumentById(db, docRecord.id)).toBeNull();
    expect(getChunksByDocumentId(db, docRecord.id).length).toBe(0);
    expect(getAnalysis(db, docRecord.id, 'summary')).toBeNull();

    // Verify docRecord2 still exists (isolation)
    expect(getDocumentById(db, docRecord2.id)).not.toBeNull();
  });
});
