/**
 * POST /api/documents/[id]/questions
 * GET  /api/documents/[id]/questions
 *
 * Q&A grounded in the document via RAG retrieval.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import {
  getDocumentById,
  getChunksByDocumentId,
  insertQuestion,
  getQuestionsByDocumentId,
} from '@/lib/db/queries';
import { validateDocumentId, validateQuestion } from '@/lib/security/validator';
import { checkRateLimit, getClientIp } from '@/lib/security/rate-limiter';
import { toApiError, AppError } from '@/lib/utils/errors';
import { getAIProvider } from '@/lib/ai';
import { retrieveRelevantChunks } from '@/lib/rag/retriever';
import { validateAndFilterCitations } from '@/lib/rag/citation-validator';

interface RouteParams { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const documentId = validateDocumentId(id);
    const db = getDb();

    const document = getDocumentById(db, documentId);
    if (!document) throw new AppError('Document not found.', 404, 'NOT_FOUND');

    const questions = getQuestionsByDocumentId(db, documentId);
    return NextResponse.json({
      questions: questions.map((q) => ({
        id: q.id,
        question: q.question,
        answer: JSON.parse(q.answer_json),
        askedAt: q.created_at,
      })),
    });
  } catch (err) {
    const apiErr = toApiError(err);
    return NextResponse.json({ error: apiErr.error }, { status: apiErr.statusCode });
  }
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const ip = getClientIp(req);
    const rateCheck = checkRateLimit('qa', ip, 30, 60);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: 'Question rate limit reached. Please wait a moment before asking another question.', code: 'RATE_LIMITED' },
        { status: 429, headers: { 'Retry-After': String(rateCheck.resetSeconds) } }
      );
    }

    const { id } = await params;
    const documentId = validateDocumentId(id);
    const db = getDb();

    const document = getDocumentById(db, documentId);
    if (!document) throw new AppError('Document not found.', 404, 'NOT_FOUND');
    if (document.status !== 'ready') {
      return NextResponse.json(
        { error: 'Document is still being processed. Please wait a moment.' },
        { status: 202 }
      );
    }

    const body = await req.json() as { question?: unknown };
    const question = validateQuestion(body.question);

    // Retrieve relevant chunks via TF-IDF
    const allChunks = getChunksByDocumentId(db, documentId);
    if (allChunks.length === 0) {
      return NextResponse.json({
        answer: {
          question,
          answer: 'This document contains no readable text or sections to answer this question.',
          isGrounded: false,
          citations: [],
          confidence: 0,
          suggestsProfessionalReview: true,
          suggestedFollowUp: [],
        },
      });
    }

    const relevantChunks = retrieveRelevantChunks(question, allChunks, 6);
    const provider = getAIProvider();
    const answer = await provider.answerQuestion(question, relevantChunks, document.original_name);

    // Deterministic Citation Integrity Check: verify against actual extracted text
    const { verifiedCitations, unverifiedCitations } = validateAndFilterCitations(
      answer.citations || [],
      allChunks
    );

    const verifiedAnswer = {
      ...answer,
      citations: verifiedCitations,
      isGrounded: verifiedCitations.length > 0,
      uncertaintyNote: unverifiedCitations.length > 0
        ? `${unverifiedCitations.length} unverified citation(s) were excluded.`
        : answer.uncertaintyNote,
    };

    // Persist Q&A for history
    insertQuestion(db, documentId, question, verifiedAnswer);

    return NextResponse.json({ answer: verifiedAnswer });
  } catch (err) {
    const apiErr = toApiError(err);
    return NextResponse.json({ error: apiErr.error }, { status: apiErr.statusCode });
  }
}
