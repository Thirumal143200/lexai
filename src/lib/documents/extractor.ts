/**
 * Text extraction from PDF, DOCX, and plain-text files.
 *
 * Each extractor returns the raw text and a page count where available.
 * Extraction errors are caught and surfaced as typed AppErrors.
 */

import { AppError } from '@/lib/utils/errors';
import { logger } from '@/lib/utils/logger';

export interface ExtractedText {
  text: string;
  pageCount?: number;
  extractionMethod: 'pdf' | 'docx' | 'txt';
}

export async function extractText(buffer: Buffer, mimeType: string): Promise<ExtractedText> {
  // Ensure we have a proper Node.js Buffer regardless of runtime
  const safeBuffer = ensureNodeBuffer(buffer);

  logger.info('extractText called', {
    mimeType,
    bufferLength: safeBuffer.length,
    isBuffer: Buffer.isBuffer(safeBuffer),
    firstBytes: safeBuffer.length > 4 ? safeBuffer.subarray(0, 4).toString('hex') : 'empty',
  });

  switch (mimeType) {
    case 'application/pdf':
      return extractFromPdf(safeBuffer);
    case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
      return extractFromDocx(safeBuffer);
    case 'text/plain':
      return extractFromTxt(safeBuffer);
    default:
      throw new AppError(`Unsupported MIME type for extraction: ${mimeType}`, 415, 'UNSUPPORTED_FILE_TYPE');
  }
}

/**
 * Guarantee a real Node.js Buffer.
 * In some Next.js runtimes (especially on Render/Node 26), the Buffer from
 * `file.arrayBuffer()` may arrive as a Uint8Array or ArrayBuffer rather
 * than a true Node.js Buffer. pdf-parse requires a proper Buffer.
 */
function ensureNodeBuffer(input: Buffer | Uint8Array | ArrayBuffer): Buffer {
  if (Buffer.isBuffer(input)) return input;
  if (input instanceof Uint8Array) return Buffer.from(input.buffer, input.byteOffset, input.byteLength);
  if (input instanceof ArrayBuffer) return Buffer.from(input);
  // Last resort — force copy
  return Buffer.from(input as unknown as ArrayBuffer);
}

