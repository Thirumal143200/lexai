/**
 * Test suite for PDF extraction and worker loading.
 *
 * Verifies that pdf-parse / pdfjs-dist worker initialization succeeds,
 * extracts text accurately from valid PDF buffers, and handles malformed inputs.
 */

import { extractText } from '@/lib/documents/extractor';
import { AppError } from '@/lib/utils/errors';

// Minimal valid PDF containing readable text
const VALID_PDF_STRING = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>
endobj
4 0 obj
<< /Length 54 >>
stream
BT
/F1 24 Tf
100 700 Td
(Standalone PDF Extraction Test Succeeded) Tj
ET
endstream
endobj
5 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000244 00000 n 
0000000348 00000 n 
trailer
<< /Size 6 /Root 1 0 R >>
startxref
424
%%EOF`;

describe('PDF Extraction Pipeline & Worker Loading', () => {
  it('successfully initializes PDF worker and extracts text from a valid PDF buffer', async () => {
    const buffer = Buffer.from(VALID_PDF_STRING, 'utf-8');

    const result = await extractText(buffer, 'application/pdf');

    expect(result).toBeDefined();
    expect(result.extractionMethod).toBe('pdf');
    expect(result.text).toContain('Standalone PDF Extraction Test Succeeded');
    expect(result.pageCount).toBe(1);
  });

  it('rejects an empty or undersized PDF file', async () => {
    const tinyBuffer = Buffer.from('%PDF');

    await expect(extractText(tinyBuffer, 'application/pdf')).rejects.toThrow(AppError);
  });

  it('rejects a file missing the %PDF magic header', async () => {
    const fakeBuffer = Buffer.from('NOT A PDF FILE AT ALL');

    await expect(extractText(fakeBuffer, 'application/pdf')).rejects.toThrow(AppError);
  });
});
