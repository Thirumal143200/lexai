/**
 * GET /api/documents/[id]/summary
 * Returns the plain-language summary. Generates it if not already cached.
 *
 * Guaranteed termination:
 * - Returns cached summary immediately (Cache-First)
 * - 35-second hard timeout for on-demand AI generation (HTTP 504 AI_TIMEOUT)
 * - Explicit error mapping for processing / missing documents
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getDocumentById, getChunksByDocumentId, getAnalysis, upsertAnalysis } from '@/lib/db/queries';
import { validateDocumentId } from '@/lib/security/validator';
import { toApiError, AppError } from '@/lib/utils/errors';
import { getAIProvider } from '@/lib/ai';
import type { DocumentSummary } from '@/lib/ai/schemas';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const documentId = validateDocumentId(id);
    const db = getDb();

    const document = getDocumentById(db, documentId);
    if (!document) throw new AppError('Document not found.', 404, 'NOT_FOUND');
    if (document.status === 'processing') {
      return NextResponse.json({ status: 'processing' }, { status: 202 });
    }
    if (document.status === 'error') {
      throw new AppError(document.error_message ?? 'Processing failed.', 422, 'PROCESSING_FAILED');
    }

    // 1. Return cached result if available (Cache-First)
    const cached = getAnalysis<DocumentSummary>(db, documentId, 'summary');
    if (cached) return NextResponse.json({ summary: cached });

    // 2. Validate chunks exist
    const chunks = getChunksByDocumentId(db, documentId);
    if (!chunks || chunks.length === 0) {
      throw new AppError('Document has no processed text chunks to summarize.', 422, 'EMPTY_DOCUMENT');
    }

    // 3. Generate on demand with 35-second hard timeout
    const provider = getAIProvider();
    const summaryPromise = provider.summarizeDocument(chunks, chunks.map((c) => c.text).join('\n'));

    let timeoutHandle: NodeJS.Timeout | null = null;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutHandle = setTimeout(() => {
        reject(new AppError('Summary generation timed out. Please retry.', 504, 'AI_TIMEOUT'));
      }, 35000);
    });

    try {
      const summary = await Promise.race([summaryPromise, timeoutPromise]);
      if (timeoutHandle) clearTimeout(timeoutHandle);
      upsertAnalysis(db, documentId, 'summary', summary, provider.name);
      return NextResponse.json({ summary });
    } finally {
      if (timeoutHandle) clearTimeout(timeoutHandle);
    }
  } catch (err) {
    const apiErr = toApiError(err);
    return NextResponse.json({ error: apiErr.error, code: apiErr.code }, { status: apiErr.statusCode });
  }
}