async function extractFromPdf(buffer: Buffer): Promise<ExtractedText> {
  // Validate PDF magic bytes (%PDF)
  if (buffer.length < 5) {
    throw new AppError('The uploaded file is too small to be a valid PDF.', 422, 'INVALID_PDF');
  }

  const header = buffer.subarray(0, 5).toString('ascii');
  if (!header.startsWith('%PDF')) {
    logger.warn('PDF header validation failed', { header, hex: buffer.subarray(0, 8).toString('hex') });
    throw new AppError(
      'The uploaded file does not appear to be a valid PDF (missing %PDF header).',
      422,
      'INVALID_PDF'
    );
  }

  try {
    // Dynamic import — Next.js bundler picks ESM or CJS entrypoint
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pdfModule: any = await import('pdf-parse');

    logger.info('pdf-parse module loaded', {
      hasPDFParse: !!pdfModule.PDFParse,
      isFunction: typeof pdfModule === 'function',
      hasDefault: typeof pdfModule.default === 'function',
      keys: Object.keys(pdfModule).slice(0, 10),
    });

    let text = '';
    let pageCount: number | undefined;

    if (pdfModule.PDFParse) {
      // Configure worker explicitly if setWorker and pdf-parse/worker are available
      if (typeof pdfModule.PDFParse.setWorker === 'function') {
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const workerModule: any = await import('pdf-parse/worker');
          if (typeof workerModule?.getPath === 'function') {
            const rawWorkerPath = workerModule.getPath();
            if (rawWorkerPath) {
              const { pathToFileURL } = await import('node:url');
              const workerUrl = rawWorkerPath.startsWith('file://')
                ? rawWorkerPath
                : pathToFileURL(rawWorkerPath).href;
              pdfModule.PDFParse.setWorker(workerUrl);
              logger.info('pdf-parse worker configured', { workerUrl });
            }
          }
        } catch (workerErr) {
          logger.warn('pdf-parse/worker setup skipped, using pdfjs-dist fallback', {
            error: workerErr instanceof Error ? workerErr.message : String(workerErr),
          });
        }
      }

      // pdf-parse v2 class API
      const parser = new pdfModule.PDFParse({ data: buffer });
      try {
        const res = await parser.getText();
        logger.info('PDFParse.getText() returned', {
          type: typeof res,
          hasText: typeof res === 'object' && !!res?.text,
          textLength: typeof res === 'string' ? res.length : res?.text?.length ?? 0,
        });
        text = typeof res === 'string' ? res : (res?.text || '');
        pageCount = typeof res === 'object' ? (res?.total ?? res?.pages?.length) : undefined;
      } catch (parseErr) {
        logger.warn('PDFParse.getText() threw', {
          error: parseErr instanceof Error ? parseErr.message : String(parseErr),
          name: parseErr instanceof Error ? parseErr.name : 'unknown',
        });
        throw parseErr;
      } finally {
        try { await parser.destroy(); } catch { /* ignore cleanup errors */ }
      }
    } else if (typeof pdfModule === 'function') {
      // pdf-parse v1 function API
      const res = await pdfModule(buffer);
      text = res.text;
      pageCount = res.numpages;
    } else if (typeof pdfModule.default === 'function') {
      // pdf-parse v1 default export
      const res = await pdfModule.default(buffer);
      text = res.text;
      pageCount = res.numpages;
    } else {
      logger.error('pdf-parse module has no usable export', { keys: Object.keys(pdfModule) });
      throw new Error('pdf-parse module loaded but no usable API found');
    }

    if (!text || text.trim().length < 50) {
      throw new AppError(
        'No readable text found in this PDF. It may be a scanned document or image-based PDF.',
        422,
        'EMPTY_DOCUMENT'
      );
    }

    logger.info('PDF extraction successful', { textLength: text.length, pageCount });

    return {
      text,
      pageCount,
      extractionMethod: 'pdf',
    };
  } catch (err) {
    if (err instanceof AppError) throw err;

    const msg = err instanceof Error ? err.message : String(err);
    const name = err instanceof Error ? err.name : 'unknown';

    logger.error('PDF extraction failed', { error: msg, errorName: name, bufferLength: buffer.length });

    // Provide specific error messages based on the failure type
    if (msg.includes('password') || msg.includes('Password') || name === 'PasswordException') {
      throw new AppError('This PDF is password-protected. Please remove the password and try again.', 422, 'PASSWORD_PROTECTED');
    }
    if (msg.includes('Invalid PDF') || msg.includes('InvalidPDF') || name === 'InvalidPDFException') {
      throw new AppError('The PDF file appears to be corrupted or invalid.', 422, 'INVALID_PDF');
    }

    throw new AppError(
      `Failed to extract text from the PDF: ${msg}`,
      422,
      'EXTRACTION_FAILED'
    );
  }
}

async function extractFromDocx(buffer: Buffer): Promise<ExtractedText> {
  try {
    const mammoth = await import('mammoth');
    const result = await mammoth.extractRawText({ buffer });

    if (!result.value || result.value.trim().length < 50) {
      throw new AppError('No readable text found in this document.', 422, 'EMPTY_DOCUMENT');
    }

    return {
      text: result.value,
      extractionMethod: 'docx',
    };
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw new AppError('Failed to read the DOCX file. It may be corrupted.', 422, 'EXTRACTION_FAILED');
  }
}

function extractFromTxt(buffer: Buffer): ExtractedText {
  const text = buffer.toString('utf-8');
  if (!text || text.trim().length < 10) {
    throw new AppError('The text file appears to be empty.', 422, 'EMPTY_DOCUMENT');
  }
  return { text, extractionMethod: 'txt' };
}
