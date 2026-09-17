/**
 * File and input validation for uploaded documents.
 *
 * Legal documents are treated as untrusted input. We validate:
 * - File extension (whitelist)
 * - MIME type (independent of extension)
 * - File size
 * - Filename safety (path traversal prevention)
 */

import path from 'path';
import { AppError } from '@/lib/utils/errors';

const ALLOWED_EXTENSIONS = new Set(['.pdf', '.docx', '.txt']);
const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
]);

const MAX_FILE_SIZE_BYTES = parseInt(process.env.MAX_FILE_SIZE_MB ?? '10', 10) * 1024 * 1024;
const MAX_FILENAME_LENGTH = 200;

export interface ValidatedFile {
  originalName: string;
  safeFilename: string;
  mimeType: string;
  sizeBytes: number;
  extension: string;
}

export function validateUploadedFile(
  filename: string,
  mimeType: string,
  sizeBytes: number
): ValidatedFile {
  // Extension check
  const ext = path.extname(filename).toLowerCase();
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    throw new AppError(
      `File type "${ext}" is not supported. Accepted types: PDF, DOCX, TXT.`,
      415,
      'UNSUPPORTED_FILE_TYPE'
    );
  }

  // MIME type check (independent of extension — prevents extension spoofing)
  if (!ALLOWED_MIME_TYPES.has(mimeType)) {
    throw new AppError(
      `The file's content type "${mimeType}" does not match the expected format.`,
      415,
      'UNSUPPORTED_FILE_TYPE'
    );
  }

  // Size check
  if (sizeBytes > MAX_FILE_SIZE_BYTES) {
    throw new AppError(
      `File size ${(sizeBytes / 1024 / 1024).toFixed(1)} MB exceeds the ${process.env.MAX_FILE_SIZE_MB ?? '10'} MB limit.`,
      413,
      'FILE_TOO_LARGE'
    );
  }

  if (sizeBytes === 0) {
    throw new AppError('The uploaded file is empty.', 400, 'EMPTY_DOCUMENT');
  }

  return {
    originalName: filename,
    safeFilename: sanitiseFilename(filename),
    mimeType,
    sizeBytes,
    extension: ext,
  };
}

/**
 * Produces a safe filename that cannot be used for path traversal.
 * Strips all directory components, replaces unsafe characters.
 */
function sanitiseFilename(filename: string): string {
  // Remove any directory components
  const base = path.basename(filename);

  // Replace anything that isn't alphanumeric, dash, underscore, dot, or space
  const safe = base
    .replace(/[^a-zA-Z0-9\-_.() ]/g, '_')
    .slice(0, MAX_FILENAME_LENGTH)
    .trim();

  return safe || 'document';
}

/**
 * Validates that a document ID is safe for use in file paths.
 * IDs must be UUIDs — any other value is rejected.
 */
export function validateDocumentId(id: string): string {
  const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!UUID_PATTERN.test(id)) {
    throw new AppError('Invalid document ID format.', 400, 'VALIDATION_ERROR');
  }
  return id;
}

/**
 * Validates and sanitises a user question before it is passed to the AI.
 * Prevents trivially obvious prompt injection from the question field.
 * Note: document content injection is handled separately at the AI layer.
 */
export function validateQuestion(question: unknown): string {
  if (typeof question !== 'string') {
    throw new AppError('Question must be a string.', 400, 'VALIDATION_ERROR');
  }
  const trimmed = question.trim();
  if (trimmed.length === 0) {
    throw new AppError('Please enter a question.', 400, 'VALIDATION_ERROR');
  }
  if (trimmed.length > 500) {
    throw new AppError('Question must be 500 characters or fewer.', 400, 'VALIDATION_ERROR');
  }
  // Strip HTML/script tags that could be injection attempts
  return trimmed.replace(/<[^>]*>/g, '');
}
