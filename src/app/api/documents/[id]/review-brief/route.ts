/**
 * GET /api/documents/[id]/review-brief
 * Generates a Legal Review Brief for a document.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getDocumentById, getChunksByDocumentId, getAnalysis } from '@/lib/db/queries';
import { validateDocumentId } from '@/lib/security/validator';
import { toApiError, AppError } from '@/lib/utils/errors';
import { getAIProvider } from '@/lib/ai';
import type { DocumentSummary, RiskAnalysisResult } from '@/lib/ai/schemas';

interface RouteParams { params: Promise<{ id: string }> }

export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const documentId = validateDocumentId(id);

    const db = getDb();
    const document = getDocumentById(db, documentId);
    if (!document) throw new AppError('Document not found.', 404, 'NOT_FOUND');
    if (document.status !== 'ready') {
      return NextResponse.json({ error: 'Document is still being processed.' }, { status: 202 });
    }

    const chunks = getChunksByDocumentId(db, documentId);
    const summary = getAnalysis<DocumentSummary>(db, documentId, 'summary');
    const risks = getAnalysis<{ risks: RiskAnalysisResult }>(db, documentId, 'risks')?.risks;

    const provider = getAIProvider();
    
    // Fallback generation if required analyses are missing from cache
    const summaryData = summary ?? await provider.summarizeDocument(chunks, chunks.map((c) => c.text).join('\n'));
    const risksData = risks ?? await provider.analyzeRisks(chunks, summaryData);

    const reviewBrief = await provider.generateDocumentReviewBrief(chunks, summaryData, risksData);

    return NextResponse.json({ reviewBrief });
  } catch (err) {
    const apiErr = toApiError(err);
    return NextResponse.json({ error: apiErr.error }, { status: apiErr.statusCode });
  }
}
