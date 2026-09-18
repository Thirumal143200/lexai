'use client';

import { useState, useEffect, useCallback, use, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import type {
  DocumentSummary,
  ClauseExtractionResult,
  RiskAnalysisResult,
  ObligationExtractionResult,
  QuestionAnswer,
  Citation,
  DocumentReviewBrief,
} from '@/lib/ai/schemas';
import {
  CLAUSE_FILTER_OPTIONS,
  CLAUSE_CATEGORY_DEFINITIONS,
  normalizeClauseCategory,
  type CanonicalClauseCategory,
} from '@/lib/ai/clause-classifier';

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

type WorkspaceTab = 'understand' | 'identify-clauses' | 'identify-risks' | 'identify-obligations' | 'ask' | 'prepare';

export default function DocumentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const documentId = resolvedParams.id;
  const router = useRouter();

  // Document metadata
  const [doc, setDoc] = useState<DocumentMeta | null>(null);
  const [loadingDoc, setLoadingDoc] = useState(true);
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('understand');

  // Analyses data states — each has loading + error + data
  const [summary, setSummary] = useState<DocumentSummary | null>(null);
  const [summaryMeta, setSummaryMeta] = useState<{ model?: string; source?: string } | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const loadingSummaryRef = useRef(false);

  const [clausesData, setClausesData] = useState<ClauseExtractionResult | null>(null);
  const [loadingClauses, setLoadingClauses] = useState(false);
  const [clausesError, setClausesError] = useState<string | null>(null);
  const loadingClausesRef = useRef(false);
  const [clauseFilter, setClauseFilter] = useState<string>('all');

  const [risksData, setRisksData] = useState<RiskAnalysisResult | null>(null);
  const [loadingRisks, setLoadingRisks] = useState(false);
  const [risksError, setRisksError] = useState<string | null>(null);
  const loadingRisksRef = useRef(false);

  const [obligationsData, setObligationsData] = useState<ObligationExtractionResult['obligations'] | null>(null);
  const [loadingObligations, setLoadingObligations] = useState(false);
  const [obligationsError, setObligationsError] = useState<string | null>(null);
  const loadingObligationsRef = useRef(false);

  // Q&A states
  const [questionInput, setQuestionInput] = useState('');
  const [askingQuestion, setAskingQuestion] = useState(false);
  const [qaHistory, setQaHistory] = useState<QuestionHistoryItem[]>([]);
  const [qaError, setQaError] = useState<string | null>(null);

  // Act / Prepare states
  const [reviewBrief, setReviewBrief] = useState<DocumentReviewBrief | null>(null);
  const [loadingReviewBrief, setLoadingReviewBrief] = useState(false);
  const [reviewBriefError, setReviewBriefError] = useState<string | null>(null);

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

  // 2. Fetch Summary (with error handling, abort timeout, and retry support)
  const fetchSummary = useCallback(async (forceRetry = false) => {
    if (summary && !forceRetry) return;
    if (loadingSummaryRef.current) return;

    loadingSummaryRef.current = true;
    setLoadingSummary(true);
    setSummaryError(null);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 35000);

    try {
      const res = await fetch(`/api/documents/${documentId}/summary`, {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = (await res.json()) as { summary?: DocumentSummary; status?: string; meta?: { model?: string; source?: string } };
        if (data.summary) {
          setSummary(data.summary);
          setSummaryMeta(data.meta ?? null);
          setSummaryError(null);
        } else if (data.status === 'processing') {
          setSummaryError('Document is still being processed. Please wait a moment and click Retry.');
        } else {
          setSummaryError('Analysis completed but no summary content was returned. Please retry.');
        }
      } else {
        const data = (await res.json().catch(() => ({ error: 'Analysis failed' }))) as { error?: string; code?: string };
        if (res.status === 429 || data.code === 'AI_RATE_LIMITED') {
          setSummaryError('Live AI service is temporarily rate-limited. Click Retry to re-attempt analysis.');
        } else {
          setSummaryError(data.error || `Analysis failed (HTTP ${res.status})`);
        }
      }
    } catch (err) {
      clearTimeout(timeoutId);
      if (err instanceof Error && err.name === 'AbortError') {
        setSummaryError('Summary generation timed out after 35 seconds. Please click Retry.');
      } else {
        setSummaryError('Failed to connect to the server. Please check your connection and try again.');
      }
    } finally {
      loadingSummaryRef.current = false;
      setLoadingSummary(false);
    }
  }, [documentId, summary]);

  // 3. Fetch Clauses
  const fetchClauses = useCallback(async (forceRetry = false) => {
    if (clausesData && !forceRetry) return;
    if (loadingClausesRef.current) return;

    loadingClausesRef.current = true;
    setLoadingClauses(true);
    setClausesError(null);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 35000);

    try {
      const res = await fetch(`/api/documents/${documentId}/clauses`, {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = (await res.json()) as ClauseExtractionResult;
        setClausesData(data);
        setClausesError(null);
      } else {
        const data = (await res.json().catch(() => ({ error: 'Analysis failed' }))) as { error?: string };
        setClausesError(data.error || `Analysis failed (HTTP ${res.status})`);
      }
    } catch (err) {
      clearTimeout(timeoutId);
      if (err instanceof Error && err.name === 'AbortError') {
        setClausesError('Clause analysis timed out after 35 seconds. Please click Retry.');
      } else {
        setClausesError('Failed to connect to the server. Please try again.');
      }
    } finally {
      loadingClausesRef.current = false;
      setLoadingClauses(false);
    }
  }, [documentId, clausesData]);

  // 4. Fetch Risks
  const fetchRisks = useCallback(async (forceRetry = false) => {
    if (risksData && !forceRetry) return;
    if (loadingRisksRef.current) return;

    loadingRisksRef.current = true;
    setLoadingRisks(true);
    setRisksError(null);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 35000);

    try {
      const res = await fetch(`/api/documents/${documentId}/risks`, {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = (await res.json()) as { risks: RiskAnalysisResult };
        setRisksData(data.risks);
        setRisksError(null);
      } else {
        const data = (await res.json().catch(() => ({ error: 'Analysis failed' }))) as { error?: string };
        setRisksError(data.error || `Analysis failed (HTTP ${res.status})`);
      }
    } catch (err) {
      clearTimeout(timeoutId);
      if (err instanceof Error && err.name === 'AbortError') {
        setRisksError('Risk analysis timed out after 35 seconds. Please click Retry.');
      } else {
        setRisksError('Failed to connect to the server. Please try again.');
      }
    } finally {
      loadingRisksRef.current = false;
      setLoadingRisks(false);
    }
  }, [documentId, risksData]);

  // 5. Fetch Obligations
  const fetchObligations = useCallback(async (forceRetry = false) => {
    if (obligationsData && !forceRetry) return;
    if (loadingObligationsRef.current) return;

    loadingObligationsRef.current = true;
    setLoadingObligations(true);
    setObligationsError(null);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 35000);

    try {
      const res = await fetch(`/api/documents/${documentId}/obligations`, {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = (await res.json()) as { obligations: ObligationExtractionResult['obligations'] };
        setObligationsData(data.obligations);
        setObligationsError(null);
      } else {
        const data = (await res.json().catch(() => ({ error: 'Analysis failed' }))) as { error?: string };
        setObligationsError(data.error || `Analysis failed (HTTP ${res.status})`);
      }
    } catch (err) {
      clearTimeout(timeoutId);
      if (err instanceof Error && err.name === 'AbortError') {
        setObligationsError('Obligation analysis timed out after 35 seconds. Please click Retry.');
      } else {
        setObligationsError('Failed to connect to the server. Please try again.');
      }
    } finally {
      loadingObligationsRef.current = false;
      setLoadingObligations(false);
    }
  }, [documentId, obligationsData]);

  // 6. Fetch Q&A history
  const fetchQuestions = useCallback(async () => {
    try {
      const res = await fetch(`/api/documents/${documentId}/questions`);
      if (res.ok) {
        const data = (await res.json()) as { questions: QuestionHistoryItem[] };
        setQaHistory(data.questions || []);
      }
    } catch {
      // ignore
    }
  }, [documentId]);

  // 7. Fetch Review Brief
  const fetchReviewBrief = useCallback(async () => {
    setLoadingReviewBrief(true);
    setReviewBriefError(null);
    try {
      const res = await fetch(`/api/documents/${documentId}/review-brief`);
      if (res.ok) {
        const data = (await res.json()) as { reviewBrief: DocumentReviewBrief };
        setReviewBrief(data.reviewBrief);
      } else {
        const data = (await res.json().catch(() => ({ error: 'Failed to generate review brief' }))) as { error?: string };
        setReviewBriefError(data.error || `Generation failed (HTTP ${res.status})`);
      }
    } catch {
      setReviewBriefError('Failed to connect to the server. Please try again.');
    } finally {
      setLoadingReviewBrief(false);
    }
  }, [documentId]);

  useEffect(() => {
    fetchDoc();
    fetchQuestions();
  }, [fetchDoc, fetchQuestions]);

  // Poll document status if currently processing
  useEffect(() => {
    if (!doc || doc.status !== 'processing') return;
    const timer = setInterval(() => {
      fetchDoc();
    }, 3000);
    return () => clearInterval(timer);
  }, [doc, fetchDoc]);

  useEffect(() => {
    if (!doc || doc.status !== 'ready') return;
    if (activeTab === 'understand') fetchSummary();
    if (activeTab === 'identify-clauses') fetchClauses();
    if (activeTab === 'identify-risks') fetchRisks();
    if (activeTab === 'identify-obligations') fetchObligations();
    if (activeTab === 'prepare' && !reviewBrief) fetchReviewBrief();
  }, [activeTab, doc, fetchSummary, fetchClauses, fetchRisks, fetchObligations, reviewBrief, fetchReviewBrief]);

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
            <strong>Legal Assistance Notice:</strong> LexAI provides document-based legal information and analysis. It does not provide legal advice or replace a qualified legal professional. Always consult a qualified attorney for legal decisions.
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
            { id: 'understand', label: 'Understand' },
            { id: 'identify-clauses', label: 'Identify: Clauses' },
            { id: 'identify-risks', label: 'Identify: Risks' },
            { id: 'identify-obligations', label: 'Identify: Obligations' },
            { id: 'ask', label: 'Ask' },
            { id: 'prepare', label: 'Act / Prepare' },
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

        {/* ── TAB 1: UNDERSTAND ── */}
        {activeTab === 'understand' && (
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
                {/* Fallback / Local Analysis Source Notice */}
                {summaryMeta?.source === 'local' && (
                  <div className="notice notice-info" role="status" style={{ marginBottom: 'var(--space-2)' }}>
                    <span>📄</span>
                    <div style={{ flex: 1 }}>
                      <strong>Local Analysis (Rate Limit Fallback)</strong>
                      <p style={{ marginTop: '2px', fontSize: '0.8125rem' }}>
                        Live AI was temporarily rate-limited. This analysis was generated deterministically from your document content.
                      </p>
                      <button
                        className="btn btn-secondary btn-sm"
                        style={{ marginTop: 'var(--space-2)' }}
                        onClick={() => fetchSummary(true)}
                      >
                        ⚡ Retry Live Gemini
                      </button>
                    </div>
                  </div>
                )}
                {summaryMeta?.source === 'fallback' && (
                  <div className="notice notice-info" role="status" style={{ marginBottom: 'var(--space-2)' }}>
                    <span>⚡</span>
                    <div style={{ flex: 1 }}>
                      <strong>Fallback AI Model Active</strong>
                      <p style={{ marginTop: '2px', fontSize: '0.8125rem' }}>
                        Analysis completed using Google Gemini Flash-Lite fallback model.
                      </p>
                    </div>
                  </div>
                )}

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

                {/* Document Overview */}
                <div className="card">
                  <div className="card-header">
                    <h3 className="card-title">Document Overview</h3>
                    <p className="card-description">Plain-English explanation of the document's purpose and effect</p>
                  </div>
                  <div className="card-body">
                    <div style={{ marginBottom: 'var(--space-3)' }}>
                      <strong>Purpose:</strong> {summary.purpose}
                    </div>
                    <p style={{ lineHeight: 1.6, fontSize: '0.9375rem', color: 'var(--color-text)' }}>
                      {summary.documentOverview}
                    </p>
                  </div>
                </div>

                {/* Important Commitments & Terms */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
                  {summary.importantCommitments && summary.importantCommitments.length > 0 && (
                    <div className="card">
                      <div className="card-header"><h3 className="card-title">Important Commitments</h3></div>
                      <div className="card-body">
                        <ul style={{ paddingLeft: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                          {summary.importantCommitments.map((item, idx) => (
                            <li key={idx} style={{ fontSize: '0.9375rem', color: 'var(--color-text-2)' }}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}
                  {summary.financialTerms && summary.financialTerms.length > 0 && (
                    <div className="card">
                      <div className="card-header"><h3 className="card-title">Financial Terms</h3></div>
                      <div className="card-body">
                        <ul style={{ paddingLeft: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                          {summary.financialTerms.map((item, idx) => (
                            <li key={idx} style={{ fontSize: '0.9375rem', color: 'var(--color-text-2)' }}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}
                </div>

                {/* Review Highlights */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
                  {summary.majorRisksToReview && summary.majorRisksToReview.length > 0 && (
                    <div className="card">
                      <div className="card-header"><h3 className="card-title" style={{ color: 'var(--color-risk-high)' }}>Major Risks to Review</h3></div>
                      <div className="card-body">
                        <ul style={{ paddingLeft: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                          {summary.majorRisksToReview.map((item, idx) => (
                            <li key={idx} style={{ fontSize: '0.9375rem', color: 'var(--color-text-2)' }}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}
                  {summary.clausesRequiringAttention && summary.clausesRequiringAttention.length > 0 && (
                    <div className="card">
                      <div className="card-header"><h3 className="card-title">Clauses Requiring Attention</h3></div>
                      <div className="card-body">
                        <ul style={{ paddingLeft: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                          {summary.clausesRequiringAttention.map((item, idx) => (
                            <li key={idx} style={{ fontSize: '0.9375rem', color: 'var(--color-text-2)' }}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── TAB 2: IDENTIFY CLAUSES ── */}
        {activeTab === 'identify-clauses' && (
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
                {/* Accessible Clause Category Filter Toolbar */}
                <div
                  role="group"
                  aria-label="Filter clauses by category"
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 'var(--space-2)',
                    marginBottom: 'var(--space-4)',
                    alignItems: 'center',
                  }}
                >
                  {CLAUSE_FILTER_OPTIONS.map((filter) => {
                    const isSelected = clauseFilter === filter.id;
                    const count =
                      filter.id === 'all'
                        ? clausesData.clauses.length
                        : clausesData.clauses.filter((c) => normalizeClauseCategory(c.category) === filter.id).length;

                    return (
                      <button
                        key={filter.id}
                        type="button"
                        aria-pressed={isSelected}
                        onClick={() => setClauseFilter(filter.id)}
                        className={`btn btn-sm ${isSelected ? 'btn-primary' : 'btn-secondary'}`}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          borderRadius: '9999px',
                          padding: '6px 14px',
                          fontSize: '0.8125rem',
                          fontWeight: isSelected ? 600 : 500,
                        }}
                      >
                        <span>{filter.label}</span>
                        <span
                          style={{
                            fontSize: '0.75rem',
                            opacity: isSelected ? 1 : 0.7,
                            background: isSelected ? 'rgba(255, 255, 255, 0.25)' : 'var(--color-surface-2)',
                            borderRadius: '9999px',
                            padding: '1px 6px',
                          }}
                        >
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Clauses list */}
                {(() => {
                  const filtered = clausesData.clauses.filter(
                    (c) => clauseFilter === 'all' || normalizeClauseCategory(c.category) === clauseFilter
                  );

                  if (filtered.length === 0) {
                    const filterMeta = CLAUSE_FILTER_OPTIONS.find((f) => f.id === clauseFilter);
                    return (
                      <div className="card" style={{ padding: 'var(--space-6)', textAlign: 'center' }}>
                        <p style={{ color: 'var(--color-text-2)', marginBottom: 'var(--space-3)' }}>
                          No <strong>{filterMeta?.label || clauseFilter}</strong> clauses were detected in this document.
                        </p>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => setClauseFilter('all')}
                        >
                          Show All Clauses ({clausesData.clauses.length})
                        </button>
                      </div>
                    );
                  }

                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                      {filtered.map((clause, idx) => {
                        const normCat = normalizeClauseCategory(clause.category);
                        const categoryLabel =
                          CLAUSE_CATEGORY_DEFINITIONS[normCat as CanonicalClauseCategory]?.label ||
                          normCat.replace(/[-_]/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());

                        return (
                          <div key={clause.id || idx} className="card">
                            <div className="card-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                              <div>
                                <span className="badge badge-neutral" style={{ marginRight: 'var(--space-2)' }}>
                                  {categoryLabel}
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
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        )}

        {/* ── TAB 3: IDENTIFY RISKS ── */}
        {activeTab === 'identify-risks' && (
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
                      {risk.excerpt && (
                        <div style={{ marginTop: 'var(--space-2)' }}>
                          <blockquote style={{ fontFamily: 'var(--font-legal)', fontSize: '0.8125rem', color: 'var(--color-text-3)', borderLeft: '3px solid var(--color-border-strong)', paddingLeft: 'var(--space-3)', fontStyle: 'italic', margin: 0 }}>
                            &ldquo;{risk.excerpt}&rdquo;
                          </blockquote>
                        </div>
                      )}
                      {risk.suggestedAction && (
                        <div style={{ marginTop: 'var(--space-3)', padding: 'var(--space-2) var(--space-3)', background: 'var(--color-surface-2)', borderRadius: 'var(--radius-sm)', borderLeft: '3px solid var(--color-accent)' }}>
                          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-accent)', textTransform: 'uppercase' }}>
                            What to Review / Clarify:
                          </span>
                          <p style={{ fontSize: '0.8125rem', color: 'var(--color-text)', marginTop: '2px' }}>
                            {risk.suggestedAction}
                          </p>
                        </div>
                      )}
                      {risk.questionToConsider && (
                        <div style={{ marginTop: 'var(--space-2)', padding: 'var(--space-2) var(--space-3)', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)' }}>
                          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-3)', textTransform: 'uppercase' }}>
                            Question to Consider:
                          </span>
                          <p style={{ fontSize: '0.8125rem', color: 'var(--color-text)', marginTop: '2px', fontWeight: 500 }}>
                            {risk.questionToConsider}
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

        {/* ── TAB 4: IDENTIFY OBLIGATIONS ── */}
        {activeTab === 'identify-obligations' && (
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
                        <th>Review Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {obligationsData.map((ob, idx) => (
                        <tr key={idx}>
                          <td style={{ fontWeight: 600 }}>{ob.party}</td>
                          <td style={{ fontSize: '0.875rem', color: 'var(--color-text-2)' }}>{ob.obligation}</td>
                          <td style={{ fontSize: '0.8125rem', color: 'var(--color-text-3)' }}>{ob.deadline || ob.trigger || 'Ongoing'}</td>
                          <td style={{ fontSize: '0.8125rem', color: 'var(--color-risk-high)' }}>
                            {ob.consequence || 'Unspecified'}
                          </td>
                          <td style={{ fontSize: '0.8125rem', color: 'var(--color-accent)' }}>
                            {ob.statusOrReviewAction || 'Review'}
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
        {activeTab === 'ask' && (
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

        {/* ── TAB 6: ACT / PREPARE ── */}
        {activeTab === 'prepare' && (
          <div aria-live="polite">
            <div className="card" style={{ marginBottom: 'var(--space-4)' }}>
              <div className="card-header">
                <h3 className="card-title">Legal Review Brief</h3>
                <p className="card-description">Actionable next steps and specific questions to help you prepare for a consultation or negotiation.</p>
              </div>

              <div className="card-body">
                {loadingReviewBrief ? (
                  <div style={{ padding: 'var(--space-6)', textAlign: 'center', color: 'var(--color-text-3)' }}>
                    <div style={{ marginBottom: 'var(--space-2)' }}>⏳</div>
                    Generating your action plan…
                  </div>
                ) : reviewBriefError ? (
                  <div className="notice notice-error" role="alert" style={{ marginBottom: 'var(--space-4)' }}>
                    <span>⚠</span>
                    <div style={{ flex: 1 }}>
                      <strong>Brief Generation Failed</strong>
                      <p style={{ marginTop: '2px', fontSize: '0.875rem' }}>{reviewBriefError}</p>
                      <button
                        className="btn btn-secondary btn-sm"
                        style={{ marginTop: 'var(--space-2)' }}
                        onClick={() => fetchReviewBrief()}
                      >
                        Retry Generation
                      </button>
                    </div>
                  </div>
                ) : !reviewBrief ? (
                  <div style={{ textAlign: 'center', padding: 'var(--space-6)' }}>
                    <button className="btn btn-secondary btn-sm" onClick={() => fetchReviewBrief()}>
                      Generate Legal Review Brief
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
                    
                    {/* Document Context */}
                    <div style={{ background: 'var(--color-surface-2)', padding: 'var(--space-4)', borderRadius: 'var(--radius-sm)' }}>
                      <h4 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text-3)', textTransform: 'uppercase', marginBottom: 'var(--space-2)' }}>Context for Legal Professional</h4>
                      <p style={{ fontSize: '0.9375rem', color: 'var(--color-text)' }}>{reviewBrief.documentPurpose}</p>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-3)', marginTop: 'var(--space-3)' }}>
                        <div><strong>Parties:</strong> {reviewBrief.parties.join(' / ')}</div>
                        <div><strong>Key Clauses:</strong> {reviewBrief.majorClauses.join(', ')}</div>
                      </div>
                    </div>

                    {/* Next Steps */}
                    <div>
                      <h4 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--color-text)', marginBottom: 'var(--space-3)' }}>Recommended Next Steps</h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                        {reviewBrief.nextSteps.map((step, idx) => (
                          <div key={idx} style={{ padding: 'var(--space-3)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)' }}>
                            <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center', marginBottom: 'var(--space-1)' }}>
                              <span className="badge badge-accent">{step.category}</span>
                              <span style={{ fontWeight: 600, fontSize: '0.9375rem' }}>{step.action}</span>
                            </div>
                            <p style={{ fontSize: '0.875rem', color: 'var(--color-text-2)', marginTop: '4px' }}><strong>Reason:</strong> {step.reason}</p>
                            {step.source && <p style={{ fontSize: '0.75rem', color: 'var(--color-text-3)', marginTop: '2px' }}>Source: {step.source}</p>}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Questions to Consider */}
                    <div>
                      <h4 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--color-text)', marginBottom: 'var(--space-3)' }}>Questions to Consider</h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                        {reviewBrief.questionsToConsider.map((q, idx) => (
                          <div key={idx} style={{ padding: 'var(--space-3)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', borderLeft: '3px solid var(--color-accent)' }}>
                            <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center', marginBottom: 'var(--space-1)' }}>
                              <span className="badge badge-neutral">{q.category}</span>
                              <span style={{ fontWeight: 600, fontSize: '0.9375rem' }}>{q.question}</span>
                            </div>
                            <p style={{ fontSize: '0.875rem', color: 'var(--color-text-2)', marginTop: '4px' }}><strong>Why ask this:</strong> {q.reason}</p>
                            {q.source && <p style={{ fontSize: '0.75rem', color: 'var(--color-text-3)', marginTop: '2px' }}>Source: {q.source}</p>}
                          </div>
                        ))}
                      </div>
                    </div>

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
