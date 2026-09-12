import { AppError } from '@/lib/errors/app-error';
import { getCached, setCached } from '@/lib/http/response-cache';

const DEFAULT_HEADERS: Record<string, string> = {
  Accept: 'application/json',
  'User-Agent': 'TravelAssistant/1.0 (expo; contact@travelassistant.app)',
};

export async function fetchJson<T>(
  url: string,
  options?: RequestInit & { timeoutMs?: number; cacheTtlMs?: number },
): Promise<T> {
  const { timeoutMs = 15_000, cacheTtlMs, headers, ...rest } = options ?? {};
  const method = (rest.method ?? 'GET').toUpperCase();
  const bodyKey = typeof rest.body === 'string' ? rest.body.slice(0, 500) : '';
  const cacheKey = cacheTtlMs ? `${method}:json:${url}:${bodyKey}` : null;

  if (cacheKey && cacheTtlMs) {
    const hit = getCached<T>(cacheKey);
    if (hit !== undefined) {
      return hit;
    }
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...rest,
      signal: controller.signal,
      headers: {
        ...DEFAULT_HEADERS,
        ...(headers as Record<string, string> | undefined),
      },
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new AppError(`Request failed (${response.status})`, {
        code: 'HTTP_ERROR',
        cause: body.slice(0, 300),
      });
    }

    const data = (await response.json()) as T;
    if (cacheKey && cacheTtlMs) {
      setCached(cacheKey, data, cacheTtlMs);
    }
    return data;
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    if (error instanceof Error && error.name === 'AbortError') {
      throw new AppError('Request timed out', { code: 'TIMEOUT', cause: error });
    }
    throw new AppError('Network request failed', { code: 'NETWORK', cause: error });
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchText(
  url: string,
  options?: RequestInit & { timeoutMs?: number; cacheTtlMs?: number },
): Promise<string> {
  const { timeoutMs = 20_000, cacheTtlMs, headers, ...rest } = options ?? {};
  const method = (rest.method ?? 'GET').toUpperCase();
  const bodyKey = typeof rest.body === 'string' ? rest.body.slice(0, 500) : '';
  const cacheKey = cacheTtlMs ? `${method}:text:${url}:${bodyKey}` : null;

  if (cacheKey && cacheTtlMs) {
    const hit = getCached<string>(cacheKey);
    if (hit !== undefined) {
      return hit;
    }
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...rest,
      signal: controller.signal,
      headers: {
        ...DEFAULT_HEADERS,
        ...(headers as Record<string, string> | undefined),
      },
    });
    if (!response.ok) {
      throw new AppError(`Request failed (${response.status})`, { code: 'HTTP_ERROR' });
    }
    const data = await response.text();
    if (cacheKey && cacheTtlMs) {
      setCached(cacheKey, data, cacheTtlMs);
    }
    return data;
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError('Network request failed', { code: 'NETWORK', cause: error });
  } finally {
    clearTimeout(timer);
  }
}
