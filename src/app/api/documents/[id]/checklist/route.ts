/**
 * POST /api/documents/[id]/checklist
 * Generates an actionable checklist for a document.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getDocumentById, getChunksByDocumentId, getAnalysis } from '@/lib/db/queries';
import { validateDocumentId } from '@/lib/security/validator';
import { toApiError, AppError } from '@/lib/utils/errors';
import { getAIProvider } from '@/lib/ai';
import type { DocumentSummary } from '@/lib/ai/schemas';
import type { Checklist } from '@/lib/ai/schemas';

interface RouteParams { params: Promise<{ id: string }> }

const VALID_TYPES: Checklist['type'][] = [
  'before-signing', 'after-signing', 'termination', 'renewal', 'lawyer-questions',
];

export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const documentId = validateDocumentId(id);
    const body = await req.json() as { type?: unknown };

    if (!body.type || !VALID_TYPES.includes(body.type as Checklist['type'])) {
      return NextResponse.json(
        { error: `type must be one of: ${VALID_TYPES.join(', ')}` },
        { status: 400 }
      );
    }

    const db = getDb();
    const document = getDocumentById(db, documentId);
    if (!document) throw new AppError('Document not found.', 404, 'NOT_FOUND');
    if (document.status !== 'ready') {
      return NextResponse.json({ error: 'Document is still being processed.' }, { status: 202 });
    }

    const chunks = getChunksByDocumentId(db, documentId);
    const summary = getAnalysis<DocumentSummary>(db, documentId, 'summary');

    const provider = getAIProvider();
    const summaryData = summary ?? await provider.summarizeDocument(chunks, chunks.map((c) => c.text).join('\n'));
    const checklist = await provider.generateChecklist(chunks, body.type as Checklist['type'], summaryData);

    return NextResponse.json({ checklist });
  } catch (err) {
    const apiErr = toApiError(err);
    return NextResponse.json({ error: apiErr.error }, { status: apiErr.statusCode });
  }
}
