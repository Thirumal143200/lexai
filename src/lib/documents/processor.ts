/**
 * Document processing pipeline.
 *
 * Orchestrates: extract → chunk → store → analyse
 * Each stage updates document status so the UI can show meaningful progress.
 *
 * Processing is triggered by the upload API route and runs in-process.
 * For higher scale, this would move to a background job queue.
 */

import fs from 'fs';
import path from 'path';
import type Database from 'better-sqlite3';
import { extractText } from './extractor';
import { chunkText } from './chunker';
import { insertChunks, updateDocumentStatus, upsertAnalysis } from '@/lib/db/queries';
import { getAIProvider } from '@/lib/ai';
import { logger } from '@/lib/utils/logger';
import { AppError } from '@/lib/utils/errors';

const UPLOAD_DIR = process.env.UPLOAD_DIR ?? path.join(process.cwd(), 'data', 'uploads');

export function getUploadDir(): string {
  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  }
  return UPLOAD_DIR;
}

export function buildStoragePath(documentId: string, extension: string): string {
  return path.join(getUploadDir(), `${documentId}${extension}`);
}

export async function saveUploadedFile(buffer: Buffer, documentId: string, extension: string): Promise<string> {
  const filePath = buildStoragePath(documentId, extension);
  await fs.promises.writeFile(filePath, buffer);
  return filePath;
}

export async function deleteStoredFile(filename: string): Promise<void> {
  const filePath = path.join(getUploadDir(), filename);
  if (fs.existsSync(filePath)) {
    await fs.promises.unlink(filePath);
  }
}

/**
 * Full processing pipeline for an uploaded document.
 * Runs after the file is saved and the DB record is created.
 */
export async function processDocument(
  db: Database.Database,
  documentId: string,
  filePath: string,
  mimeType: string
): Promise<void> {
  const provider = getAIProvider();

  try {
    updateDocumentStatus(db, documentId, 'processing');

    // Stage 1: Extract text
    const buffer = await fs.promises.readFile(filePath);
    const extracted = await extractText(buffer, mimeType);

    if (!extracted.text || extracted.text.trim().length < 50) {
      throw new AppError('No readable text could be extracted from this document.', 422, 'EMPTY_DOCUMENT');
    }

    // Stage 2: Chunk for retrieval
    const chunks = chunkText(extracted.text, documentId);
    insertChunks(db, documentId, chunks);

    logger.info('Document extracted and chunked', {
      documentId,
      chunkCount: chunks.length,
      method: extracted.extractionMethod,
    });

    // Stage 3: AI analysis — generate all analyses upfront
    const [summary, clauses, _risksPlaceholder, obligations] = await Promise.allSettled([
      provider.summarizeDocument(chunks, extracted.text),
      provider.extractClauses(chunks),
      null, // risks need summary first
      provider.extractObligations(chunks),
    ]);

    if (summary.status === 'fulfilled') {
      upsertAnalysis(db, documentId, 'summary', summary.value, provider.name);

      // Risks analysis uses summary context
      try {
        const riskResult = await provider.analyzeRisks(chunks, summary.value);
        upsertAnalysis(db, documentId, 'risks', riskResult, provider.name);
      } catch (err) {
        logger.warn('Risk analysis failed', { documentId, error: err instanceof Error ? err.message : String(err) });
      }
    } else {
      logger.warn('Summary generation failed', { documentId });
    }

    if (clauses.status === 'fulfilled') {
      upsertAnalysis(db, documentId, 'clauses', clauses.value, provider.name);
    }

    if (obligations.status === 'fulfilled' && obligations.value) {
      upsertAnalysis(db, documentId, 'obligations', obligations.value, provider.name);
    }

    updateDocumentStatus(db, documentId, 'ready');
    logger.info('Document processing complete', { documentId });

  } catch (err) {
    const message = err instanceof Error ? err.message : 'Processing failed';
    logger.error('Document processing failed', { documentId, error: message });
    updateDocumentStatus(db, documentId, 'error', message);
    throw err;
  }
}
