/**
 * GET /api/health
 *
 * Application health and readiness check.
 * Reports application status, database connectivity, and AI configuration.
 * Does NOT call Gemini — health checks must be fast and cheap.
 *
 * Designed for load balancer and deployment platform health probes.
 */
import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET() {
  const checks: Record<string, string> = {};
  let overallStatus: 'ok' | 'degraded' = 'ok';

  // Database connectivity check
  try {
    const db = getDb();
    // Lightweight query — just verify the schema is intact
    db.prepare('SELECT COUNT(*) as count FROM documents').get();
    checks.database = 'ok';
  } catch {
    checks.database = 'error';
    overallStatus = 'degraded';
  }

  // AI configuration check — does not make any API calls
  const hasApiKey = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.length > 10);
  checks.ai = hasApiKey ? 'gemini' : 'demo-mode';

  return NextResponse.json(
    {
      status: overallStatus,
      version: process.env.npm_package_version ?? '0.1.0',
      timestamp: new Date().toISOString(),
      checks,
      // AI mode indicator for UI and deployment tooling
      aiMode: hasApiKey ? 'live' : 'demo',
    },
    {
      status: overallStatus === 'ok' ? 200 : 503,
      headers: {
        // Health endpoints must not be cached
        'Cache-Control': 'no-store, max-age=0',
      },
    }
  );
}
