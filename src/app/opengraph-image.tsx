import { ImageResponse } from 'next/og';

export const alt = 'LexAI — Understand Legal Documents';
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          padding: '80px',
          fontFamily: 'sans-serif',
          color: '#ffffff',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '12px',
              background: '#3b82f6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '32px',
              fontWeight: 800,
              color: '#ffffff',
            }}
          >
            L
          </div>
          <span style={{ fontSize: '36px', fontWeight: 700, letterSpacing: '-0.02em', color: '#f8fafc' }}>
            LexAI
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '900px' }}>
          <h1
            style={{
              fontSize: '56px',
              fontWeight: 800,
              lineHeight: 1.15,
              letterSpacing: '-0.03em',
              color: '#ffffff',
              margin: 0,
            }}
          >
            Understand, analyse, and navigate legal documents with grounded AI.
          </h1>
          <p
            style={{
              fontSize: '24px',
              color: '#94a3b8',
              lineHeight: 1.4,
              margin: 0,
            }}
          >
            Plain-English summaries · Clause breakdown · Risk audit · Grounded Q&amp;A with citations
          </p>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
            borderTop: '1px solid #334155',
            paddingTop: '32px',
          }}
        >
          <span style={{ fontSize: '18px', color: '#64748b' }}>
            General information only — not professional legal advice
          </span>
          <span style={{ fontSize: '18px', color: '#3b82f6', fontWeight: 600 }}>
            lexai-zanu.onrender.com
          </span>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
