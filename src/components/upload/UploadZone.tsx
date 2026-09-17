'use client';

import { useState, useCallback, useRef } from 'react';

interface UploadZoneProps {
  onUploadComplete: (documentId: string) => void;
}

type UploadState =
  | { type: 'idle' }
  | { type: 'uploading'; filename: string }
  | { type: 'processing'; filename: string }
  | { type: 'error'; message: string };

export default function UploadZone({ onUploadComplete }: UploadZoneProps) {
  const [state, setState] = useState<UploadState>({ type: 'idle' });
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const uploadFile = useCallback(async (file: File) => {
    setState({ type: 'uploading', filename: file.name });

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/documents', { method: 'POST', body: formData });
      const data = await res.json() as { document?: { id: string }; error?: string; code?: string };

      if (!res.ok) {
        setState({ type: 'error', message: data.error ?? 'Upload failed. Please try again.' });
        return;
      }

      if (!data.document?.id) {
        setState({ type: 'error', message: 'Unexpected response from server.' });
        return;
      }

      setState({ type: 'processing', filename: file.name });

      // Poll until document is ready
      const documentId = data.document.id;
      let attempts = 0;
      const maxAttempts = 60; // 2 minutes at 2s intervals

      const poll = async () => {
        if (attempts >= maxAttempts) {
          setState({ type: 'error', message: 'Processing is taking longer than expected. Refresh to check status.' });
          return;
        }
        attempts++;

        const statusRes = await fetch(`/api/documents/${documentId}`);
        const statusData = await statusRes.json() as { document?: { status: string; error_message?: string } };

        if (statusData.document?.status === 'ready') {
          setState({ type: 'idle' });
          onUploadComplete(documentId);
        } else if (statusData.document?.status === 'error') {
          setState({ type: 'error', message: statusData.document.error_message ?? 'Processing failed.' });
        } else {
          setTimeout(poll, 2000);
        }
      };

      setTimeout(poll, 2000);
    } catch {
      setState({ type: 'error', message: 'Could not reach the server. Please check your connection.' });
    }
  }, [onUploadComplete]);

  const handleFiles = useCallback((files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    uploadFile(file);
  }, [uploadFile]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const isActive = state.type === 'uploading' || state.type === 'processing';

  return (
    <div>
      <div
        className={`upload-zone ${isDragging ? 'drag-over' : ''}`}
        role="button"
        tabIndex={0}
        aria-label="Upload a legal document. Accepts PDF, DOCX, or TXT files."
        onClick={() => !isActive && inputRef.current?.click()}
        onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === ' ') && !isActive) inputRef.current?.click(); }}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        aria-busy={isActive}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
          style={{ display: 'none' }}
          onChange={(e) => handleFiles(e.target.files)}
          aria-hidden
        />

        {state.type === 'idle' && (
          <>
            <div className="upload-zone-icon" aria-hidden>↑</div>
            <p className="upload-zone-primary">Drop a document here, or click to browse</p>
            <p className="upload-zone-secondary">PDF, DOCX, or TXT · max 10 MB</p>
          </>
        )}

        {state.type === 'uploading' && (
          <>
            <div className="upload-zone-icon" aria-hidden>↑</div>
            <p className="upload-zone-primary">Uploading {state.filename}…</p>
            <p className="upload-zone-secondary" role="status" aria-live="polite">Please wait</p>
          </>
        )}

        {state.type === 'processing' && (
          <>
            <div className="upload-zone-icon" aria-hidden>⚙</div>
            <p className="upload-zone-primary">Analysing {state.filename}…</p>
            <p className="upload-zone-secondary" role="status" aria-live="polite">
              Extracting text and identifying clauses — this takes about 30–60 seconds
            </p>
          </>
        )}
      </div>

      {state.type === 'error' && (
        <div className="notice notice-error" role="alert" style={{ marginTop: '12px' }}>
          <span>⚠</span>
          <div>
            <strong>Upload failed</strong>
            <p style={{ marginTop: '2px' }}>{state.message}</p>
            <button
              className="btn btn-ghost btn-sm"
              style={{ marginTop: '8px' }}
              onClick={() => setState({ type: 'idle' })}
            >
              Try again
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
