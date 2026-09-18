import { validateUploadedFile, validateDocumentId, validateQuestion, validateFileBuffer } from '@/lib/security/validator';
import { checkRateLimit } from '@/lib/security/rate-limiter';
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

  describe('validateFileBuffer (Magic Bytes Validation)', () => {
    it('accepts valid PDF magic bytes (%PDF)', () => {
      const pdfBuffer = Buffer.from('%PDF-1.7 header content');
      expect(() => validateFileBuffer(pdfBuffer, '.pdf')).not.toThrow();
    });

    it('rejects spoofed PDF without %PDF magic bytes', () => {
      const spoofed = Buffer.from('MZ\x90\x00 fake executable');
      expect(() => validateFileBuffer(spoofed, '.pdf')).toThrow(AppError);
    });

    it('accepts valid DOCX magic bytes (PKzip header)', () => {
      const docxBuffer = Buffer.from([0x50, 0x4B, 0x03, 0x04, 0x14, 0x00]);
      expect(() => validateFileBuffer(docxBuffer, '.docx')).not.toThrow();
    });

    it('rejects spoofed DOCX without PK header', () => {
      const spoofed = Buffer.from('Not a real zip archive');
      expect(() => validateFileBuffer(spoofed, '.docx')).toThrow(AppError);
    });

    it('accepts valid UTF-8 text file', () => {
      const textBuffer = Buffer.from('Standard agreement text.');
      expect(() => validateFileBuffer(textBuffer, '.txt')).not.toThrow();
    });

    it('rejects binary file with null bytes spoofed as .txt', () => {
      const binary = Buffer.from([0x00, 0x00, 0x00, 0x05, 0x12, 0x34]);
      expect(() => validateFileBuffer(binary, '.txt')).toThrow(AppError);
    });
  });

  describe('checkRateLimit', () => {
    it('allows requests within threshold and blocks excess requests', () => {
      const ip = 'test-client-ip-' + Date.now();
      for (let i = 0; i < 5; i++) {
        const res = checkRateLimit('unit-test', ip, 5, 10);
        expect(res.allowed).toBe(true);
      }
      const blocked = checkRateLimit('unit-test', ip, 5, 10);
      expect(blocked.allowed).toBe(false);
      expect(blocked.resetSeconds).toBeGreaterThan(0);
    });
  });
});
