import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: { default: 'LexAI', template: '%s — LexAI' },
  description: 'Understand, analyse, and navigate legal documents. LexAI provides document-grounded analysis — not legal advice.',
  robots: { index: false }, // Private tool, not for public indexing
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body>{children}</body>
    </html>
  );
}
