import { retrieveRelevantChunks } from '@/lib/rag/retriever';
import type { DocumentChunk } from '@/lib/ai/provider';

describe('TF-IDF Retriever', () => {
  const sampleChunks: DocumentChunk[] = [
    {
      id: 'c1',
      chunkIndex: 0,
      text: 'Section 1. Definitions. "Confidential Information" means proprietary source code, trade secrets, financial records, and internal technical documentation.',
    },
    {
      id: 'c2',
      chunkIndex: 1,
      text: 'Section 2. Payment Terms. The Customer agrees to pay the annual fee within thirty (30) calendar days of receiving an invoice. Interest of 1.5% applies to late payments.',
    },
    {
      id: 'c3',
      chunkIndex: 2,
      text: 'Section 3. Limitation of Liability. The total aggregate liability of Provider shall not exceed fees paid in the previous three months. No consequential damages.',
    },
    {
      id: 'c4',
      chunkIndex: 3,
      text: 'Section 4. Termination for Convenience. Provider may terminate at any time upon sixty days prior written notice. Customer may only terminate for cause.',
    },
  ];

  it('retrieves the liability chunk when asked about damages or liability', () => {
    const results = retrieveRelevantChunks('What is the liability cap and damage limit?', sampleChunks, 2);
    expect(results.length).toBe(2);
    expect(results[0].id).toBe('c3');
  });

  it('retrieves the payment chunk when asked about invoices or fees', () => {
    const results = retrieveRelevantChunks('When are invoice payments due?', sampleChunks, 2);
    expect(results.length).toBe(2);
    expect(results[0].id).toBe('c2');
  });

  it('retrieves the termination chunk when asked about terminating the contract', () => {
    const results = retrieveRelevantChunks('Can either party terminate with written notice?', sampleChunks, 2);
    expect(results.length).toBe(2);
    expect(results[0].id).toBe('c4');
  });

  it('returns all chunks if topK exceeds total chunks', () => {
    const results = retrieveRelevantChunks('anything', sampleChunks, 10);
    expect(results.length).toBe(sampleChunks.length);
  });

  it('handles empty chunk lists safely', () => {
    const results = retrieveRelevantChunks('test query', [], 5);
    expect(results).toEqual([]);
  });
});
