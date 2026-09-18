'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import AppLayout from '@/components/layout/AppLayout';
import type { ComparisonResult } from '@/lib/ai/schemas';

interface DocumentRecord {
  id: string;
  original_name: string;
  status: string;
}

function CompareContent() {
  const searchParams = useSearchParams();
  const initialA = searchParams.get('a') || '';
  const initialB = searchParams.get('b') || '';

  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [docAId, setDocAId] = useState(initialA);
  const [docBId, setDocBId] = useState(initialB);
  const [comparing, setComparing] = useState(false);
  const [comparison, setComparison] = useState<ComparisonResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchDocs = useCallback(async () => {
    try {
      const res = await fetch('/api/documents');
      if (res.ok) {
        const data = await res.json() as { documents: DocumentRecord[] };
        const ready = (data.documents || []).filter((d) => d.status === 'ready');
        setDocuments(ready);
        if (!docAId && ready.length > 0) setDocAId(ready[0].id);
        if (!docBId && ready.length > 1) setDocBId(ready[1].id);
      }
    } catch {
      // ignore
    }
  }, [docAId, docBId]);

  useEffect(() => {
    fetchDocs();
  }, [fetchDocs]);

  const handleCompare = async () => {
    if (!docAId || !docBId) {
      setError('Please select two distinct documents.');
      return;
    }
    if (docAId === docBId) {
      setError('Please select two different documents to compare.');
      return;
    }

    setComparing(true);
    setError(null);

    try {
      const res = await fetch('/api/compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentAId: docAId, documentBId: docBId }),
      });
      const data = await res.json() as { comparison?: ComparisonResult; error?: string };

      if (res.ok && data.comparison) {
        setComparison(data.comparison);
      } else {
        setError(data.error || 'Failed to compare documents.');
      }
    } catch {
      setError('Error connecting to comparison service.');
    } finally {
      setComparing(false);
    }
  };

  const docA = documents.find((d) => d.id === docAId);
  const docB = documents.find((d) => d.id === docBId);

  return (
    <div style={{ maxWidth: 'var(--content-max)', margin: '0 auto' }}>
      
      {/* Page Header */}
      <div style={{ marginBottom: 'var(--space-6)' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 600, color: 'var(--color-text)', letterSpacing: '-0.02em' }}>
          Document Comparison
        </h1>
        <p style={{ color: 'var(--color-text-2)', marginTop: 'var(--space-1)', fontSize: '0.9375rem' }}>
          Side-by-side comparative analysis of contractual provisions, liability risk allocation, and modified clauses.
        </p>
      </div>

      {/* Advisory Notice */}
      <div className="notice notice-info" style={{ marginBottom: 'var(--space-6)' }}>
        <span aria-hidden="true">ℹ</span>
        <div style={{ fontSize: '0.8125rem' }}>
          <strong>Comparison Guidance:</strong> LexAI evaluates semantic differences across key categories (liability, termination, indemnification, IP, payment, warranties). It presents objective, document-grounded comparisons to assist your review, without ranking agreements or drawing legal conclusions.
        </div>
      </div>

      {/* Selection Card */}
      <div className="card" style={{ marginBottom: 'var(--space-6)' }}>
        <div className="card-header">
          <h2 className="card-title">Select Agreements to Compare</h2>
          <p className="card-description">Choose two processed documents from your repository</p>
        </div>
        <div className="card-body">
          {documents.length < 2 ? (
            <div style={{ textAlign: 'center', padding: 'var(--space-4)' }}>
              <p style={{ color: 'var(--color-text-2)' }}>
                You need at least two processed documents to perform a comparison.
              </p>
              <Link href="/" className="btn btn-secondary btn-sm" style={{ marginTop: 'var(--space-3)' }}>
                Upload or Load Sample Contracts →
              </Link>
            </div>
          ) : (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 'var(--space-4)' }}>
                {/* Document A */}
                <div>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: '0.875rem', marginBottom: 'var(--space-1)' }}>
                    Document A (Baseline)
                  </label>
                  <select
                    className="input"
                    value={docAId}
                    onChange={(e) => setDocAId(e.target.value)}
                    style={{ width: '100%' }}
                  >
                    {documents.map((d) => (
                      <option key={d.id} value={d.id} disabled={d.id === docBId}>
                        {d.original_name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Document B */}
                <div>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: '0.875rem', marginBottom: 'var(--space-1)' }}>
                    Document B (Counter-proposal / Variant)
                  </label>
                  <select
                    className="input"
                    value={docBId}
                    onChange={(e) => setDocBId(e.target.value)}
                    style={{ width: '100%' }}
                  >
                    {documents.map((d) => (
                      <option key={d.id} value={d.id} disabled={d.id === docAId}>
                        {d.original_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {error && (
                <div className="notice notice-error" style={{ marginTop: 'var(--space-3)' }}>
                  <span>⚠</span>
                  <p>{error}</p>
                </div>
              )}

              <div style={{ marginTop: 'var(--space-4)', display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  className="btn btn-primary"
                  onClick={handleCompare}
                  disabled={comparing || !docAId || !docBId || docAId === docBId}
                >
                  {comparing ? 'Comparing agreements…' : 'Run Semantic Comparison →'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Comparison Results */}
      {comparison && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
          {/* Executive Summary */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Comparative Overview</h3>
              <p className="card-description">
                Comparing <strong>{comparison.docATitle || docA?.original_name}</strong> vs <strong>{comparison.docBTitle || docB?.original_name}</strong>
              </p>
            </div>
            <div className="card-body">
              <p style={{ lineHeight: 1.6, fontSize: '0.9375rem', color: 'var(--color-text)' }}>
                {comparison.overallSummary}
              </p>

              {/* Changes tally */}
              <div style={{ display: 'flex', gap: 'var(--space-3)', marginTop: 'var(--space-4)', flexWrap: 'wrap' }}>
                <span className="badge badge-low">{comparison.modifiedCount} Modified</span>
                <span className="badge badge-neutral">{comparison.addedCount} Added in Doc B</span>
                <span className="badge badge-high">{comparison.removedCount} Removed</span>
                <span className="badge badge-neutral">{comparison.unchangedCount} Unchanged</span>
              </div>
            </div>
          </div>

          {/* Key Differences Bulletins */}
          {comparison.keyDifferences && comparison.keyDifferences.length > 0 && (
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">Key Differences Summary</h3>
              </div>
              <div className="card-body">
                <ul style={{ paddingLeft: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                  {comparison.keyDifferences.map((diff, idx) => (
                    <li key={idx} style={{ fontSize: '0.9375rem', color: 'var(--color-text-2)', lineHeight: 1.5 }}>
                      {diff}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Clause-by-Clause Differences Table */}
          {comparison.clauseComparisons && comparison.clauseComparisons.length > 0 && (
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">Clause-by-Clause Analysis ({comparison.clauseComparisons.length})</h3>
                <p className="card-description">Detailed provision breakdown and why each difference matters</p>
              </div>
              <div className="card-body" style={{ padding: 0 }}>
                <table className="table" style={{ width: '100%' }}>
                  <thead>
                    <tr>
                      <th style={{ width: '18%' }}>Category &amp; Change</th>
                      <th style={{ width: '36%' }}>Document A ({comparison.docATitle || 'Doc A'})</th>
                      <th style={{ width: '36%' }}>Document B ({comparison.docBTitle || 'Doc B'})</th>
                      <th style={{ width: '10%' }}>Impact</th>
                    </tr>
                  </thead>
                  <tbody>
                    {comparison.clauseComparisons.map((item, idx) => (
                      <tr key={idx}>
                        <td style={{ fontWeight: 600, verticalAlign: 'top' }}>
                          <div style={{ textTransform: 'capitalize' }}>{item.category.replace('-', ' ')}</div>
                          <span className={`badge ${
                            item.changeType === 'modified'
                              ? 'badge-med'
                              : item.changeType === 'added'
                              ? 'badge-low'
                              : item.changeType === 'removed'
                              ? 'badge-high'
                              : 'badge-neutral'
                          }`} style={{ marginTop: '4px' }}>
                            {item.changeType}
                          </span>
                        </td>
                        <td style={{ fontSize: '0.875rem', color: 'var(--color-text-2)', verticalAlign: 'top', lineHeight: 1.5 }}>
                          {item.docASection && <div style={{ fontSize: '0.75rem', color: 'var(--color-text-3)', marginBottom: '2px' }}>{item.docASection}</div>}
                          {item.docAText || <em style={{ color: 'var(--color-text-3)' }}>Not present in Document A</em>}
                        </td>
                        <td style={{ fontSize: '0.875rem', color: 'var(--color-text-2)', verticalAlign: 'top', lineHeight: 1.5 }}>
                          {item.docBSection && <div style={{ fontSize: '0.75rem', color: 'var(--color-text-3)', marginBottom: '2px' }}>{item.docBSection}</div>}
                          {item.docBText || <em style={{ color: 'var(--color-text-3)' }}>Not present in Document B</em>}
                        </td>
                        <td style={{ verticalAlign: 'top', fontSize: '0.8125rem', color: 'var(--color-text-2)' }}>
                          {item.whyItMatters || item.changeSummary || 'No commentary'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

    </div>
  );
}

export default function ComparePage() {
  return (
    <AppLayout>
      <Suspense fallback={<div style={{ padding: 'var(--space-8)', textAlign: 'center' }}>Loading comparison tool…</div>}>
        <CompareContent />
      </Suspense>
    </AppLayout>
  );
}
