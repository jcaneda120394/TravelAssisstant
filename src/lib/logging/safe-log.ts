import { env } from '@/config/env';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const SENSITIVE =
  /(password|passwd|token|authorization|api[_-]?key|secret|refresh_token|access_token|jwt|bearer|session)/i;

function scrub(value: unknown): unknown {
  if (value == null) return value;
  if (typeof value === 'string') {
    if (SENSITIVE.test(value) && value.length > 8) {
      return '[redacted]';
    }
    return value.length > 500 ? `${value.slice(0, 500)}…` : value;
  }
  if (Array.isArray(value)) {
    return value.map(scrub);
  }
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
      out[key] = SENSITIVE.test(key) ? '[redacted]' : scrub(nested);
    }
    return out;
  }
  return value;
}

function shouldEmit(level: LogLevel): boolean {
  if (env.appEnv === 'production') {
    return level === 'warn' || level === 'error';
  }
  return true;
}

function emit(level: LogLevel, message: string, meta?: unknown) {
  if (!shouldEmit(level)) return;
  const safe = meta === undefined ? undefined : scrub(meta);
  // eslint-disable-next-line no-console -- intentional central logger
  const fn = console[level] ?? console.log;
  if (safe === undefined) {
    fn(`[ta:${level}]`, message);
  } else {
    fn(`[ta:${level}]`, message, safe);
  }
}

/** Safe client logger — redacts secrets and quiets debug noise in production. */
export const safeLog = {
  debug: (message: string, meta?: unknown) => emit('debug', message, meta),
  info: (message: string, meta?: unknown) => emit('info', message, meta),
  warn: (message: string, meta?: unknown) => emit('warn', message, meta),
  error: (message: string, meta?: unknown) => emit('error', message, meta),
};
