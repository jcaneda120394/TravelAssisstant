import { ZodError } from 'zod';

export class AppError extends Error {
  override readonly name = 'AppError';
  readonly code: string;
  override readonly cause?: unknown;
  readonly isOperational: boolean;

  constructor(
    message: string,
    options?: {
      code?: string;
      cause?: unknown;
      isOperational?: boolean;
    },
  ) {
    super(message);
    this.code = options?.code ?? 'APP_ERROR';
    this.cause = options?.cause;
    this.isOperational = options?.isOperational ?? true;
  }
}

export function toAppError(error: unknown, fallbackMessage = 'Unexpected error'): AppError {
  if (error instanceof AppError) {
    return error;
  }

  if (error instanceof ZodError) {
    return new AppError(error.issues[0]?.message ?? fallbackMessage, {
      code: 'VALIDATION_ERROR',
      cause: error,
    });
  }

  if (typeof error === 'object' && error !== null) {
    const record = error as {
      message?: unknown;
      code?: unknown;
      details?: unknown;
      hint?: unknown;
      error_description?: unknown;
    };
    const rawMessage =
      (typeof record.message === 'string' && record.message) ||
      (typeof record.error_description === 'string' && record.error_description) ||
      fallbackMessage;
    const code = typeof record.code === 'string' ? record.code : '';
    const combined = `${rawMessage} ${code} ${String(record.details ?? '')}`;

    if (
      code === 'PGRST303' ||
      /jwt issued at future/i.test(combined) ||
      /issued at future/i.test(combined)
    ) {
      return new AppError(
        'Your device clock is ahead of the server. On the simulator/Mac, set Date & Time to automatic, wait a few seconds, then sign in again.',
        { code: 'PGRST303', cause: error },
      );
    }

    const detailParts = [record.details, record.hint, record.code]
      .filter((part) => typeof part === 'string' && part.length > 0)
      .join(' · ');
    return new AppError(detailParts ? `${rawMessage} (${detailParts})` : rawMessage, {
      code: code || 'UNKNOWN_ERROR',
      cause: error,
    });
  }

  if (error instanceof Error) {
    if (/jwt issued at future/i.test(error.message)) {
      return new AppError(
        'Your device clock is ahead of the server. On the simulator/Mac, set Date & Time to automatic, wait a few seconds, then sign in again.',
        { code: 'PGRST303', cause: error },
      );
    }
    return new AppError(error.message || fallbackMessage, {
      code: 'UNKNOWN_ERROR',
      cause: error,
    });
  }

  return new AppError(fallbackMessage, {
    code: 'UNKNOWN_ERROR',
    cause: error,
  });
}

export function getErrorMessage(error: unknown): string {
  return toAppError(error).message;
}
