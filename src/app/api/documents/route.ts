/**
 * POST /api/documents — Upload a document
 * GET  /api/documents — List all documents
 */

import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import { getDb } from '@/lib/db';
import { insertDocument, listDocuments } from '@/lib/db/queries';
import { validateUploadedFile, validateFileBuffer } from '@/lib/security/validator';
import { checkRateLimit, getClientIp } from '@/lib/security/rate-limiter';
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
    const ip = getClientIp(req);
    const rateCheck = checkRateLimit('upload', ip, 20, 60);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: 'Upload rate limit exceeded. Please wait a moment.', code: 'RATE_LIMITED' },
        {
          status: 429,
          headers: { 'Retry-After': String(rateCheck.resetSeconds) },
        }
      );
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided.' }, { status: 400 });
    }

    // Validate metadata before reading full content
    const validated = validateUploadedFile(file.name, file.type, file.size);

    // Defensively create Buffer — some Next.js runtimes on Node 26 produce
    // Uint8Array or detached ArrayBuffer from file.arrayBuffer()
    const arrayBuf = await file.arrayBuffer();
    const buffer = Buffer.from(new Uint8Array(arrayBuf));

    // Validate binary content & magic bytes to block spoofed file extensions
    const ext = path.extname(validated.safeFilename);
    validateFileBuffer(buffer, ext);

    const db = getDb();
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
