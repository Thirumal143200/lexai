/**
 * POST /api/compare
 * Compare two uploaded documents semantically.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getDocumentById, getChunksByDocumentId, getComparison, saveComparison } from '@/lib/db/queries';
import { validateDocumentId } from '@/lib/security/validator';
import { checkRateLimit, getClientIp } from '@/lib/security/rate-limiter';
import { toApiError, AppError } from '@/lib/utils/errors';
import { getAIProvider } from '@/lib/ai';
import type { ComparisonResult } from '@/lib/ai/schemas';

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const rateCheck = checkRateLimit('compare', ip, 20, 60);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: 'Comparison rate limit reached. Please wait a moment.', code: 'RATE_LIMITED' },
        { status: 429, headers: { 'Retry-After': String(rateCheck.resetSeconds) } }
      );
    }

    const body = await req.json() as { documentAId?: unknown; documentBId?: unknown; force?: unknown };

    if (typeof body.documentAId !== 'string' || typeof body.documentBId !== 'string') {
      return NextResponse.json({ error: 'documentAId and documentBId are required.' }, { status: 400 });
    }

    const idA = validateDocumentId(body.documentAId);
    const idB = validateDocumentId(body.documentBId);
    const force = Boolean(body.force);

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

    // Return cached comparison if available and not forced
    if (!force) {
      const cached = getComparison<ComparisonResult>(db, idA, idB);
      if (cached) {
        return NextResponse.json({ comparison: cached, cached: true });
      }
    }

    const chunksA = getChunksByDocumentId(db, idA);
    const chunksB = getChunksByDocumentId(db, idB);

    const provider = getAIProvider();
    const result = await provider.compareDocuments(chunksA, chunksB, docA.original_name, docB.original_name);

    // Save to cache
    saveComparison(db, idA, idB, result);

    return NextResponse.json({ comparison: result, cached: false });
  } catch (err) {
    const apiErr = toApiError(err);
    return NextResponse.json({ error: apiErr.error }, { status: apiErr.statusCode });
  }
}
