/**
 * Type-safe database query functions.
 * Thin layer over better-sqlite3 — no ORM, explicit SQL.
 */

import type Database from 'better-sqlite3';
import { randomUUID } from 'crypto';
import type { DocumentChunk } from '@/lib/ai/provider';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface DocumentRow {
  id: string;
  filename: string;
  original_name: string;
  mime_type: string;
  size_bytes: number;
  status: 'uploaded' | 'processing' | 'ready' | 'error';
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface AnalysisRow {
  id: string;
  document_id: string;
  type: string;
  result_json: string;
  model_name: string;
  created_at: string;
}

export interface QuestionRow {
  id: string;
  document_id: string;
  question: string;
  answer_json: string;
  created_at: string;
}

// ─── Document queries ────────────────────────────────────────────────────────

export function insertDocument(
  db: Database.Database,
  fields: Pick<DocumentRow, 'filename' | 'original_name' | 'mime_type' | 'size_bytes'>
): DocumentRow {
  const id = randomUUID();
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO documents (id, filename, original_name, mime_type, size_bytes, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, 'uploaded', ?, ?)
  `).run(id, fields.filename, fields.original_name, fields.mime_type, fields.size_bytes, now, now);

  return getDocumentById(db, id)!;
}

export function getDocumentById(db: Database.Database, id: string): DocumentRow | null {
  const row = db.prepare('SELECT * FROM documents WHERE id = ?').get(id) as DocumentRow | undefined;
  return row ?? null;
}

export function listDocuments(db: Database.Database): DocumentRow[] {
  return db.prepare('SELECT * FROM documents ORDER BY created_at DESC').all() as DocumentRow[];
}

export function updateDocumentStatus(
  db: Database.Database,
  id: string,
  status: DocumentRow['status'],
  errorMessage?: string
): void {
  db.prepare(`
    UPDATE documents SET status = ?, error_message = ?, updated_at = ? WHERE id = ?
  `).run(status, errorMessage ?? null, new Date().toISOString(), id);
}

export function deleteDocument(db: Database.Database, id: string): void {
  db.prepare('DELETE FROM documents WHERE id = ?').run(id);
}

// ─── Chunk queries ────────────────────────────────────────────────────────────

export function insertChunks(db: Database.Database, documentId: string, chunks: DocumentChunk[]): void {
  const insert = db.prepare(`
    INSERT INTO document_chunks (id, document_id, chunk_index, section_title, page_number, text, embedding_json)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  const insertMany = db.transaction((items: DocumentChunk[]) => {
    for (const chunk of items) {
      insert.run(
        chunk.id,
        documentId,
        chunk.chunkIndex ?? (chunk as unknown as { index?: number }).index ?? 0,
        chunk.sectionTitle ?? null,
        chunk.pageNumber ?? null,
        chunk.text,
        null // embeddings computed separately if needed
      );
    }
  });
  insertMany(chunks);
}

export function getChunksByDocumentId(db: Database.Database, documentId: string): DocumentChunk[] {
  const rows = db.prepare(
    'SELECT * FROM document_chunks WHERE document_id = ? ORDER BY chunk_index'
  ).all(documentId) as Array<{
    id: string;
    chunk_index: number;
    section_title: string | null;
    page_number: number | null;
    text: string;
  }>;

  return rows.map((r) => ({
    id: r.id,
    text: r.text,
    sectionTitle: r.section_title ?? undefined,
    pageNumber: r.page_number ?? undefined,
    chunkIndex: r.chunk_index,
  }));
}

// ─── Analysis queries ────────────────────────────────────────────────────────

export function upsertAnalysis(
  db: Database.Database,
  documentId: string,
  type: string,
  result: unknown,
  modelName: string
): void {
  const existing = db.prepare(
    'SELECT id FROM analyses WHERE document_id = ? AND type = ?'
  ).get(documentId, type) as { id: string } | null;

  if (existing) {
    db.prepare('UPDATE analyses SET result_json = ?, model_name = ?, created_at = ? WHERE id = ?')
      .run(JSON.stringify(result), modelName, new Date().toISOString(), existing.id);
  } else {
    db.prepare(`
      INSERT INTO analyses (id, document_id, type, result_json, model_name, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(randomUUID(), documentId, type, JSON.stringify(result), modelName, new Date().toISOString());
  }
}

export function getAnalysis<T>(db: Database.Database, documentId: string, type: string): T | null {
  const row = db.prepare(
    'SELECT result_json FROM analyses WHERE document_id = ? AND type = ?'
  ).get(documentId, type) as { result_json: string } | null;

  if (!row) return null;
  return JSON.parse(row.result_json) as T;
}

// ─── Question queries ────────────────────────────────────────────────────────

export function insertQuestion(
  db: Database.Database,
  documentId: string,
  question: string,
  answer: unknown
): QuestionRow {
  const id = randomUUID();
  db.prepare(`
    INSERT INTO questions (id, document_id, question, answer_json, created_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(id, documentId, question, JSON.stringify(answer), new Date().toISOString());

  return db.prepare('SELECT * FROM questions WHERE id = ?').get(id) as QuestionRow;
}

export function getQuestionsByDocumentId(db: Database.Database, documentId: string): QuestionRow[] {
  return db.prepare(
    'SELECT * FROM questions WHERE document_id = ? ORDER BY created_at DESC'
  ).all(documentId) as QuestionRow[];
}
