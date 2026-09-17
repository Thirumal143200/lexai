/**
 * Text chunker for RAG retrieval.
 *
 * Splits extracted document text into overlapping chunks that fit within
 * the AI model's context window per retrieval call.
 *
 * Strategy:
 * 1. Try to split on section headings (##, numbered sections)
 * 2. Fall back to paragraph boundaries
 * 3. Fall back to fixed-size windows with overlap
 *
 * Overlap ensures clauses that span chunk boundaries are still retrievable.
 */

import { randomUUID } from 'crypto';
import type { DocumentChunk } from '@/lib/ai/provider';

const DEFAULT_CHUNK_SIZE = 1500;   // characters
const DEFAULT_OVERLAP = 200;       // characters of overlap between chunks

// Patterns that suggest a section heading in legal documents
const SECTION_HEADING_RE = /^(\d+\.[\d.]*\s+[A-Z]|#+\s+[A-Z]|[A-Z][A-Z\s]{4,}:?\s*$)/m;

export function chunkText(text: string, _documentId?: string): DocumentChunk[] {
  const normalized = normalizeWhitespace(text);

  // Try structured splitting first
  const sections = splitIntoSections(normalized);
  if (sections.length > 1) {
    return sectionsToChunks(sections);
  }

  // Fall back to fixed-size chunking
  return fixedSizeChunks(normalized);
}

function normalizeWhitespace(text: string): string {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\t/g, '  ')
    .replace(/\n{4,}/g, '\n\n\n')
    .trim();
}

interface Section {
  title?: string;
  text: string;
}

function splitIntoSections(text: string): Section[] {
  const lines = text.split('\n');
  const sections: Section[] = [];
  let currentTitle: string | undefined;
  let currentLines: string[] = [];

  for (const line of lines) {
    if (SECTION_HEADING_RE.test(line) && line.trim().length < 100) {
      if (currentLines.length > 0) {
        sections.push({ title: currentTitle, text: currentLines.join('\n').trim() });
      }
      currentTitle = line.trim();
      currentLines = [];
    } else {
      currentLines.push(line);
    }
  }

  if (currentLines.length > 0) {
    sections.push({ title: currentTitle, text: currentLines.join('\n').trim() });
  }

  return sections.filter((s) => s.text.length > 0);
}

function sectionsToChunks(sections: Section[]): DocumentChunk[] {
  const chunks: DocumentChunk[] = [];
  let index = 0;

  for (const section of sections) {
    if (section.text.length <= DEFAULT_CHUNK_SIZE) {
      chunks.push({
        id: randomUUID(),
        text: section.text,
        sectionTitle: section.title,
        chunkIndex: index++,
      });
    } else {
      // Section is too long — split it further
      const subChunks = fixedSizeChunks(section.text, section.title, index);
      chunks.push(...subChunks);
      index += subChunks.length;
    }
  }

  return chunks;
}

function fixedSizeChunks(text: string, sectionTitle?: string, startIndex = 0): DocumentChunk[] {
  const chunks: DocumentChunk[] = [];
  let start = 0;
  let index = startIndex;

  while (start < text.length) {
    let end = Math.min(start + DEFAULT_CHUNK_SIZE, text.length);

    // Try to break at a paragraph boundary rather than mid-sentence
    if (end < text.length) {
      const paragraphBreak = text.lastIndexOf('\n\n', end);
      if (paragraphBreak > start + DEFAULT_CHUNK_SIZE / 2) {
        end = paragraphBreak;
      }
    }

    const chunkText = text.slice(start, end).trim();
    if (chunkText.length > 0) {
      chunks.push({
        id: randomUUID(),
        text: chunkText,
        sectionTitle,
        chunkIndex: index++,
      });
    }

    // Move start forward with overlap
    start = Math.max(end - DEFAULT_OVERLAP, end);
    if (start >= text.length) break;
  }

  return chunks;
}
