import { createTestDb } from '@/lib/db';
import {
  insertDocument,
  getDocumentById,
  listDocuments,
  updateDocumentStatus,
  deleteDocument,
  insertChunks,
  getChunksByDocumentId,
  upsertAnalysis,
  getAnalysis,
} from '@/lib/db/queries';

describe('Database Layer (In-Memory SQLite)', () => {
  let db: ReturnType<typeof createTestDb>;

  beforeEach(() => {
    db = createTestDb();
  });

  afterEach(() => {
    db.close();
  });

  it('inserts and retrieves a document record', () => {
    const doc = insertDocument(db, {
      filename: 'safe-nda.txt',
      original_name: 'Mutual NDA.txt',
      mime_type: 'text/plain',
      size_bytes: 4096,
    });

    expect(doc.id).toBeDefined();
    expect(doc.original_name).toBe('Mutual NDA.txt');
    expect(doc.status).toBe('uploaded');

    const fetched = getDocumentById(db, doc.id);
    expect(fetched).not.toBeNull();
    expect(fetched?.filename).toBe('safe-nda.txt');
  });

  it('updates document status with error message if provided', () => {
    const doc = insertDocument(db, {
      filename: 'broken.pdf',
      original_name: 'broken.pdf',
      mime_type: 'application/pdf',
      size_bytes: 1024,
    });

    updateDocumentStatus(db, doc.id, 'error', 'Extraction failed: corrupted stream');
    const updated = getDocumentById(db, doc.id);

    expect(updated?.status).toBe('error');
    expect(updated?.error_message).toBe('Extraction failed: corrupted stream');
  });

  it('stores and retrieves document chunks', () => {
    const doc = insertDocument(db, {
      filename: 'contract.txt',
      original_name: 'contract.txt',
      mime_type: 'text/plain',
      size_bytes: 2048,
    });

    const chunks = [
      { id: 'chunk-1', chunkIndex: 0, text: 'First chunk text' },
      { id: 'chunk-2', chunkIndex: 1, text: 'Second chunk text' },
    ];

    insertChunks(db, doc.id, chunks);
    const retrieved = getChunksByDocumentId(db, doc.id);

    expect(retrieved.length).toBe(2);
    expect(retrieved[0].text).toBe('First chunk text');
    expect(retrieved[1].text).toBe('Second chunk text');
  });

  it('upserts and retrieves JSON analysis data', () => {
    const doc = insertDocument(db, {
      filename: 'test.docx',
      original_name: 'test.docx',
      mime_type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      size_bytes: 5000,
    });

    const sampleSummary = {
      plainLanguageSummary: 'A test contract for consulting services.',
      keyPoints: ['Point 1', 'Point 2'],
    };

    upsertAnalysis(db, doc.id, 'summary', sampleSummary, 'mock-provider');
    const retrieved = getAnalysis<typeof sampleSummary>(db, doc.id, 'summary');

    expect(retrieved).not.toBeNull();
    expect(retrieved?.plainLanguageSummary).toBe('A test contract for consulting services.');
    expect(retrieved?.keyPoints.length).toBe(2);
  });

  it('cascades deletion of document to chunks and analyses', () => {
    const doc = insertDocument(db, {
      filename: 'delete-me.txt',
      original_name: 'delete-me.txt',
      mime_type: 'text/plain',
      size_bytes: 1000,
    });

    insertChunks(db, doc.id, [{ id: 'ch-1', chunkIndex: 0, text: 'sample' }]);
    upsertAnalysis(db, doc.id, 'summary', { test: true }, 'mock');

    deleteDocument(db, doc.id);

    expect(getDocumentById(db, doc.id)).toBeNull();
    expect(getChunksByDocumentId(db, doc.id).length).toBe(0);
    expect(getAnalysis(db, doc.id, 'summary')).toBeNull();
  });
});
