import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://lexai-zanu.onrender.com'),
  title: {
    default: 'LexAI — Understand Legal Documents',
    template: '%s — LexAI',
  },
  description: 'Understand, analyse, and navigate legal documents with grounded AI. Plain-English summaries, clause breakdowns, risk auditing, and verifiable citations.',
  applicationName: 'LexAI',
  keywords: ['legal AI', 'contract analysis', 'plain language summary', 'clause extraction', 'risk audit', 'legal document assistant'],
  authors: [{ name: 'LexAI' }],
  openGraph: {
    title: 'LexAI — Understand Legal Documents',
    description: 'Understand, analyse, and navigate legal documents with grounded AI. Plain-English summaries, clause breakdowns, and verifiable citations.',
    url: 'https://lexai-zanu.onrender.com',
    siteName: 'LexAI',
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'LexAI — Understand Legal Documents',
    description: 'Understand, analyse, and navigate legal documents with grounded AI. Plain-English summaries, clause breakdowns, and verifiable citations.',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body>{children}</body>
    </html>
  );
}
