import Link from 'next/link';
import AppLayout from '@/components/layout/AppLayout';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'Privacy policy and data handling practices for LexAI hackathon demonstration.',
};

export default function PrivacyPage() {
  return (
    <AppLayout>
      <div style={{ maxWidth: '800px', margin: '0 auto', paddingBottom: 'var(--space-8)' }}>
        
        {/* Breadcrumb */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontSize: '0.8125rem', color: 'var(--color-text-3)', marginBottom: 'var(--space-4)' }}>
          <Link href="/" style={{ color: 'var(--color-text-3)', textDecoration: 'none' }}>Dashboard</Link>
          <span>/</span>
          <span style={{ color: 'var(--color-text)', fontWeight: 500 }}>Privacy Policy</span>
        </div>

        <div style={{ marginBottom: 'var(--space-6)' }}>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 600, color: 'var(--color-text)', letterSpacing: '-0.02em' }}>
            Privacy &amp; Data Handling Policy
          </h1>
          <p style={{ color: 'var(--color-text-2)', marginTop: 'var(--space-1)', fontSize: '0.9375rem' }}>
            Last updated: September 2026 · Hackathon Demonstration Deployment
          </p>
        </div>

        {/* Advisory Box */}
        <div className="notice notice-warning" style={{ marginBottom: 'var(--space-6)' }}>
          <span>⚠</span>
          <div>
            <strong>Demonstration Prototype Advisory</strong>
            <p style={{ marginTop: '2px', fontSize: '0.875rem' }}>
              LexAI is currently deployed as a public hackathon demonstration on ephemeral hosting infrastructure. <strong>Do not upload confidential, sensitive, classified, or proprietary legal documents.</strong>
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)', lineHeight: 1.6, fontSize: '0.9375rem', color: 'var(--color-text)' }}>
          
          <section className="card" style={{ padding: 'var(--space-5)' }}>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: 'var(--space-2)', color: 'var(--color-text)' }}>
              1. What LexAI Processes
            </h2>
            <p style={{ color: 'var(--color-text-2)', marginBottom: 'var(--space-2)' }}>
              When you use LexAI, the application processes the following data solely to fulfill your requested analysis:
            </p>
            <ul style={{ paddingLeft: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', color: 'var(--color-text-2)' }}>
              <li><strong>Uploaded Files:</strong> PDF, DOCX, and TXT files uploaded through the interface.</li>
              <li><strong>Extracted Text:</strong> Raw text parsed from your uploaded documents to enable section chunking and retrieval.</li>
              <li><strong>Analysis Cache:</strong> Generated plain-English summaries, extracted clauses, risk audits, obligations, and Q&amp;A history stored in an embedded SQLite database.</li>
            </ul>
          </section>

          <section className="card" style={{ padding: 'var(--space-5)' }}>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: 'var(--space-2)', color: 'var(--color-text)' }}>
              2. AI Processing &amp; Third-Party Services
            </h2>
            <p style={{ color: 'var(--color-text-2)', marginBottom: 'var(--space-2)' }}>
              LexAI operates in two operational modes:
            </p>
            <ul style={{ paddingLeft: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', color: 'var(--color-text-2)' }}>
              <li>
                <strong>Live AI Mode (Gemini):</strong> When enabled with a valid Google Gemini API key, extracted document chunks and analysis prompts are transmitted to Google&apos;s Gemini API endpoints (targeting <code>gemini-2.5-flash</code>) over encrypted HTTPS. Document content is transmitted solely for analysis and is wrapped in strict trust-boundary delimiters.
              </li>
              <li>
                <strong>Demo Mode:</strong> When operating without a Gemini API key, all analyses are generated locally using deterministic mock heuristics without transmitting any data over external networks.
              </li>
            </ul>
          </section>

          <section className="card" style={{ padding: 'var(--space-5)' }}>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: 'var(--space-2)', color: 'var(--color-text)' }}>
              3. Ephemeral Storage &amp; Data Retention
            </h2>
            <p style={{ color: 'var(--color-text-2)', marginBottom: 'var(--space-2)' }}>
              This demonstration instance is hosted on Render&apos;s free tier infrastructure:
            </p>
            <ul style={{ paddingLeft: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', color: 'var(--color-text-2)' }}>
              <li>All uploaded documents and database records reside on <strong>ephemeral container storage</strong>.</li>
              <li>When the service restarts, redeploys, or spins down due to inactivity, local storage is reset and all uploaded files and analysis records are permanently erased.</li>
              <li>We make no claims of permanent storage, enterprise backups, or encrypted cold-storage vaults on this demo deployment.</li>
              <li>You can manually delete any uploaded document at any time using the &ldquo;Delete&rdquo; button in the document workspace.</li>
            </ul>
          </section>

          <section className="card" style={{ padding: 'var(--space-5)' }}>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: 'var(--space-2)', color: 'var(--color-text)' }}>
              4. Cookies &amp; Tracking
            </h2>
            <p style={{ color: 'var(--color-text-2)' }}>
              LexAI respects your privacy. This application uses <strong>zero tracking cookies, zero third-party analytics scripts, and zero advertising trackers</strong>.
            </p>
          </section>

          <section className="card" style={{ padding: 'var(--space-5)' }}>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: 'var(--space-2)', color: 'var(--color-text)' }}>
              5. Contact &amp; Questions
            </h2>
            <p style={{ color: 'var(--color-text-2)' }}>
              For questions regarding this demonstration project or its implementation, please visit the project repository on GitHub.
            </p>
          </section>

        </div>
      </div>
    </AppLayout>
  );
}
