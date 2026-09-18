/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Production entrypoint for Render deployment.
 *
 * Forces HOSTNAME=0.0.0.0 so Next.js standalone server binds to all interfaces,
 * allowing Render's reverse proxy (127.0.0.1 / internal IP) to route traffic.
 * In Docker/Render, process.env.HOSTNAME defaults to container ID (e.g. srv-c...),
 * which causes Next.js to bind only to that host, resulting in 502 Bad Gateway.
 */
const port = parseInt(process.env.PORT, 10) || 3000;
process.env.PORT = String(port);
process.env.HOSTNAME = '0.0.0.0';

console.log(`[LexAI Server] Binding to HOSTNAME=${process.env.HOSTNAME}, PORT=${process.env.PORT}`);

process.on('uncaughtException', (err) => {
  console.error('[LexAI Server FATAL uncaughtException]:', err);
});

process.on('unhandledRejection', (reason) => {
  console.error('[LexAI Server FATAL unhandledRejection]:', reason);
});

// Start standalone Next.js server
require('./.next/standalone/server.js');
