'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

const NAV_ITEMS = [
  { href: '/', label: 'Dashboard', icon: '⌂' },
  { href: '/documents', label: 'Documents', icon: '◻' },
  { href: '/compare', label: 'Compare', icon: '⇄' },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [aiMode, setAiMode] = useState<'live' | 'demo' | null>(null);

  useEffect(() => {
    // Detect AI mode from health endpoint — shown in UI banner
    fetch('/api/health')
      .then((r) => r.json())
      .then((data) => {
        if (data.aiMode === 'live' || data.aiMode === 'demo') {
          setAiMode(data.aiMode);
        }
      })
      .catch(() => {
        // Health check failure is non-fatal for UI
      });
  }, []);

  return (
    <div className="app-shell">
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>

      {/* Demo mode banner — only shown when running without a real API key */}
      {aiMode === 'demo' && (
        <div
          role="status"
          aria-live="polite"
          style={{
            background: 'var(--color-warning-bg, #fffbeb)',
            borderBottom: '1px solid var(--color-warning-border, #fbbf24)',
            color: 'var(--color-warning-text, #92400e)',
            textAlign: 'center',
            padding: '6px 16px',
            fontSize: '0.8125rem',
            fontWeight: 500,
            letterSpacing: '0.01em',
          }}
        >
          <span aria-hidden>⚠ </span>
          <strong>DEMO MODE</strong> — Running with mock AI responses. Set{' '}
          <code style={{ fontFamily: 'monospace', fontSize: '0.8em' }}>GEMINI_API_KEY</code>{' '}
          in <code style={{ fontFamily: 'monospace', fontSize: '0.8em' }}>.env.local</code> to
          enable live Gemini analysis.
        </div>
      )}

      {/* Top bar */}
      <header className="topbar" role="banner">
        <Link href="/" className="topbar-brand">
          <span className="topbar-brand-icon" aria-hidden>L</span>
          LexAI
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          {aiMode === 'live' && (
            <span
              title="Connected to live Gemini AI"
              style={{
                fontSize: '0.75rem',
                fontWeight: 600,
                color: '#16a34a',
                background: '#f0fdf4',
                border: '1px solid #bbf7d0',
                borderRadius: '9999px',
                padding: '2px 10px',
                letterSpacing: '0.04em',
              }}
            >
              ● LIVE AI
            </span>
          )}
          <span className="topbar-disclaimer" role="note">
            General information only — not legal advice
          </span>
        </div>
      </header>

      {/* Sidebar */}
      <nav className="sidebar" aria-label="Main navigation">
        <p className="sidebar-section-label">Workspace</p>
        <ul className="sidebar-nav" role="list">
          {NAV_ITEMS.map((item) => (
            <li key={item.href} className="sidebar-nav-item">
              <Link
                href={item.href}
                className={pathname === item.href ? 'active' : ''}
                aria-current={pathname === item.href ? 'page' : undefined}
              >
                <span className="sidebar-nav-icon" aria-hidden>{item.icon}</span>
                {item.label}
              </Link>
            </li>
          ))}
        </ul>

        {/* AI mode indicator in sidebar footer */}
        {aiMode !== null && (
          <div
            style={{
              marginTop: 'auto',
              padding: 'var(--space-3) var(--space-4)',
              borderTop: '1px solid var(--color-border)',
              fontSize: '0.75rem',
              color: 'var(--color-text-muted)',
            }}
          >
            AI:{' '}
            <span style={{ color: aiMode === 'live' ? '#16a34a' : 'var(--color-text-muted)', fontWeight: 600 }}>
              {aiMode === 'live' ? 'Gemini (Live)' : 'Mock (Demo)'}
            </span>
          </div>
        )}
      </nav>

      {/* Main */}
      <main className="main-content" id="main-content">
        {children}
      </main>
    </div>
  );
}
