import Link from 'next/link';
import AppLayout from '@/components/layout/AppLayout';

export default function NotFound() {
  return (
    <AppLayout>
      <div style={{ maxWidth: '600px', margin: '4rem auto', textAlign: 'center', padding: 'var(--space-6)' }}>
        <div style={{ fontSize: '3.5rem', fontWeight: 700, color: 'var(--color-accent)', marginBottom: 'var(--space-2)' }}>
          404
        </div>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--color-text)', marginBottom: 'var(--space-2)' }}>
          Page or Document Not Found
        </h1>
        <p style={{ color: 'var(--color-text-2)', fontSize: '0.9375rem', lineHeight: 1.6, marginBottom: 'var(--space-6)' }}>
          The requested page or document could not be found. It may have been moved, deleted, or cleared after a server restart on Render&apos;s ephemeral demo hosting.
        </p>
        <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/" className="btn btn-primary">
            Return to Dashboard
          </Link>
          <Link href="/documents" className="btn btn-secondary">
            View Documents
          </Link>
        </div>
      </div>
    </AppLayout>
  );
}
