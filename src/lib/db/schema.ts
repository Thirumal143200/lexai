/**
 * SQLite database schema and migrations.
 *
 * Design decisions:
 * - File-based SQLite: no server dependency, appropriate for this application's scale
 * - Analyses stored as JSON blobs: structured output from AI, queried rarely
 * - Chunks stored separately from analyses: allows re-analysis without re-extraction
 * - No user authentication table: session-based auth would be added for production multi-user
 */

export const SCHEMA_SQL = `
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

-- Core document record
CREATE TABLE IF NOT EXISTS documents (
  id            TEXT PRIMARY KEY,
  filename      TEXT NOT NULL,
  original_name TEXT NOT NULL,
  mime_type     TEXT NOT NULL,
  size_bytes    INTEGER NOT NULL,
  status        TEXT NOT NULL DEFAULT 'uploaded',
  -- status: uploaded | processing | ready | error
  error_message TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Extracted text chunks for RAG retrieval
CREATE TABLE IF NOT EXISTS document_chunks (
  id            TEXT PRIMARY KEY,
  document_id   TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  chunk_index   INTEGER NOT NULL,
  section_title TEXT,
  page_number   INTEGER,
  text          TEXT NOT NULL,
  -- Simple TF-IDF vector stored as JSON for local retrieval
  -- Avoids external vector DB dependency
  embedding_json TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

-- AI-generated analysis results (stored as validated JSON)
CREATE TABLE IF NOT EXISTS analyses (
  id            TEXT PRIMARY KEY,
  document_id   TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  type          TEXT NOT NULL,
  -- type: summary | clauses | risks | obligations | checklist | lawyer_prep
  result_json   TEXT NOT NULL,
  model_name    TEXT NOT NULL,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Q&A history for a document
CREATE TABLE IF NOT EXISTS questions (
  id            TEXT PRIMARY KEY,
  document_id   TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  question      TEXT NOT NULL,
  answer_json   TEXT NOT NULL,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Document comparison results
CREATE TABLE IF NOT EXISTS comparisons (
  id            TEXT PRIMARY KEY,
  document_a_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  document_b_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  result_json   TEXT NOT NULL,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_chunks_document_id ON document_chunks(document_id);
CREATE INDEX IF NOT EXISTS idx_analyses_document_id ON analyses(document_id);
CREATE INDEX IF NOT EXISTS idx_analyses_type ON analyses(document_id, type);
CREATE INDEX IF NOT EXISTS idx_questions_document_id ON questions(document_id);
CREATE INDEX IF NOT EXISTS idx_comparisons_docs ON comparisons(document_a_id, document_b_id);
`;
