/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Post-build asset copy script for Next.js standalone deployment.
 *
 * Next.js standalone output tracing leaves out static assets and dynamic
 * worker scripts like pdf.worker.mjs. This script ensures:
 * 1. public/ -> .next/standalone/public
 * 2. .next/static/ -> .next/standalone/.next/static
 * 3. node_modules/pdfjs-dist/legacy/build/ -> .next/standalone/node_modules/pdfjs-dist/legacy/build/
 * 4. node_modules/pdf-parse/dist/worker/ -> .next/standalone/node_modules/pdf-parse/dist/worker/
 */

const fs = require('fs');
const path = require('path');

function copyRecursive(src, dst) {
  if (!fs.existsSync(src)) {
    console.log(`[postbuild] Source does not exist, skipping: ${src}`);
    return;
  }
  fs.mkdirSync(dst, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const dstPath = path.join(dst, entry.name);
    if (entry.isDirectory()) {
      copyRecursive(srcPath, dstPath);
    } else {
      fs.copyFileSync(srcPath, dstPath);
    }
  }
}

console.log('[postbuild] Copying static assets and PDF worker files to standalone...');

// 1. Static assets
copyRecursive('public', '.next/standalone/public');
copyRecursive('.next/static', '.next/standalone/.next/static');

// 2. pdfjs-dist worker assets
const pdfjsDistLegacyBuildSrc = path.join('node_modules', 'pdfjs-dist', 'legacy', 'build');
const pdfjsDistLegacyBuildDst = path.join('.next', 'standalone', 'node_modules', 'pdfjs-dist', 'legacy', 'build');
copyRecursive(pdfjsDistLegacyBuildSrc, pdfjsDistLegacyBuildDst);

// 3. pdf-parse worker assets
const pdfParseWorkerSrc = path.join('node_modules', 'pdf-parse', 'dist', 'worker');
const pdfParseWorkerDst = path.join('.next', 'standalone', 'node_modules', 'pdf-parse', 'dist', 'worker');
copyRecursive(pdfParseWorkerSrc, pdfParseWorkerDst);

// 4. Verify critical worker files in standalone
const requiredWorker = path.join(pdfjsDistLegacyBuildDst, 'pdf.worker.mjs');
if (fs.existsSync(requiredWorker)) {
  const stats = fs.statSync(requiredWorker);
  console.log(`[postbuild] SUCCESS: Verified ${requiredWorker} (${stats.size} bytes)`);
} else {
  console.error(`[postbuild] FATAL: Failed to find ${requiredWorker}`);
  process.exit(1);
}

const requiredMjs = path.join(pdfjsDistLegacyBuildDst, 'pdf.mjs');
if (fs.existsSync(requiredMjs)) {
  console.log(`[postbuild] SUCCESS: Verified ${requiredMjs}`);
} else {
  console.error(`[postbuild] FATAL: Failed to find ${requiredMjs}`);
  process.exit(1);
}

console.log('[postbuild] All standalone assets and PDF workers successfully staged!');
