/**
 * GET    /api/documents/[id] — Get document details
 * DELETE /api/documents/[id] — Delete document and all associated data
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getDocumentById, deleteDocument } from '@/lib/db/queries';
import { validateDocumentId } from '@/lib/security/validator';
import { deleteStoredFile } from '@/lib/documents/processor';
import { toApiError, AppError } from '@/lib/utils/errors';
import { logger } from '@/lib/utils/logger';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const documentId = validateDocumentId(id);
    const db = getDb();
    const document = getDocumentById(db, documentId);

    if (!document) {
      throw new AppError('Document not found.', 404, 'NOT_FOUND');
    }

    return NextResponse.json({ document });
  } catch (err) {
    const apiErr = toApiError(err);
    return NextResponse.json({ error: apiErr.error }, { status: apiErr.statusCode });
  }
}

export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const documentId = validateDocumentId(id);
    const db = getDb();

    const document = getDocumentById(db, documentId);
    if (!document) {
      throw new AppError('Document not found.', 404, 'NOT_FOUND');
    }

    // Delete the stored file
    await deleteStoredFile(document.filename);

    // Delete DB record (cascades to chunks, analyses, questions)
    deleteDocument(db, documentId);

    logger.info('Document deleted', { documentId });
    return NextResponse.json({ success: true });
  } catch (err) {
    const apiErr = toApiError(err);
    return NextResponse.json({ error: apiErr.error }, { status: apiErr.statusCode });
  }
}
