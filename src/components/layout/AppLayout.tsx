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

      {/* Mobile nav bar */}
      <nav className="mobile-nav" aria-label="Mobile navigation">
        <Link href="/" className={pathname === '/' ? 'active' : ''}>
          <span aria-hidden>⌂</span> Dashboard
        </Link>
        <Link href="/documents" className={pathname === '/documents' ? 'active' : ''}>
          <span aria-hidden>◻</span> Documents
        </Link>
        <Link href="/compare" className={pathname === '/compare' ? 'active' : ''}>
          <span aria-hidden>⇄</span> Compare
        </Link>
        <Link href="/privacy" className={pathname === '/privacy' ? 'active' : ''}>
          <span aria-hidden>🔒</span> Privacy
        </Link>
        <Link href="/terms" className={pathname === '/terms' ? 'active' : ''}>
          <span aria-hidden>📜</span> Terms
        </Link>
      </nav>

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

        {/* Legal navigation */}
        <p className="sidebar-section-label" style={{ marginTop: 'var(--space-4)' }}>Legal &amp; Info</p>
        <ul className="sidebar-nav" role="list">
          <li className="sidebar-nav-item">
            <Link
              href="/privacy"
              className={pathname === '/privacy' ? 'active' : ''}
              aria-current={pathname === '/privacy' ? 'page' : undefined}
            >
              <span className="sidebar-nav-icon" aria-hidden>🔒</span>
              Privacy Policy
            </Link>
          </li>
          <li className="sidebar-nav-item">
            <Link
              href="/terms"
              className={pathname === '/terms' ? 'active' : ''}
              aria-current={pathname === '/terms' ? 'page' : undefined}
            >
              <span className="sidebar-nav-icon" aria-hidden>📜</span>
              Terms of Use
            </Link>
          </li>
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
        <div style={{ minHeight: 'calc(100vh - 120px)' }}>
          {children}
        </div>
        
        {/* Footer */}
        <footer
          style={{
            marginTop: 'var(--space-8)',
            paddingTop: 'var(--space-4)',
            borderTop: '1px solid var(--color-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 'var(--space-3)',
            fontSize: '0.8125rem',
            color: 'var(--color-text-3)',
          }}
          role="contentinfo"
        >
          <div>
            LexAI · General informational use only — not professional legal advice.
          </div>
          <div style={{ display: 'flex', gap: 'var(--space-4)' }}>
            <Link href="/privacy" style={{ color: 'var(--color-text-3)', textDecoration: 'none' }}>
              Privacy
            </Link>
            <Link href="/terms" style={{ color: 'var(--color-text-3)', textDecoration: 'none' }}>
              Terms
            </Link>
            <a
              href="https://github.com/Thirumal143200/lexai"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: 'var(--color-text-3)', textDecoration: 'none' }}
            >
              GitHub ↗
            </a>
          </div>
        </footer>
      </main>
    </div>
  );
}
