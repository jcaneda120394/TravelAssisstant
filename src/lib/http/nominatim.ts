import { fetchJson } from '@/lib/http/fetch-json';

/**
 * Nominatim usage policy: max ~1 request/second.
 * Our earlier parallel bursts caused 429s and empty city/place results.
 */
let nominatimQueue: Promise<unknown> = Promise.resolve();
let lastNominatimAt = 0;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function fetchNominatimJson<T>(
  url: string,
  options?: RequestInit & { timeoutMs?: number; cacheTtlMs?: number },
): Promise<T> {
  const run = async (): Promise<T> => {
    const wait = Math.max(0, 1100 - (Date.now() - lastNominatimAt));
    if (wait > 0) {
      await sleep(wait);
    }
    lastNominatimAt = Date.now();
    return fetchJson<T>(url, {
      ...options,
      // Prefer cache so repeated Home/Explore loads don't re-hit Nominatim.
      cacheTtlMs: options?.cacheTtlMs ?? 10 * 60_000,
      timeoutMs: options?.timeoutMs ?? 8_000,
    });
  };

  const next = nominatimQueue.then(run, run);
  // Keep the queue alive even if this call fails.
  nominatimQueue = next.then(
    () => undefined,
    () => undefined,
  );
  return next;
}
