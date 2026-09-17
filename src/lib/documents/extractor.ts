/**
 * Text extraction from PDF, DOCX, and plain-text files.
 *
 * Each extractor returns the raw text and a page count where available.
 * Extraction errors are caught and surfaced as typed AppErrors.
 */

import { AppError } from '@/lib/utils/errors';

export interface ExtractedText {
  text: string;
  pageCount?: number;
  extractionMethod: 'pdf' | 'docx' | 'txt';
}

export async function extractText(buffer: Buffer, mimeType: string): Promise<ExtractedText> {
  switch (mimeType) {
    case 'application/pdf':
      return extractFromPdf(buffer);
    case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
      return extractFromDocx(buffer);
    case 'text/plain':
      return extractFromTxt(buffer);
    default:
      throw new AppError(`Unsupported MIME type for extraction: ${mimeType}`, 415, 'UNSUPPORTED_FILE_TYPE');
  }
}

async function extractFromPdf(buffer: Buffer): Promise<ExtractedText> {
  try {
    // Dynamic import to support both v1 and v2 of pdf-parse
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pdfModule: any = await import('pdf-parse');
    let text = '';
    let pageCount: number | undefined;

    if (pdfModule.PDFParse) {
      const parser = new pdfModule.PDFParse({ data: buffer });
      const res = await parser.getText();
      text = typeof res === 'string' ? res : (res?.text || '');
      try {
        const info = await parser.getInfo();
        pageCount = info?.pages || info?.numPages;
      } catch {
        // ignore
      }
      await parser.destroy();
    } else if (typeof pdfModule === 'function') {
      const res = await pdfModule(buffer);
      text = res.text;
      pageCount = res.numpages;
    } else if (typeof pdfModule.default === 'function') {
      const res = await pdfModule.default(buffer);
      text = res.text;
      pageCount = res.numpages;
    }

    if (!text || text.trim().length < 50) {
      throw new AppError(
        'No readable text found in this PDF. It may be a scanned document or image-based PDF.',
        422,
        'EMPTY_DOCUMENT'
      );
    }

    return {
      text,
      pageCount,
      extractionMethod: 'pdf',
    };
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw new AppError(
      'Failed to read the PDF file. It may be corrupted or password-protected.',
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
