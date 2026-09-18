/* eslint-disable @typescript-eslint/no-require-imports */
const { spawn } = require('child_process');
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

const PORT = 3096;
const BASE_URL = `http://127.0.0.1:${PORT}`;

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function waitForHealth(maxSeconds = 15) {
  const start = Date.now();
  while (Date.now() - start < maxSeconds * 1000) {
    try {
      const res = await fetch(`${BASE_URL}/api/health`);
      if (res.status === 200) return true;
    } catch {
      // wait
    }
    await sleep(500);
  }
  return false;
}

async function main() {
  console.log('[Test] Launching production standalone server on port', PORT);
  const server = spawn('node', ['server.js'], {
    cwd: path.resolve(__dirname, '..'),
    env: { ...process.env, PORT: String(PORT), HOSTNAME: '0.0.0.0' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  server.stdout.on('data', (d) => console.log(`[Server stdout] ${d.toString().trim()}`));
  server.stderr.on('data', (d) => console.error(`[Server stderr] ${d.toString().trim()}`));

  try {
    const isHealthy = await waitForHealth();
    if (!isHealthy) {
      throw new Error('Server did not become healthy within timeout');
    }
    console.log('[Test] Server is healthy! Uploading PDF...');

    const blob = new Blob([Buffer.from(samplePdf)], { type: 'application/pdf' });
    const formData = new FormData();
    formData.append('file', blob, 'sample_contract.pdf');

    const uploadRes = await fetch(`${BASE_URL}/api/documents`, {
      method: 'POST',
      body: formData,
    });

    if (uploadRes.status !== 201) {
      const errText = await uploadRes.text();
      throw new Error(`Upload failed with HTTP ${uploadRes.status}: ${errText}`);
    }

    const { document: doc } = await uploadRes.json();
    console.log('[Test] Upload accepted! Document ID:', doc.id);

    // Poll document status until ready or error
    let status = 'pending';
    let docData = null;
    for (let i = 0; i < 20; i++) {
      await sleep(1000);
      const docRes = await fetch(`${BASE_URL}/api/documents/${doc.id}`);
      if (docRes.status === 200) {
        docData = await docRes.json();
        status = docData.document.status;
        console.log(`[Test] Poll attempt ${i + 1}: status = ${status}`);
        if (status === 'ready' || status === 'error') break;
      }
    }

    if (status !== 'ready') {
      throw new Error(`Document processing did not reach ready! Final status: ${status} (error: ${docData?.document?.error_message})`);
    }

    console.log('[Test] SUCCESS! Document reached status "ready" through standalone production pipeline!');
  } finally {
    console.log('[Test] Shutting down server...');
    server.kill('SIGTERM');
  }
}

main().catch((err) => {
  console.error('[Test] FATAL ERROR:', err);
  process.exit(1);
});
