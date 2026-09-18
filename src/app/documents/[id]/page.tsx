'use client';

import { useState, useEffect, useCallback, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import type {
  DocumentSummary,
  ClauseExtractionResult,
  RiskAnalysisResult,
  ObligationExtractionResult,
  QuestionAnswer,
  Checklist,
  Citation,
} from '@/lib/ai/schemas';

interface DocumentMeta {
  id: string;
  filename: string;
  original_name: string;
  mime_type: string;
  size_bytes: number;
  status: 'pending' | 'processing' | 'ready' | 'error';
  error_message?: string;
  created_at: string;
}

interface QuestionHistoryItem {
  id: string;
  question: string;
  answer: QuestionAnswer;
  askedAt: string;
}

type WorkspaceTab = 'summary' | 'clauses' | 'risks' | 'obligations' | 'qa' | 'checklists';

export default function DocumentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const documentId = resolvedParams.id;
  const router = useRouter();

  // Document metadata
  const [doc, setDoc] = useState<DocumentMeta | null>(null);
  const [loadingDoc, setLoadingDoc] = useState(true);
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('summary');

  // Analyses data states — each has loading + error + data
  const [summary, setSummary] = useState<DocumentSummary | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  const [clausesData, setClausesData] = useState<ClauseExtractionResult | null>(null);
  const [loadingClauses, setLoadingClauses] = useState(false);
  const [clausesError, setClausesError] = useState<string | null>(null);
  const [clauseFilter, setClauseFilter] = useState<string>('all');

  const [risksData, setRisksData] = useState<RiskAnalysisResult | null>(null);
  const [loadingRisks, setLoadingRisks] = useState(false);
  const [risksError, setRisksError] = useState<string | null>(null);

  const [obligationsData, setObligationsData] = useState<ObligationExtractionResult['obligations'] | null>(null);
  const [loadingObligations, setLoadingObligations] = useState(false);
  const [obligationsError, setObligationsError] = useState<string | null>(null);

  // Q&A states
  const [questionInput, setQuestionInput] = useState('');
  const [askingQuestion, setAskingQuestion] = useState(false);
  const [qaHistory, setQaHistory] = useState<QuestionHistoryItem[]>([]);
  const [qaError, setQaError] = useState<string | null>(null);

  // Checklist states
  const [checklistType, setChecklistType] = useState<Checklist['type']>('before-signing');
  const [checklist, setChecklist] = useState<Checklist | null>(null);
  const [loadingChecklist, setLoadingChecklist] = useState(false);
  const [checklistError, setChecklistError] = useState<string | null>(null);
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});

  // 1. Fetch Document Info
  const fetchDoc = useCallback(async () => {
    try {
      const res = await fetch(`/api/documents/${documentId}`);
      if (res.ok) {
        const data = await res.json() as { document: DocumentMeta };
        setDoc(data.document);
      }
    } catch {
      // ignore
    } finally {
      setLoadingDoc(false);
    }
  }, [documentId]);

  // 2. Fetch Summary (with error handling and retry support)
  const fetchSummary = useCallback(async (forceRetry = false) => {
    if ((summary && !forceRetry) || loadingSummary) return;
    setLoadingSummary(true);
    setSummaryError(null);
    try {
      const res = await fetch(`/api/documents/${documentId}/summary`);
      if (res.ok) {
        const data = await res.json() as { summary?: DocumentSummary; status?: string };
        if (data.summary) {
          setSummary(data.summary);
        } else if (data.status === 'processing') {
          setSummaryError('Document is still being analysed. Please wait a moment and try again.');
        }
      } else {
        const data = await res.json().catch(() => ({ error: 'Analysis failed' })) as { error?: string };
        setSummaryError(data.error || `Analysis failed (HTTP ${res.status})`);
      }
    } catch {
      setSummaryError('Failed to connect to the server. Please try again.');
    } finally {
      setLoadingSummary(false);
    }
  }, [documentId, summary, loadingSummary]);

  // 3. Fetch Clauses
  const fetchClauses = useCallback(async (forceRetry = false) => {
    if ((clausesData && !forceRetry) || loadingClauses) return;
    setLoadingClauses(true);
    setClausesError(null);
    try {
      const res = await fetch(`/api/documents/${documentId}/clauses`);
      if (res.ok) {
        const data = await res.json() as ClauseExtractionResult;
        setClausesData(data);
      } else {
        const data = await res.json().catch(() => ({ error: 'Analysis failed' })) as { error?: string };
        setClausesError(data.error || `Analysis failed (HTTP ${res.status})`);
      }
    } catch {
      setClausesError('Failed to connect to the server. Please try again.');
    } finally {
      setLoadingClauses(false);
    }
  }, [documentId, clausesData, loadingClauses]);

  // 4. Fetch Risks
  const fetchRisks = useCallback(async (forceRetry = false) => {
    if ((risksData && !forceRetry) || loadingRisks) return;
    setLoadingRisks(true);
    setRisksError(null);
    try {
      const res = await fetch(`/api/documents/${documentId}/risks`);
      if (res.ok) {
        const data = await res.json() as { risks: RiskAnalysisResult };
        setRisksData(data.risks);
      } else {
        const data = await res.json().catch(() => ({ error: 'Analysis failed' })) as { error?: string };
        setRisksError(data.error || `Analysis failed (HTTP ${res.status})`);
      }
    } catch {
      setRisksError('Failed to connect to the server. Please try again.');
    } finally {
      setLoadingRisks(false);
    }
  }, [documentId, risksData, loadingRisks]);

  // 5. Fetch Obligations
  const fetchObligations = useCallback(async (forceRetry = false) => {
    if ((obligationsData && !forceRetry) || loadingObligations) return;
    setLoadingObligations(true);
    setObligationsError(null);
    try {
      const res = await fetch(`/api/documents/${documentId}/obligations`);
      if (res.ok) {
        const data = await res.json() as { obligations: ObligationExtractionResult['obligations'] };
        setObligationsData(data.obligations);
      } else {
        const data = await res.json().catch(() => ({ error: 'Analysis failed' })) as { error?: string };
        setObligationsError(data.error || `Analysis failed (HTTP ${res.status})`);
      }
    } catch {
      setObligationsError('Failed to connect to the server. Please try again.');
    } finally {
      setLoadingObligations(false);
    }
  }, [documentId, obligationsData, loadingObligations]);

  // 6. Fetch Q&A history
  const fetchQuestions = useCallback(async () => {
    try {
      const res = await fetch(`/api/documents/${documentId}/questions`);
      if (res.ok) {
        const data = await res.json() as { questions: QuestionHistoryItem[] };
        setQaHistory(data.questions || []);
      }
    } catch {
      // ignore
    }
  }, [documentId]);

  // 7. Fetch Checklist
  const fetchChecklist = useCallback(async (type: Checklist['type']) => {
    setLoadingChecklist(true);
    setChecklistError(null);
    try {
      const res = await fetch(`/api/documents/${documentId}/checklist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type }),
      });
      if (res.ok) {
        const data = await res.json() as { checklist: Checklist };
        setChecklist(data.checklist);
      } else {
        const data = await res.json().catch(() => ({ error: 'Failed to generate checklist' })) as { error?: string };
        setChecklistError(data.error || `Checklist generation failed (HTTP ${res.status})`);
      }
    } catch {
      setChecklistError('Failed to connect to the server. Please try again.');
    } finally {
      setLoadingChecklist(false);
    }
  }, [documentId]);

  useEffect(() => {
    fetchDoc();
    fetchQuestions();
  }, [fetchDoc, fetchQuestions]);

  // Auto-fetch data based on active tab
  useEffect(() => {
    if (!doc || doc.status !== 'ready') return;
    if (activeTab === 'summary') fetchSummary();
    if (activeTab === 'clauses') fetchClauses();
    if (activeTab === 'risks') fetchRisks();
    if (activeTab === 'obligations') fetchObligations();
    if (activeTab === 'checklists' && !checklist) fetchChecklist(checklistType);
  }, [activeTab, doc, fetchSummary, fetchClauses, fetchRisks, fetchObligations, checklist, fetchChecklist, checklistType]);

  // Submit Q&A
  const handleAskQuestion = async (qText?: string) => {
    const q = qText || questionInput;
    if (!q.trim() || askingQuestion) return;
    setAskingQuestion(true);
    setQaError(null);

    try {
      const res = await fetch(`/api/documents/${documentId}/questions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q }),
      });
      const data = await res.json() as { answer?: QuestionAnswer; error?: string };

      if (res.ok && data.answer) {
        setQaHistory((prev) => [
          {
            id: String(Date.now()),
            question: q,
            answer: data.answer!,
            askedAt: new Date().toISOString(),
          },
          ...prev,
        ]);
        setQuestionInput('');
      } else {
        setQaError(data.error || 'Failed to get an answer.');
      }
    } catch {
      setQaError('Error connecting to server.');
    } finally {
      setAskingQuestion(false);
    }
  };

  // Delete doc
  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this document?')) return;
    try {
      const res = await fetch(`/api/documents/${documentId}`, { method: 'DELETE' });
      if (res.ok) {
        router.push('/documents');
      }
    } catch {
      alert('Failed to delete document.');
    }
  };

  if (loadingDoc) {
    return (
      <AppLayout>
        <div style={{ maxWidth: 'var(--content-max)', margin: '0 auto', padding: 'var(--space-8)', textAlign: 'center' }}>
          Loading document workspace…
        </div>
      </AppLayout>
    );
  }

  if (!doc) {
    return (
      <AppLayout>
        <div style={{ maxWidth: 'var(--content-max)', margin: '0 auto' }}>
          <div className="notice notice-error">
            <span>⚠</span>
            <div>
              <strong>Document Not Found</strong>
              <p>The requested document could not be located in the database.</p>
              <Link href="/documents" className="btn btn-secondary btn-sm" style={{ marginTop: 'var(--space-2)' }}>
                Return to Documents
              </Link>
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div style={{ maxWidth: 'var(--content-max)', margin: '0 auto' }}>
        
        {/* Breadcrumb */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontSize: '0.8125rem', color: 'var(--color-text-3)', marginBottom: 'var(--space-3)' }}>
          <Link href="/documents" style={{ color: 'var(--color-text-3)', textDecoration: 'none' }}>
            Documents
          </Link>
          <span>/</span>
          <span style={{ color: 'var(--color-text)', fontWeight: 500 }}>{doc.original_name}</span>
        </div>

        {/* Document Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 'var(--space-4)', flexWrap: 'wrap', marginBottom: 'var(--space-4)' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              <h1 style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--color-text)', letterSpacing: '-0.02em' }}>
                {doc.original_name}
              </h1>
              <span className={`badge ${doc.status === 'ready' ? 'badge-low' : doc.status === 'error' ? 'badge-high' : 'badge-neutral'}`}>
                {doc.status}
              </span>
            </div>
            <div style={{ display: 'flex', gap: 'var(--space-4)', fontSize: '0.8125rem', color: 'var(--color-text-3)', marginTop: 'var(--space-1)' }}>
              <span>Size: {(doc.size_bytes / 1024).toFixed(1)} KB</span>
              <span>Uploaded: {new Date(doc.created_at).toLocaleDateString()}</span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
            <Link href={`/compare?a=${doc.id}`} className="btn btn-secondary btn-sm">
              Compare ⇄
            </Link>
            <button className="btn btn-ghost btn-sm" onClick={() => window.print()}>
              Print / Export ⎙
            </button>
            <button className="btn btn-ghost btn-sm" style={{ color: 'var(--color-risk-high)' }} onClick={handleDelete}>
              Delete
            </button>
          </div>
        </div>

        {/* Legal Advisory Notice */}
        <div className="notice notice-info" style={{ marginBottom: 'var(--space-4)', padding: 'var(--space-3)' }}>
          <span aria-hidden="true">ℹ</span>
          <div style={{ fontSize: '0.8125rem' }}>
            <strong>Legal Assistance Notice:</strong> This analysis is grounded in the document text to help non-lawyers understand key terms and potential risks. It does not constitute formal legal counsel. Always consult a qualified attorney for legal decisions.
          </div>
        </div>

        {/* Processing State Banner */}
        {doc.status === 'processing' && (
          <div className="notice notice-warning" style={{ marginBottom: 'var(--space-4)' }}>
            <span>⚙</span>
            <div>
              <strong>Document is currently being analysed</strong>
              <p style={{ marginTop: '2px', fontSize: '0.875rem' }}>
                Text extraction, chunking, and AI evaluations are running in the background. Please wait or refresh the page in a moment.
              </p>
            </div>
          </div>
        )}

        {/* Workspace Tab Navigation */}
        <div style={{ display: 'flex', gap: 'var(--space-2)', borderBottom: '1px solid var(--color-border)', marginBottom: 'var(--space-6)', overflowX: 'auto' }}>
          {[
            { id: 'summary', label: 'Summary & Overview' },
            { id: 'clauses', label: 'Clause Breakdown' },
            { id: 'risks', label: 'Risk & Red-Flags' },
            { id: 'obligations', label: 'Obligations & Timeline' },
            { id: 'qa', label: 'Ask Document (Q&A)' },
            { id: 'checklists', label: 'Checklists & Action Plan' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as WorkspaceTab)}
              style={{
                padding: 'var(--space-2) var(--space-4)',
                background: 'transparent',
                border: 'none',
                borderBottom: activeTab === tab.id ? '2px solid var(--color-accent)' : '2px solid transparent',
                color: activeTab === tab.id ? 'var(--color-accent)' : 'var(--color-text-2)',
                fontWeight: activeTab === tab.id ? 600 : 400,
                fontSize: '0.875rem',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── TAB 1: SUMMARY & OVERVIEW ── */}
        {activeTab === 'summary' && (
          <div aria-live="polite">
            {loadingSummary ? (
              <div style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--color-text-3)' }}>
                <div style={{ marginBottom: 'var(--space-2)' }}>⏳</div>
                Loading summary…
              </div>
            ) : summaryError ? (
              <div className="notice notice-error" role="alert" style={{ marginBottom: 'var(--space-4)' }}>
                <span>⚠</span>
                <div style={{ flex: 1 }}>
                  <strong>Summary Generation Failed</strong>
                  <p style={{ marginTop: '2px', fontSize: '0.875rem' }}>{summaryError}</p>
                  <button
                    className="btn btn-secondary btn-sm"
                    style={{ marginTop: 'var(--space-2)' }}
                    onClick={() => fetchSummary(true)}
                  >
                    Retry Summary
                  </button>
                </div>
              </div>
            ) : !summary ? (
              <div className="card" style={{ padding: 'var(--space-6)', textAlign: 'center' }}>
                <p style={{ color: 'var(--color-text-2)' }}>No summary generated yet.</p>
                <button className="btn btn-secondary btn-sm" style={{ marginTop: 'var(--space-3)' }} onClick={() => fetchSummary(true)}>
                  Generate Summary Now
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                {/* Meta Highlights */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-3)' }}>
                  <div className="card" style={{ padding: 'var(--space-3)' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-3)', fontWeight: 600, textTransform: 'uppercase' }}>Document Type</div>
                    <div style={{ fontWeight: 600, fontSize: '0.9375rem', marginTop: '2px' }}>{summary.metadata?.documentType || 'Legal Agreement'}</div>
                  </div>
                  <div className="card" style={{ padding: 'var(--space-3)' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-3)', fontWeight: 600, textTransform: 'uppercase' }}>Governing Law</div>
                    <div style={{ fontWeight: 600, fontSize: '0.9375rem', marginTop: '2px' }}>{summary.metadata?.governingLaw || 'Not specified'}</div>
                  </div>
                  <div className="card" style={{ padding: 'var(--space-3)' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-3)', fontWeight: 600, textTransform: 'uppercase' }}>Effective Date</div>
                    <div style={{ fontWeight: 600, fontSize: '0.9375rem', marginTop: '2px' }}>{summary.metadata?.effectiveDate || 'Not specified'}</div>
                  </div>
                  <div className="card" style={{ padding: 'var(--space-3)' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-3)', fontWeight: 600, textTransform: 'uppercase' }}>Jurisdiction</div>
                    <div style={{ fontWeight: 600, fontSize: '0.9375rem', marginTop: '2px' }}>{summary.metadata?.jurisdiction || 'Not specified'}</div>
                  </div>
                </div>

                {/* Parties */}
                {summary.metadata?.parties && summary.metadata.parties.length > 0 && (
                  <div className="card">
                    <div className="card-header">
                      <h3 className="card-title">Identified Parties</h3>
                    </div>
                    <div className="card-body" style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
                      {summary.metadata.parties.map((p, idx) => (
                        <div key={idx} style={{ background: 'var(--color-surface-2)', padding: 'var(--space-2) var(--space-3)', borderRadius: 'var(--radius-sm)' }}>
                          <span style={{ fontWeight: 600 }}>{p}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Plain-Language Narrative */}
                <div className="card">
                  <div className="card-header">
                    <h3 className="card-title">Plain-Language Summary</h3>
                    <p className="card-description">Simplified explanation of the agreement's purpose and effect</p>
                  </div>
                  <div className="card-body">
                    <p style={{ lineHeight: 1.6, fontSize: '0.9375rem', color: 'var(--color-text)' }}>
                      {summary.plainLanguageSummary}
                    </p>
                  </div>
                </div>

                {/* Key Points */}
                {summary.keyPoints && summary.keyPoints.length > 0 && (
                  <div className="card">
                    <div className="card-header">
                      <h3 className="card-title">Key Provisions &amp; Takeaways</h3>
                    </div>
                    <div className="card-body">
                      <ul style={{ paddingLeft: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                        {summary.keyPoints.map((item, idx) => (
                          <li key={idx} style={{ fontSize: '0.9375rem', lineHeight: 1.5, color: 'var(--color-text-2)' }}>
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── TAB 2: CLAUSE BREAKDOWN ── */}
        {activeTab === 'clauses' && (
          <div aria-live="polite">
            {loadingClauses ? (
              <div style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--color-text-3)' }}>
                <div style={{ marginBottom: 'var(--space-2)' }}>⏳</div>
                Extracting and analysing clauses…
              </div>
            ) : clausesError ? (
              <div className="notice notice-error" role="alert" style={{ marginBottom: 'var(--space-4)' }}>
                <span>⚠</span>
                <div style={{ flex: 1 }}>
                  <strong>Clause Analysis Failed</strong>
                  <p style={{ marginTop: '2px', fontSize: '0.875rem' }}>{clausesError}</p>
                  <button
                    className="btn btn-secondary btn-sm"
                    style={{ marginTop: 'var(--space-2)' }}
                    onClick={() => fetchClauses(true)}
                  >
                    Retry Clause Extraction
                  </button>
                </div>
              </div>
            ) : !clausesData || clausesData.clauses.length === 0 ? (
              <div className="card" style={{ padding: 'var(--space-6)', textAlign: 'center' }}>
                <p style={{ color: 'var(--color-text-2)' }}>No clauses extracted yet.</p>
                <button className="btn btn-secondary btn-sm" style={{ marginTop: 'var(--space-3)' }} onClick={() => fetchClauses(true)}>
                  Extract Clauses Now
                </button>
              </div>
            ) : (
              <div>
                {/* Filter tags */}
                <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap', marginBottom: 'var(--space-4)' }}>
                  {['all', 'termination', 'liability', 'indemnity', 'confidentiality', 'intellectual-property', 'payment', 'dispute-resolution', 'warranty'].map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setClauseFilter(cat)}
                      className={`btn btn-sm ${clauseFilter === cat ? 'btn-secondary' : 'btn-ghost'}`}
                      style={{ textTransform: 'capitalize' }}
                    >
                      {cat.replace('-', ' ')}
                    </button>
                  ))}
                </div>

                {/* Clauses list */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                  {clausesData.clauses
                    .filter((c) => clauseFilter === 'all' || c.category === clauseFilter)
                    .map((clause, idx) => (
                      <div key={idx} className="card">
                        <div className="card-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div>
                            <span className="badge badge-neutral" style={{ marginRight: 'var(--space-2)', textTransform: 'capitalize' }}>
                              {clause.category.replace('-', ' ')}
                            </span>
                            <span style={{ fontWeight: 600, fontSize: '0.9375rem' }}>
                              {clause.title || `Clause ${idx + 1}`}
                            </span>
                          </div>
                          <span className={`badge ${
                            clause.riskLevel === 'high'
                              ? 'badge-high'
                              : clause.riskLevel === 'medium'
                              ? 'badge-med'
                              : 'badge-low'
                          }`}>
                            {clause.riskLevel} risk
                          </span>
                        </div>
                        <div className="card-body">
                          {/* Plain-English explanation */}
                          <div style={{ background: 'var(--color-accent-soft)', padding: 'var(--space-3)', borderRadius: 'var(--radius-sm)', marginBottom: 'var(--space-3)', border: '1px solid var(--color-accent-border)' }}>
                            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-accent)', textTransform: 'uppercase', marginBottom: '2px' }}>
                              Plain English Meaning
                            </div>
                            <p style={{ fontSize: '0.875rem', color: 'var(--color-text)', lineHeight: 1.5 }}>
                              {clause.plainLanguageExplanation}
                            </p>
                          </div>

                          {/* Original Text Excerpt */}
                          <div style={{ marginTop: 'var(--space-2)' }}>
                            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-3)', textTransform: 'uppercase', marginBottom: '4px' }}>
                              Original Contract Language ({clause.sourceSection || 'Excerpt'})
                            </div>
                            <blockquote style={{ fontFamily: 'var(--font-legal)', fontSize: '0.875rem', color: 'var(--color-text-2)', borderLeft: '3px solid var(--color-border-strong)', paddingLeft: 'var(--space-3)', fontStyle: 'italic', margin: 0, lineHeight: 1.6 }}>
                              &ldquo;{clause.originalText}&rdquo;
                            </blockquote>
                          </div>

                          {clause.affectedParty && (
                            <div style={{ marginTop: 'var(--space-3)', paddingTop: 'var(--space-2)', borderTop: '1px solid var(--color-border)', fontSize: '0.8125rem', color: 'var(--color-text-3)' }}>
                              <strong>Affected Party:</strong> {clause.affectedParty}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── TAB 3: RISK & RED FLAGS ── */}
        {activeTab === 'risks' && (
          <div aria-live="polite">
            {loadingRisks ? (
              <div style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--color-text-3)' }}>
                <div style={{ marginBottom: 'var(--space-2)' }}>⏳</div>
                Auditing risks and contractual pitfalls…
              </div>
            ) : risksError ? (
              <div className="notice notice-error" role="alert" style={{ marginBottom: 'var(--space-4)' }}>
                <span>⚠</span>
                <div style={{ flex: 1 }}>
                  <strong>Risk Analysis Failed</strong>
                  <p style={{ marginTop: '2px', fontSize: '0.875rem' }}>{risksError}</p>
                  <button
                    className="btn btn-secondary btn-sm"
                    style={{ marginTop: 'var(--space-2)' }}
                    onClick={() => fetchRisks(true)}
                  >
                    Retry Risk Analysis
                  </button>
                </div>
              </div>
            ) : !risksData ? (
              <div className="card" style={{ padding: 'var(--space-6)', textAlign: 'center' }}>
                <p style={{ color: 'var(--color-text-2)' }}>No risk audit available yet.</p>
                <button className="btn btn-secondary btn-sm" style={{ marginTop: 'var(--space-3)' }} onClick={() => fetchRisks(true)}>
                  Run Risk Audit Now
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                {/* Overall Score */}
                <div className="card" style={{ borderLeft: `4px solid ${risksData.highAttentionCount > 0 ? 'var(--color-risk-high)' : risksData.reviewCount > 0 ? 'var(--color-risk-med)' : 'var(--color-risk-low)'}` }}>
                  <div className="card-body" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
                    <div>
                      <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-3)', fontWeight: 600, textTransform: 'uppercase' }}>
                        Overall Document Risk Assessment
                      </div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 600, marginTop: '2px' }}>
                        {risksData.highAttentionCount} High Attention · {risksData.reviewCount} Review · {risksData.informationalCount} Informational
                      </div>
                      <p style={{ fontSize: '0.875rem', color: 'var(--color-text-2)', marginTop: '4px' }}>
                        {risksData.overallAssessment}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Specific Risk Items */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--color-text)' }}>
                    Identified Concerns &amp; Hazards ({risksData.risks.length})
                  </h3>
                  {risksData.risks.map((risk, idx) => (
                    <div key={idx} className="card" style={{ padding: 'var(--space-4)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-2)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                          <span className={`badge ${risk.level === 'high-attention' ? 'badge-high' : risk.level === 'review' ? 'badge-med' : 'badge-low'}`}>
                            {risk.level.replace('-', ' ')}
                          </span>
                          <span style={{ fontWeight: 600, fontSize: '0.9375rem' }}>{risk.title}</span>
                        </div>
                        {risk.clauseReference && (
                          <span style={{ fontSize: '0.75rem', color: 'var(--color-text-3)', background: 'var(--color-surface-2)', padding: '2px 6px', borderRadius: 'var(--radius-sm)' }}>
                            {risk.clauseReference}
                          </span>
                        )}
                      </div>
                      <p style={{ fontSize: '0.875rem', color: 'var(--color-text-2)', lineHeight: 1.5 }}>
                        {risk.description}
                      </p>
                      <div style={{ marginTop: 'var(--space-2)', fontSize: '0.8125rem', color: 'var(--color-text-2)' }}>
                        <strong>Why it matters:</strong> {risk.whyItMatters}
                      </div>
                      {risk.suggestedAction && (
                        <div style={{ marginTop: 'var(--space-3)', padding: 'var(--space-2) var(--space-3)', background: 'var(--color-surface-2)', borderRadius: 'var(--radius-sm)', borderLeft: '3px solid var(--color-accent)' }}>
                          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-accent)', textTransform: 'uppercase' }}>
                            Recommended Action / Counter-Proposal:
                          </span>
                          <p style={{ fontSize: '0.8125rem', color: 'var(--color-text)', marginTop: '2px' }}>
                            {risk.suggestedAction}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── TAB 4: OBLIGATIONS & TIMELINE ── */}
        {activeTab === 'obligations' && (
          <div aria-live="polite">
            {loadingObligations ? (
              <div style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--color-text-3)' }}>
                <div style={{ marginBottom: 'var(--space-2)' }}>⏳</div>
                Extracting contractual obligations…
              </div>
            ) : obligationsError ? (
              <div className="notice notice-error" role="alert" style={{ marginBottom: 'var(--space-4)' }}>
                <span>⚠</span>
                <div style={{ flex: 1 }}>
                  <strong>Obligation Extraction Failed</strong>
                  <p style={{ marginTop: '2px', fontSize: '0.875rem' }}>{obligationsError}</p>
                  <button
                    className="btn btn-secondary btn-sm"
                    style={{ marginTop: 'var(--space-2)' }}
                    onClick={() => fetchObligations(true)}
                  >
                    Retry Obligation Extraction
                  </button>
                </div>
              </div>
            ) : !obligationsData || obligationsData.length === 0 ? (
              <div className="card" style={{ padding: 'var(--space-6)', textAlign: 'center' }}>
                <p style={{ color: 'var(--color-text-2)' }}>No obligations mapped yet.</p>
                <button className="btn btn-secondary btn-sm" style={{ marginTop: 'var(--space-3)' }} onClick={() => fetchObligations(true)}>
                  Extract Obligations Now
                </button>
              </div>
            ) : (
              <div className="card">
                <div className="card-header">
                  <h3 className="card-title">Contractual Obligations Matrix</h3>
                  <p className="card-description">Track affirmative and negative duties, timelines, and breach consequences</p>
                </div>
                <div className="card-body" style={{ padding: 0 }}>
                  <table className="table" style={{ width: '100%' }}>
                    <thead>
                      <tr>
                        <th>Responsible Party</th>
                        <th>Obligation</th>
                        <th>Deadline / Trigger</th>
                        <th>Consequence / Penalty</th>
                      </tr>
                    </thead>
                    <tbody>
                      {obligationsData.map((ob, idx) => (
                        <tr key={idx}>
                          <td style={{ fontWeight: 600 }}>{ob.party}</td>
                          <td style={{ fontSize: '0.875rem', color: 'var(--color-text-2)' }}>{ob.obligation}</td>
                          <td style={{ fontSize: '0.8125rem', color: 'var(--color-text-3)' }}>{ob.deadline || ob.trigger || 'Ongoing'}</td>
                          <td style={{ fontSize: '0.8125rem', color: 'var(--color-risk-high)' }}>
                            {ob.consequence || 'Unspecified breach'}
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

        {/* ── TAB 5: ASK THE DOCUMENT (RAG Q&A) ── */}
        {activeTab === 'qa' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }} aria-live="polite">
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">Ask the Document (Grounded Q&amp;A)</h3>
                <p className="card-description">
                  Ask any question about this agreement. Answers are retrieved directly from document chunks using TF-IDF and cited with exact excerpts.
                </p>
              </div>
              <div className="card-body">
                {/* Question Input */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleAskQuestion();
                  }}
                  style={{ display: 'flex', gap: 'var(--space-2)' }}
                >
                  <input
                    type="text"
                    className="input"
                    placeholder="e.g. Can the vendor terminate this contract for convenience?"
                    value={questionInput}
                    onChange={(e) => setQuestionInput(e.target.value)}
                    disabled={askingQuestion}
                    style={{ flex: 1 }}
                  />
                  <button type="submit" className="btn btn-primary" disabled={askingQuestion || !questionInput.trim()}>
                    {askingQuestion ? 'Searching…' : 'Ask'}
                  </button>
                </form>

                {qaError && (
                  <div className="notice notice-error" role="alert" style={{ marginTop: 'var(--space-3)' }}>
                    <span>⚠</span>
                    <p>{qaError}</p>
                  </div>
                )}

                {/* Prompt suggestions */}
                <div style={{ marginTop: 'var(--space-4)' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-text-3)', fontWeight: 600, textTransform: 'uppercase' }}>
                    Suggested Questions:
                  </span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)', marginTop: 'var(--space-1)' }}>
                    {[
                      'What are the termination conditions and notice periods?',
                      'Is there an automatic renewal clause?',
                      'What is the limitation of liability cap?',
                      'Can the terms be modified unilaterally?',
                      'What are the confidentiality obligations and term?',
                    ].map((sug, idx) => (
                      <button
                        key={idx}
                        className="btn btn-ghost btn-sm"
                        style={{ fontSize: '0.8125rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)' }}
                        onClick={() => {
                          setQuestionInput(sug);
                          handleAskQuestion(sug);
                        }}
                      >
                        {sug}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Q&A History */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              {qaHistory.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 'var(--space-6)', color: 'var(--color-text-3)' }}>
                  No questions asked yet. Choose a suggested question above or type your own.
                </div>
              ) : (
                qaHistory.map((item) => (
                  <div key={item.id} className="card" style={{ padding: 'var(--space-4)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-2)' }}>
                      <span style={{ fontWeight: 600, fontSize: '0.9375rem', color: 'var(--color-text)' }}>
                        Q: {item.question}
                      </span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--color-text-3)' }}>
                        {new Date(item.askedAt).toLocaleTimeString()}
                      </span>
                    </div>

                    {/* Answer text */}
                    <p style={{ fontSize: '0.9375rem', color: 'var(--color-text-2)', lineHeight: 1.6, marginTop: 'var(--space-2)' }}>
                      {item.answer.answer}
                    </p>

                    {/* Citations */}
                    {item.answer.citations && item.answer.citations.length > 0 && (
                      <div style={{ marginTop: 'var(--space-3)', borderTop: '1px solid var(--color-border)', paddingTop: 'var(--space-2)' }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-3)', fontWeight: 600, textTransform: 'uppercase' }}>
                          Grounded Citations from Document ({item.answer.citations.length}):
                        </span>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', marginTop: 'var(--space-1)' }}>
                          {item.answer.citations.map((cite: Citation, cIdx: number) => (
                            <blockquote
                              key={cIdx}
                              style={{
                                fontSize: '0.8125rem',
                                color: 'var(--color-text-2)',
                                background: 'var(--color-surface-2)',
                                padding: 'var(--space-2) var(--space-3)',
                                borderRadius: 'var(--radius-sm)',
                                borderLeft: '3px solid var(--color-accent)',
                                margin: 0,
                                fontStyle: 'italic',
                              }}
                            >
                              &ldquo;{cite.excerpt}&rdquo;
                            </blockquote>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ── TAB 6: CHECKLISTS & ACTION PLAN ── */}
        {activeTab === 'checklists' && (
          <div aria-live="polite">
            <div className="card" style={{ marginBottom: 'var(--space-4)' }}>
              <div className="card-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
                <div>
                  <h3 className="card-title">Actionable Checklist</h3>
                  <p className="card-description">Specific steps, due diligence points, and red flags to address</p>
                </div>
                <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
                  <select
                    className="input"
                    style={{ fontSize: '0.8125rem', padding: 'var(--space-1) var(--space-2)' }}
                    value={checklistType}
                    onChange={(e) => {
                      const newType = e.target.value as Checklist['type'];
                      setChecklistType(newType);
                      fetchChecklist(newType);
                    }}
                  >
                    <option value="before-signing">Before Signing (Due Diligence)</option>
                    <option value="after-signing">After Signing (Onboarding)</option>
                    <option value="lawyer-questions">Questions for Legal Counsel</option>
                    <option value="termination">Termination &amp; Exit Plan</option>
                    <option value="renewal">Contract Renewal</option>
                  </select>
                </div>
              </div>

              <div className="card-body">
                {loadingChecklist ? (
                  <div style={{ padding: 'var(--space-6)', textAlign: 'center', color: 'var(--color-text-3)' }}>
                    <div style={{ marginBottom: 'var(--space-2)' }}>⏳</div>
                    Generating checklist items…
                  </div>
                ) : checklistError ? (
                  <div className="notice notice-error" role="alert" style={{ marginBottom: 'var(--space-4)' }}>
                    <span>⚠</span>
                    <div style={{ flex: 1 }}>
                      <strong>Checklist Generation Failed</strong>
                      <p style={{ marginTop: '2px', fontSize: '0.875rem' }}>{checklistError}</p>
                      <button
                        className="btn btn-secondary btn-sm"
                        style={{ marginTop: 'var(--space-2)' }}
                        onClick={() => fetchChecklist(checklistType)}
                      >
                        Retry Checklist Generation
                      </button>
                    </div>
                  </div>
                ) : !checklist || checklist.items.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: 'var(--space-6)' }}>
                    <button className="btn btn-secondary btn-sm" onClick={() => fetchChecklist(checklistType)}>
                      Generate Checklist
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                    <div style={{ fontWeight: 600, fontSize: '0.9375rem', marginBottom: 'var(--space-1)' }}>
                      {checklist.title}
                    </div>
                    {checklist.items.map((item, idx) => {
                      const itemId = `check-${idx}`;
                      const isChecked = checkedItems[itemId] || false;

                      return (
                        <div
                          key={idx}
                          style={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: 'var(--space-3)',
                            padding: 'var(--space-3)',
                            background: isChecked ? 'var(--color-surface-2)' : 'var(--color-surface)',
                            border: '1px solid var(--color-border)',
                            borderRadius: 'var(--radius-sm)',
                          }}
                        >
                          <input
                            type="checkbox"
                            id={itemId}
                            checked={isChecked}
                            onChange={(e) => setCheckedItems({ ...checkedItems, [itemId]: e.target.checked })}
                            style={{ marginTop: '3px', cursor: 'pointer' }}
                          />
                          <div style={{ flex: 1 }}>
                            <label
                              htmlFor={itemId}
                              style={{
                                fontWeight: 500,
                                fontSize: '0.875rem',
                                color: isChecked ? 'var(--color-text-3)' : 'var(--color-text)',
                                textDecoration: isChecked ? 'line-through' : 'none',
                                cursor: 'pointer',
                              }}
                            >
                              {item.item}
                            </label>
                            {item.description && (
                              <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-2)', marginTop: '2px' }}>
                                {item.description}
                              </p>
                            )}
                          </div>
                          {item.priority && (
                            <span className={`badge ${item.priority === 'high' ? 'badge-high' : item.priority === 'medium' ? 'badge-med' : 'badge-low'}`}>
                              {item.priority}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

      </div>
    </AppLayout>
  );
}
