/**
 * GET /api/documents/[id]/summary
 * Returns the plain-language summary. Generates it if not already cached.
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

    // Return cached result if available
    const cached = getAnalysis<DocumentSummary>(db, documentId, 'summary');
    if (cached) return NextResponse.json({ summary: cached });

    // Generate on demand if not yet available
    const chunks = getChunksByDocumentId(db, documentId);
    const provider = getAIProvider();
    const summary = await provider.summarizeDocument(chunks, chunks.map((c) => c.text).join('\n'));
    upsertAnalysis(db, documentId, 'summary', summary, provider.name);

    return NextResponse.json({ summary });
  } catch (err) {
    const apiErr = toApiError(err);
    return NextResponse.json({ error: apiErr.error }, { status: apiErr.statusCode });
  }
}
