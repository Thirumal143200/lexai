import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import { getDb } from '@/lib/db';
import { insertDocument } from '@/lib/db/queries';
import { saveUploadedFile, processDocument } from '@/lib/documents/processor';
import { SAMPLE_DOCUMENTS } from '@/lib/documents/samples';
import { toApiError } from '@/lib/utils/errors';
import { logger } from '@/lib/utils/logger';

export async function GET() {
  return NextResponse.json({
    samples: SAMPLE_DOCUMENTS.map((s) => ({
      id: s.id,
      name: s.name,
      type: s.type,
      description: s.description,
    })),
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { sampleId?: unknown };
    const sample = SAMPLE_DOCUMENTS.find((s) => s.id === body.sampleId);

    if (!sample) {
      return NextResponse.json(
        { error: 'Sample document not found. Valid IDs: ' + SAMPLE_DOCUMENTS.map(s => s.id).join(', ') },
        { status: 404 }
      );
    }

    const db = getDb();
    const buffer = Buffer.from(sample.content, 'utf-8');
    const filename = sample.name;
    const ext = path.extname(filename) || '.txt';

    const docRecord = insertDocument(db, {
      filename,
      original_name: filename,
      mime_type: 'text/plain',
      size_bytes: buffer.byteLength,
    });

    const filePath = await saveUploadedFile(buffer, docRecord.id, ext);
    logger.info('Sample document initialized', { documentId: docRecord.id, sampleId: sample.id });

    // Process document
    await processDocument(db, docRecord.id, filePath, 'text/plain');

    return NextResponse.json({ document: docRecord }, { status: 201 });
  } catch (err) {
    const apiErr = toApiError(err);
    return NextResponse.json({ error: apiErr.error }, { status: apiErr.statusCode });
  }
}
