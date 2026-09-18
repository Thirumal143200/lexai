/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs');
const path = require('path');

const samplePdf = `%PDF-1.4
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

async function main() {
  const standaloneDir = path.join(__dirname, '..', '.next', 'standalone');
  const pdfjsWorkerFile = path.join(standaloneDir, 'node_modules', 'pdfjs-dist', 'legacy', 'build', 'pdf.worker.mjs');
  const pdfjsMainFile = path.join(standaloneDir, 'node_modules', 'pdfjs-dist', 'legacy', 'build', 'pdf.mjs');
  const pdfParseWorkerFile = path.join(standaloneDir, 'node_modules', 'pdf-parse', 'dist', 'worker', 'pdf.worker.mjs');

  console.log('1. Checking required standalone files:');
  console.log('   pdf.mjs exists:', fs.existsSync(pdfjsMainFile));
  console.log('   pdfjs-dist pdf.worker.mjs exists:', fs.existsSync(pdfjsWorkerFile));
  console.log('   pdf-parse dist/worker/pdf.worker.mjs exists:', fs.existsSync(pdfParseWorkerFile));

  if (!fs.existsSync(pdfjsWorkerFile)) {
    throw new Error('MISSING REQUIRED WORKER: ' + pdfjsWorkerFile);
  }
  if (!fs.existsSync(pdfjsMainFile)) {
    throw new Error('MISSING REQUIRED PDF.MJS: ' + pdfjsMainFile);
  }

  // Change working directory to standalone to simulate production runtime
  process.chdir(standaloneDir);

  const { PDFParse } = require('pdf-parse');
  const workerModule = require('pdf-parse/worker');

  // Test 1: Test with setWorker using workerModule.getPath() converted to file:// URL
  console.log('\n2. Testing extraction with explicit setWorker(pathToFileURL(getPath()).href)...');
  const workerPath = workerModule.getPath();
  const { pathToFileURL } = require('url');
  const workerUrl = pathToFileURL(workerPath).href;
  console.log('   Worker URL:', workerUrl);
  PDFParse.setWorker(workerUrl);

  const parser1 = new PDFParse({ data: Buffer.from(samplePdf) });
  const result1 = await parser1.getText();
  const text1 = (result1.text || result1).trim();
  console.log('   Extracted text (Test 1):', text1);
  await parser1.destroy();

  if (!text1.includes('Standalone PDF Extraction Test Succeeded')) {
    throw new Error('Test 1 failed to match expected text! Got: ' + text1);
  }
  console.log('   -> Test 1 PASSED');

  // Test 2: Test with default worker resolution (resetting workerSrc to ./pdf.worker.mjs)
  console.log('\n3. Testing extraction with default pdfjs-dist worker resolution...');
  PDFParse.setWorker('./pdf.worker.mjs');
  const parser2 = new PDFParse({ data: Buffer.from(samplePdf) });
  const result2 = await parser2.getText();
  const text2 = (result2.text || result2).trim();
  console.log('   Extracted text (Test 2):', text2);
  await parser2.destroy();

  if (!text2.includes('Standalone PDF Extraction Test Succeeded')) {
    throw new Error('Test 2 failed to match expected text! Got: ' + text2);
  }
  console.log('   -> Test 2 PASSED');

  console.log('\nALL STANDALONE PDF EXTRACTION TESTS PASSED SUCCESSFULLY!');
}

main().catch((err) => {
  console.error('\nTEST SUITE FAILED:', err);
  process.exit(1);
});
