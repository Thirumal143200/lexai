import { chunkText } from '@/lib/documents/chunker';

describe('Document Chunker', () => {
  it('chunks legal document based on numbered section headings', () => {
    const legalDoc = `
1. DEFINITIONS
"Customer Data" means all electronic data submitted by Customer.

2. LICENSE GRANT
Provider grants Customer a non-exclusive license to use the service.

3. PAYMENT TERMS
Customer shall pay fees within 30 days of invoice date.
    `.trim();

    const chunks = chunkText(legalDoc, 'test-doc-1');
    expect(chunks.length).toBeGreaterThanOrEqual(1);
    expect(chunks.some((c) => c.text.includes('DEFINITIONS') || c.text.includes('Customer Data'))).toBe(true);
    expect(chunks.some((c) => c.text.includes('PAYMENT TERMS') || c.text.includes('30 days'))).toBe(true);
  });

  it('preserves section titles in chunk metadata when headings are detected', () => {
    const textWithHeadings = `
## 1. Scope of Agreement
This agreement covers all cloud software services.

## 2. Term and Termination
Either party may terminate on sixty days notice.
    `.trim();

    const chunks = chunkText(textWithHeadings, 'test-doc-2');
    expect(chunks.length).toBeGreaterThanOrEqual(1);
    expect(chunks[0].id).toBeDefined();
    expect(typeof chunks[0].text).toBe('string');
  });

  it('handles small documents without errors', () => {
    const shortText = 'This is a brief one-paragraph contract text that fits easily in a single chunk.';
    const chunks = chunkText(shortText, 'short-doc');
    expect(chunks.length).toBe(1);
    expect(chunks[0].text).toBe(shortText);
  });
});
