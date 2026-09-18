/**
 * Document processing pipeline.
 *
 * Orchestrates: extract → chunk → store → analyse
 * Each stage updates document status so the UI can show meaningful progress.
 *
 * Processing is triggered by the upload API route and runs in-process.
 * For higher scale, this would move to a background job queue.
 *
 * DESIGN: AI analysis runs ONLY during background processing (not on-demand
 * from API routes) to avoid duplicate Gemini calls. The summary/clauses/risks/
 * obligations routes read cached results from the DB.
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
  if (!fs.existsSync(/*turbopackIgnore: true*/ UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  }
  return UPLOAD_DIR;
}

export function buildStoragePath(documentId: string, extension: string): string {
  return path.join(/*turbopackIgnore: true*/ getUploadDir(), `${documentId}${extension}`);
}

export async function saveUploadedFile(buffer: Buffer, documentId: string, extension: string): Promise<string> {
  const filePath = buildStoragePath(documentId, extension);
  await fs.promises.writeFile(filePath, buffer);
  return filePath;
}

export async function deleteStoredFile(filename: string): Promise<void> {
  const filePath = path.join(/*turbopackIgnore: true*/ getUploadDir(), filename);
  if (fs.existsSync(/*turbopackIgnore: true*/ filePath)) {
    await fs.promises.unlink(filePath);
  }
}

/**
 * Full processing pipeline for an uploaded document.
 * Runs after the file is saved and the DB record is created.
 *
 * AI analysis is fire-and-forget: if Gemini fails for a specific analysis type,
 * the document still moves to 'ready' so the frontend can display whatever succeeded
 * and retry the rest on demand.
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

    // Stage 3: AI analysis — run summary, clauses, obligations in parallel
    // Each analysis is independently wrapped so failures don't block others
    const [summaryResult, clausesResult, obligationsResult] = await Promise.allSettled([
      provider.summarizeDocument(chunks, extracted.text),
      provider.extractClauses(chunks),
      provider.extractObligations(chunks),
    ]);

    // Store successful results
    if (summaryResult.status === 'fulfilled') {
      upsertAnalysis(db, documentId, 'summary', summaryResult.value, provider.name);
      logger.info('Summary analysis stored', { documentId });

      // Risks analysis depends on summary — run sequentially after
      try {
        const riskResult = await provider.analyzeRisks(chunks, summaryResult.value);
        upsertAnalysis(db, documentId, 'risks', riskResult, provider.name);
        logger.info('Risk analysis stored', { documentId });
      } catch (err) {
        const msg = err instanceof AppError ? `${err.code}: ${err.message}` : (err instanceof Error ? err.message : String(err));
        logger.warn('Risk analysis failed', { documentId, error: msg });
      }
    } else {
      const reason = summaryResult.reason;
      const msg = reason instanceof AppError
        ? `${reason.code}: ${reason.message}`
        : (reason instanceof Error ? reason.message : String(reason));
      logger.error('Summary generation failed', { documentId, error: msg, provider: provider.name });
    }

    if (clausesResult.status === 'fulfilled') {
      upsertAnalysis(db, documentId, 'clauses', clausesResult.value, provider.name);
    } else {
      const reason = clausesResult.reason;
      const msg = reason instanceof Error ? reason.message : String(reason);
      logger.warn('Clause extraction failed', { documentId, error: msg });
    }

    if (obligationsResult.status === 'fulfilled' && obligationsResult.value) {
      upsertAnalysis(db, documentId, 'obligations', obligationsResult.value, provider.name);
    } else if (obligationsResult.status === 'rejected') {
      const reason = obligationsResult.reason;
      const msg = reason instanceof Error ? reason.message : String(reason);
      logger.warn('Obligation extraction failed', { documentId, error: msg });
    }

    // Mark as ready even if some analyses failed — the frontend can retry individual analyses
    updateDocumentStatus(db, documentId, 'ready');
    logger.info('Document processing complete', { documentId });

  } catch (err) {
    const message = err instanceof Error ? err.message : 'Processing failed';
    logger.error('Document processing failed', { documentId, error: message });
    updateDocumentStatus(db, documentId, 'error', message);
    throw err;
  }
}
