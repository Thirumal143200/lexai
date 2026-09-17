/**
 * POST /api/compare
 * Compare two uploaded documents semantically.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getDocumentById, getChunksByDocumentId } from '@/lib/db/queries';
import { validateDocumentId } from '@/lib/security/validator';
import { toApiError, AppError } from '@/lib/utils/errors';
import { getAIProvider } from '@/lib/ai';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { documentAId?: unknown; documentBId?: unknown };

    if (typeof body.documentAId !== 'string' || typeof body.documentBId !== 'string') {
      return NextResponse.json({ error: 'documentAId and documentBId are required.' }, { status: 400 });
    }

    const idA = validateDocumentId(body.documentAId);
    const idB = validateDocumentId(body.documentBId);

    if (idA === idB) {
      return NextResponse.json({ error: 'Cannot compare a document with itself.' }, { status: 400 });
    }

    const db = getDb();
    const docA = getDocumentById(db, idA);
    const docB = getDocumentById(db, idB);

    if (!docA) throw new AppError(`Document A not found.`, 404, 'NOT_FOUND');
    if (!docB) throw new AppError(`Document B not found.`, 404, 'NOT_FOUND');

    if (docA.status !== 'ready' || docB.status !== 'ready') {
      return NextResponse.json(
        { error: 'Both documents must be fully processed before comparison.' },
        { status: 202 }
      );
    }

    const chunksA = getChunksByDocumentId(db, idA);
    const chunksB = getChunksByDocumentId(db, idB);

    const provider = getAIProvider();
    const result = await provider.compareDocuments(chunksA, chunksB, docA.original_name, docB.original_name);

    return NextResponse.json({ comparison: result });
  } catch (err) {
    const apiErr = toApiError(err);
    return NextResponse.json({ error: apiErr.error }, { status: apiErr.statusCode });
  }
}
