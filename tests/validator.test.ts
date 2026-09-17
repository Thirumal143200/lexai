import { validateUploadedFile, validateDocumentId, validateQuestion } from '@/lib/security/validator';
import { AppError } from '@/lib/utils/errors';

describe('Security and Input Validator', () => {
  describe('validateUploadedFile', () => {
    it('accepts valid PDF file within size limits', () => {
      const result = validateUploadedFile('contract.pdf', 'application/pdf', 1024 * 100);
      expect(result.safeFilename).toBe('contract.pdf');
      expect(result.mimeType).toBe('application/pdf');
      expect(result.sizeBytes).toBe(1024 * 100);
    });

    it('accepts valid DOCX file within size limits', () => {
      const result = validateUploadedFile('agreement.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 50000);
      expect(result.safeFilename).toBe('agreement.docx');
    });

    it('accepts valid plain text file', () => {
      const result = validateUploadedFile('terms.txt', 'text/plain', 5000);
      expect(result.safeFilename).toBe('terms.txt');
    });

    it('rejects unsupported file extension', () => {
      expect(() => {
        validateUploadedFile('script.exe', 'application/x-msdownload', 1000);
      }).toThrow(AppError);
    });

    it('rejects oversized file exceeding 10MB', () => {
      expect(() => {
        validateUploadedFile('huge_file.pdf', 'application/pdf', 11 * 1024 * 1024);
      }).toThrow(AppError);
    });

    it('sanitizes dangerous characters and directory traversal in filename', () => {
      const result = validateUploadedFile('../../etc/passwd.pdf', 'application/pdf', 1000);
      expect(result.safeFilename).not.toContain('..');
      expect(result.safeFilename).not.toContain('/');
      expect(result.safeFilename.endsWith('.pdf')).toBe(true);
    });
  });

  describe('validateDocumentId', () => {
    it('accepts standard UUID', () => {
      const uuid = '123e4567-e89b-12d3-a456-426614174000';
      expect(validateDocumentId(uuid)).toBe(uuid);
    });

    it('rejects SQL injection attempt in document ID', () => {
      expect(() => {
        validateDocumentId("1' OR '1'='1");
      }).toThrow(AppError);
    });

    it('rejects path traversal attempt in document ID', () => {
      expect(() => {
        validateDocumentId('../../../secret');
      }).toThrow(AppError);
    });
  });

  describe('validateQuestion', () => {
    it('accepts normal legal question', () => {
      const q = 'What is the liability cap under Section 9?';
      expect(validateQuestion(q)).toBe(q);
    });

    it('trims leading/trailing whitespace', () => {
      expect(validateQuestion('  Who is responsible for repairs?  ')).toBe('Who is responsible for repairs?');
    });

    it('rejects empty or whitespace-only questions', () => {
      expect(() => validateQuestion('   ')).toThrow(AppError);
      expect(() => validateQuestion(null)).toThrow(AppError);
    });

    it('rejects excessively long question', () => {
      const longQ = 'a'.repeat(1500);
      expect(() => validateQuestion(longQ)).toThrow(AppError);
    });
  });
});
