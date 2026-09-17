'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import UploadZone from '@/components/upload/UploadZone';

interface DocumentRecord {
  id: string;
  filename: string;
  original_name: string;
  status: 'pending' | 'processing' | 'ready' | 'error';
  size_bytes: number;
  created_at: string;
  error_message?: string;
}

interface SampleDocMeta {
  id: string;
  name: string;
  type: string;
  description: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [samples, setSamples] = useState<SampleDocMeta[]>([]);
  const [loadingSampleId, setLoadingSampleId] = useState<string | null>(null);
  const [sampleError, setSampleError] = useState<string | null>(null);

  const fetchDocuments = useCallback(async () => {
    try {
      const res = await fetch('/api/documents');
      if (res.ok) {
        const data = await res.json() as { documents: DocumentRecord[] };
        setDocuments(data.documents || []);
      }
    } catch {
      // Offline / network failure handled gracefully
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchSamples = useCallback(async () => {
    try {
      const res = await fetch('/api/documents/sample');
      if (res.ok) {
        const data = await res.json() as { samples: SampleDocMeta[] };
        setSamples(data.samples || []);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    fetchDocuments();
    fetchSamples();
  }, [fetchDocuments, fetchSamples]);

  const handleUploadComplete = (documentId: string) => {
    router.push(`/documents/${documentId}`);
  };

  const handleLoadSample = async (sampleId: string) => {
    setLoadingSampleId(sampleId);
    setSampleError(null);
    try {
      const res = await fetch('/api/documents/sample', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sampleId }),
      });
      const data = await res.json() as { document?: { id: string }; error?: string };
      if (res.ok && data.document?.id) {
        router.push(`/documents/${data.document.id}`);
      } else {
        setSampleError(data.error || 'Failed to load sample.');
      }
    } catch {
      setSampleError('Network error while loading sample document.');
    } finally {
      setLoadingSampleId(null);
    }
  };

  const readyDocs = documents.filter((d) => d.status === 'ready');
  const processingDocs = documents.filter((d) => d.status === 'processing');

  return (
    <AppLayout>
      <div style={{ maxWidth: 'var(--content-max)', margin: '0 auto' }}>
        
        {/* Page Header */}
        <div style={{ marginBottom: 'var(--space-6)' }}>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 600, color: 'var(--color-text)', letterSpacing: '-0.02em' }}>
            Legal Document Intelligence
          </h1>
          <p style={{ color: 'var(--color-text-2)', marginTop: 'var(--space-1)', fontSize: '0.9375rem' }}>
            Transform complex agreements into plain-language summaries, structured clause breakdowns, risk audits, and grounded Q&amp;A.
          </p>
        </div>

        {/* Legal Advisory Disclaimer */}
        <div className="notice notice-info" role="note" style={{ marginBottom: 'var(--space-6)' }}>
          <span aria-hidden="true">ℹ</span>
          <div>
            <strong>General Information Only — Not Legal Advice</strong>
            <p style={{ marginTop: '2px', fontSize: '0.875rem' }}>
              LexAI assists you in reading, navigating, and comparing legal contracts. It does not provide formal legal counsel or create an attorney-client relationship. Please verify critical provisions with a licensed attorney.
            </p>
          </div>
        </div>

        {/* Stats Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
          <div className="card">
            <div className="card-body" style={{ padding: 'var(--space-4)' }}>
              <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-3)', fontWeight: 500 }}>Total Documents</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 600, color: 'var(--color-text)', marginTop: 'var(--space-1)' }}>
                {documents.length}
              </div>
            </div>
          </div>
          <div className="card">
            <div className="card-body" style={{ padding: 'var(--space-4)' }}>
              <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-3)', fontWeight: 500 }}>Ready for Review</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 600, color: 'var(--color-risk-low)', marginTop: 'var(--space-1)' }}>
                {readyDocs.length}
              </div>
            </div>
          </div>
          <div className="card">
            <div className="card-body" style={{ padding: 'var(--space-4)' }}>
              <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-3)', fontWeight: 500 }}>Processing in Background</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 600, color: 'var(--color-processing)', marginTop: 'var(--space-1)' }}>
                {processingDocs.length}
              </div>
            </div>
          </div>
        </div>

        {/* Upload & Sample Section */}
        <div className="card" style={{ marginBottom: 'var(--space-6)' }}>
          <div className="card-header">
            <h2 className="card-title">Upload a Legal Document</h2>
            <p className="card-description">
              Upload any PDF, DOCX, or TXT contract. Extracted text remains private and is indexed locally.
            </p>
          </div>
          <div className="card-body">
            <UploadZone onUploadComplete={handleUploadComplete} />

            {/* Quick Sample Selector */}
            <div style={{ marginTop: 'var(--space-6)', borderTop: '1px solid var(--color-border)', paddingTop: 'var(--space-4)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-2)' }}>
                <span style={{ fontSize: '0.8125rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-3)' }}>
                  Or explore with realistic sample agreements
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 'var(--space-3)' }}>
                {samples.map((s) => (
                  <div
                    key={s.id}
                    style={{
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius)',
                      padding: 'var(--space-3)',
                      background: 'var(--color-surface-2)',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--color-text)' }}>{s.type}</div>
                      <p style={{ fontSize: '0.75rem', color: 'var(--color-text-2)', marginTop: '4px', lineHeight: 1.4 }}>
                        {s.description}
                      </p>
                    </div>
                    <button
                      className="btn btn-secondary btn-sm"
                      style={{ marginTop: 'var(--space-3)', alignSelf: 'flex-start' }}
                      disabled={loadingSampleId !== null}
                      onClick={() => handleLoadSample(s.id)}
                    >
                      {loadingSampleId === s.id ? 'Loading sample…' : 'Load Sample →'}
                    </button>
                  </div>
                ))}
              </div>
              {sampleError && (
                <div className="notice notice-error" style={{ marginTop: 'var(--space-3)' }}>
                  <span>⚠</span>
                  <p>{sampleError}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Quick Compare Callout */}
        <div
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius)',
            padding: 'var(--space-4)',
            marginBottom: 'var(--space-6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 'var(--space-4)',
          }}
        >
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--color-text)' }}>Compare Two Agreements</h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--color-text-2)', marginTop: '2px' }}>
              Detect shifts in liability caps, indemnification burdens, termination rights, and governing law between draft versions.
            </p>
          </div>
          <Link href="/compare" className="btn btn-secondary" style={{ flexShrink: 0 }}>
            Compare Contracts →
          </Link>
        </div>

        {/* Documents Table */}
        <div className="card">
          <div className="card-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h2 className="card-title">Recent Documents</h2>
              <p className="card-description">View, audit, and interrogate uploaded agreements</p>
            </div>
            {documents.length > 0 && (
              <Link href="/documents" className="btn btn-ghost btn-sm">
                View All ({documents.length})
              </Link>
            )}
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            {loading ? (
              <div style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--color-text-3)' }}>
                Loading documents…
              </div>
            ) : documents.length === 0 ? (
              <div style={{ padding: 'var(--space-8)', textAlign: 'center' }}>
                <p style={{ color: 'var(--color-text-2)', fontSize: '0.9375rem' }}>No documents uploaded yet.</p>
                <p style={{ color: 'var(--color-text-3)', fontSize: '0.8125rem', marginTop: 'var(--space-1)' }}>
                  Upload a PDF or Word document above or load a sample contract to test immediately.
                </p>
              </div>
            ) : (
              <table className="table" style={{ width: '100%' }}>
                <thead>
                  <tr>
                    <th>Document Name</th>
                    <th>Status</th>
                    <th>Size</th>
                    <th>Uploaded</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {documents.slice(0, 8).map((doc) => (
                    <tr key={doc.id}>
                      <td style={{ fontWeight: 500 }}>
                        <Link href={`/documents/${doc.id}`} style={{ color: 'var(--color-text)', textDecoration: 'none' }}>
                          {doc.original_name}
                        </Link>
                      </td>
                      <td>
                        <span className={`badge ${
                          doc.status === 'ready'
                            ? 'badge-low'
                            : doc.status === 'error'
                            ? 'badge-high'
                            : 'badge-neutral'
                        }`}>
                          {doc.status === 'ready' && 'Ready'}
                          {doc.status === 'processing' && 'Analysing…'}
                          {doc.status === 'pending' && 'Pending'}
                          {doc.status === 'error' && 'Error'}
                        </span>
                      </td>
                      <td style={{ color: 'var(--color-text-3)', fontSize: '0.8125rem' }}>
                        {(doc.size_bytes / 1024).toFixed(1)} KB
                      </td>
                      <td style={{ color: 'var(--color-text-3)', fontSize: '0.8125rem' }}>
                        {new Date(doc.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <Link href={`/documents/${doc.id}`} className="btn btn-ghost btn-sm">
                          Open Analysis →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

      </div>
    </AppLayout>
  );
}
