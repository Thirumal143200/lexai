/**
 * AI provider factory.
 *
 * Provider selection order:
 *   1. Test environment → MockAIProvider (always)
 *   2. GEMINI_API_KEY present → GeminiProvider (live AI)
 *   3. No API key → MockAIProvider (demo mode, with console warning)
 *
 * This is the single place where provider selection happens.
 * Components should call getAIProvider() rather than importing providers directly.
 */

import { GeminiProvider } from './gemini';
import { MockAIProvider } from './mock';
import { ResilientAIProvider } from './resilient-provider';
import type { AIProvider } from './provider';
import { logger } from '@/lib/utils/logger';

let _provider: AIProvider | null = null;

export function getAIProvider(): AIProvider {
  if (_provider) return _provider;

  if (process.env.NODE_ENV === 'test') {
    _provider = new MockAIProvider();
    return _provider;
  }

  const gemini = new GeminiProvider();
  const localMock = new MockAIProvider();

  if (gemini.isAvailable) {
    _provider = new ResilientAIProvider(gemini, localMock);
    logger.info('AI provider: Resilient Gemini (live mode with local fallback)', {
      primary: gemini.primaryModel,
      fallback: gemini.fallbackModel,
    });
  } else {
    // Graceful degradation: fall back to mock with a warning
    logger.warn('AI provider: Mock (demo mode) — GEMINI_API_KEY not set');
    _provider = localMock;
  }

  return _provider;
}

/** For tests: inject a provider without modifying env. */
export function setAIProvider(provider: AIProvider): void {
  _provider = provider;
}

/** Reset provider (useful between tests). */
export function resetAIProvider(): void {
  _provider = null;
}

export type { AIProvider };
