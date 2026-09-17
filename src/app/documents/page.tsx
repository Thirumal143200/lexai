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

export default function DocumentsLibraryPage() {
  const router = useRouter();
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'ready' | 'processing' | 'error'>('all');
  const [showUpload, setShowUpload] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchDocuments = useCallback(async () => {
    try {
      const res = await fetch('/api/documents');
      if (res.ok) {
        const data = await res.json() as { documents: DocumentRecord[] };
        setDocuments(data.documents || []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to permanently delete "${name}" and all of its analysis?`)) {
      return;
    }
    setDeletingId(id);
    try {
      const res = await fetch(`/api/documents/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setDocuments((prev) => prev.filter((d) => d.id !== id));
      } else {
        alert('Failed to delete document.');
      }
    } catch {
      alert('Error connecting to server.');
    } finally {
      setDeletingId(null);
    }
  };

  const filteredDocs = documents.filter((doc) => {
    const matchesSearch = doc.original_name.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || doc.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <AppLayout>
      <div style={{ maxWidth: 'var(--content-max)', margin: '0 auto' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-6)' }}>
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 600, color: 'var(--color-text)', letterSpacing: '-0.02em' }}>
              Document Library
            </h1>
            <p style={{ color: 'var(--color-text-2)', marginTop: 'var(--space-1)', fontSize: '0.9375rem' }}>
              Manage, review, and compare your uploaded legal contracts and documents.
            </p>
          </div>
          <button
            className="btn btn-primary"
            onClick={() => setShowUpload(!showUpload)}
          >
            {showUpload ? 'Close Upload' : '+ Upload Document'}
          </button>
        </div>

        {/* Upload drawer */}
        {showUpload && (
          <div className="card" style={{ marginBottom: 'var(--space-6)', border: '1px solid var(--color-accent-border)' }}>
            <div className="card-header">
              <h2 className="card-title">Add New Document</h2>
              <p className="card-description">Upload contracts in PDF, DOCX, or plain text format (up to 10MB)</p>
            </div>
            <div className="card-body">
              <UploadZone
                onUploadComplete={(newId) => {
                  setShowUpload(false);
                  fetchDocuments();
                  router.push(`/documents/${newId}`);
                }}
              />
            </div>
          </div>
        )}

        {/* Filter bar */}
        <div className="card" style={{ marginBottom: 'var(--space-4)', padding: 'var(--space-3)' }}>
          <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', gap: 'var(--space-2)', flex: '1 1 300px' }}>
              <input
                type="text"
                className="input"
                placeholder="Search documents by name…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ width: '100%' }}
              />
            </div>
            <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
              <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-3)', fontWeight: 500 }}>Status:</span>
              {(['all', 'ready', 'processing', 'error'] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`btn btn-sm ${statusFilter === st ? 'btn-secondary' : 'btn-ghost'}`}
                  style={{ textTransform: 'capitalize' }}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Documents Table */}
        <div className="card">
          <div className="card-body" style={{ padding: 0 }}>
            {loading ? (
              <div style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--color-text-3)' }}>
                Loading documents…
              </div>
            ) : filteredDocs.length === 0 ? (
              <div style={{ padding: 'var(--space-8)', textAlign: 'center' }}>
                <p style={{ color: 'var(--color-text-2)', fontSize: '0.9375rem' }}>No documents matched your criteria.</p>
                {search && (
                  <button
                    className="btn btn-ghost btn-sm"
                    style={{ marginTop: 'var(--space-2)' }}
                    onClick={() => { setSearch(''); setStatusFilter('all'); }}
                  >
                    Clear Filters
                  </button>
                )}
              </div>
            ) : (
              <table className="table" style={{ width: '100%' }}>
                <thead>
                  <tr>
                    <th>Filename</th>
                    <th>Status</th>
                    <th>Size</th>
                    <th>Uploaded</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDocs.map((doc) => (
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
                          {doc.status}
                        </span>
                      </td>
                      <td style={{ color: 'var(--color-text-3)', fontSize: '0.8125rem' }}>
                        {(doc.size_bytes / 1024).toFixed(1)} KB
                      </td>
                      <td style={{ color: 'var(--color-text-3)', fontSize: '0.8125rem' }}>
                        {new Date(doc.created_at).toLocaleDateString()}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: 'var(--space-1)' }}>
                          <Link href={`/documents/${doc.id}`} className="btn btn-ghost btn-sm">
                            Inspect
                          </Link>
                          <Link href={`/compare?a=${doc.id}`} className="btn btn-ghost btn-sm">
                            Compare
                          </Link>
                          <button
                            className="btn btn-ghost btn-sm"
                            style={{ color: 'var(--color-risk-high)' }}
                            disabled={deletingId === doc.id}
                            onClick={() => handleDelete(doc.id, doc.original_name)}
                          >
                            {deletingId === doc.id ? '…' : 'Delete'}
                          </button>
                        </div>
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
