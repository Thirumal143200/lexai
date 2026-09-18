import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getDocumentById, getChunksByDocumentId, getAnalysis, upsertAnalysis } from '@/lib/db/queries';
import { validateDocumentId } from '@/lib/security/validator';
import { toApiError, AppError } from '@/lib/utils/errors';
import { getAIProvider } from '@/lib/ai';
import type { ObligationExtractionResult } from '@/lib/ai/schemas';

interface RouteParams { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const documentId = validateDocumentId(id);
    const db = getDb();

    const document = getDocumentById(db, documentId);
    if (!document) throw new AppError('Document not found.', 404, 'NOT_FOUND');
    if (document.status === 'processing') return NextResponse.json({ status: 'processing' }, { status: 202 });

    const cached = getAnalysis<ObligationExtractionResult>(db, documentId, 'obligations');
    if (cached) return NextResponse.json({ obligations: cached.obligations });

    const chunks = getChunksByDocumentId(db, documentId);
    const provider = getAIProvider();
    const result = await provider.extractObligations(chunks);
    const meta = (provider as { lastExecutionMeta?: { modelAttempted: string } }).lastExecutionMeta;
    upsertAnalysis(db, documentId, 'obligations', result, meta?.modelAttempted ?? provider.name);

    return NextResponse.json({ obligations: result.obligations });
  } catch (err) {
    const apiErr = toApiError(err);
    return NextResponse.json({ error: apiErr.error }, { status: apiErr.statusCode });
  }
}
