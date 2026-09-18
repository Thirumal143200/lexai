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

  // Optional database connectivity check
  try {
    const db = getDb();
    db.prepare('SELECT COUNT(*) as count FROM documents').get();
    checks.database = 'ok';
  } catch {
    checks.database = 'initializing';
  }

  // AI configuration check — does not make any external API calls
  const hasApiKey = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.length > 10);
  checks.ai = hasApiKey ? 'gemini' : 'demo-mode';

  return NextResponse.json(
    {
      status: 'ok',
      version: process.env.npm_package_version ?? '0.1.0',
      timestamp: new Date().toISOString(),
      checks,
      aiMode: hasApiKey ? 'live' : 'demo',
    },
    {
      status: 200,
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      },
    }
  );
}
