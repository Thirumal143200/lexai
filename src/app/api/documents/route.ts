/**
 * POST /api/documents — Upload a document
 * GET  /api/documents — List all documents
 */

import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import { getDb } from '@/lib/db';
import { insertDocument, listDocuments } from '@/lib/db/queries';
import { validateUploadedFile } from '@/lib/security/validator';
import { saveUploadedFile, processDocument } from '@/lib/documents/processor';
import { toApiError } from '@/lib/utils/errors';
import { logger } from '@/lib/utils/logger';

export async function GET() {
  try {
    const db = getDb();
    const documents = listDocuments(db);
    return NextResponse.json({ documents });
  } catch (err) {
    const apiErr = toApiError(err);
    return NextResponse.json({ error: apiErr.error }, { status: apiErr.statusCode });
  }
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided.' }, { status: 400 });
    }

    // Validate before reading full content
    const validated = validateUploadedFile(file.name, file.type, file.size);

    // Defensively create Buffer — some Next.js runtimes on Node 26 produce
    // Uint8Array or detached ArrayBuffer from file.arrayBuffer()
    const arrayBuf = await file.arrayBuffer();
    const buffer = Buffer.from(new Uint8Array(arrayBuf));
    const db = getDb();

    // Create DB record first so we have a stable ID
    const ext = path.extname(validated.safeFilename);
    const docRecord = insertDocument(db, {
      filename: validated.safeFilename,
      original_name: file.name,
      mime_type: validated.mimeType,
      size_bytes: validated.sizeBytes,
    });

    // Save file to disk
    const filePath = await saveUploadedFile(buffer, docRecord.id, ext);

    logger.info('Document uploaded', { documentId: docRecord.id, ext, sizeBytes: validated.sizeBytes });

    // Process asynchronously — don't block the upload response
    processDocument(db, docRecord.id, filePath, validated.mimeType).catch((err) => {
      logger.error('Background processing failed', {
        documentId: docRecord.id,
        error: err instanceof Error ? err.message : String(err),
      });
    });

    return NextResponse.json({ document: docRecord }, { status: 201 });
  } catch (err) {
    const apiErr = toApiError(err);
    return NextResponse.json({ error: apiErr.error, code: apiErr.code }, { status: apiErr.statusCode });
  }
}
