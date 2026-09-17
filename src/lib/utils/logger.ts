/**
 * Structured logger that redacts sensitive content.
 *
 * Legal documents may contain PII, financial data, and other sensitive
 * information. We log operational metadata only — never document content.
 */

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface LogEntry {
  level: LogLevel;
  message: string;
  context?: Record<string, unknown>;
  timestamp: string;
}

function log(level: LogLevel, message: string, context?: Record<string, unknown>): void {
  const entry: LogEntry = {
    level,
    message,
    context,
    timestamp: new Date().toISOString(),
  };

  if (level === 'error') {
    console.error(JSON.stringify(entry));
  } else if (level === 'warn') {
    console.warn(JSON.stringify(entry));
  } else {
    console.log(JSON.stringify(entry));
  }
}

export const logger = {
  info: (message: string, context?: Record<string, unknown>) => log('info', message, context),
  warn: (message: string, context?: Record<string, unknown>) => log('warn', message, context),
  error: (message: string, context?: Record<string, unknown>) => log('error', message, context),
  debug: (message: string, context?: Record<string, unknown>) => {
    if (process.env.NODE_ENV === 'development') log('debug', message, context);
  },
};

/**
 * Strips document content from objects before logging.
 * Use when you need to log metadata about a document without exposing its content.
 */
export function redactForLog(obj: Record<string, unknown>): Record<string, unknown> {
  const sensitiveKeys = ['text', 'content', 'fullText', 'originalText', 'excerpt', 'body'];
  return Object.fromEntries(
    Object.entries(obj).map(([k, v]) =>
      sensitiveKeys.includes(k) ? [k, '[redacted]'] : [k, v]
    )
  );
}
