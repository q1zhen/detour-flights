import type { SearchRequest, SearchResponse } from './types';

export const API_URL = 'https://gflight.q1z.dev';
export class SearchError extends Error {
  constructor(
    message: string,
    public issues: string[] = [],
    public retryAfterMs = 0,
  ) {
    super(message);
  }
}
async function searchFlightsOnce(
  request: SearchRequest,
  signal?: AbortSignal,
): Promise<SearchResponse> {
  let response: Response;
  try {
    response = await fetch(`${API_URL}/flights`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
      credentials: 'omit',
      signal: signal
        ? AbortSignal.any([signal, AbortSignal.timeout(30_000)])
        : AbortSignal.timeout(30_000),
    });
  } catch (error) {
    if (signal?.aborted) throw error;
    if (error instanceof DOMException && error.name === 'TimeoutError')
      throw new SearchError('The search took too long. Please try again.');
    throw new SearchError(
      'We couldn’t reach the flight service. Check your connection and try again.',
    );
  }
  const retryDelay = retryAfter(response.headers.get('Retry-After'));
  let data;
  try {
    data = await response.json();
  } catch {
    throw new SearchError(
      'The flight service returned an unreadable response. Please try again.',
      [],
      retryDelay,
    );
  }
  if (!data || typeof data !== 'object')
    throw new SearchError(
      'The flight service returned an unexpected response. Please try again.',
      [],
      retryDelay,
    );
  if (!response.ok) {
    const fallback =
      response.status === 504
        ? 'The flight provider timed out. Please try again.'
        : response.status === 502
          ? 'The flight provider is temporarily unavailable. Please try again.'
          : `The search failed (${response.status}). Please try again.`;
    throw new SearchError(
      typeof data.error === 'string' ? data.error : fallback,
      Array.isArray(data.issues)
        ? data.issues.map(
            (issue: { path?: (string | number)[]; message?: string }) =>
              `${issue.path?.join(' › ') || 'Search'}: ${issue.message || 'Invalid value'}`,
          )
        : [],
      retryDelay,
    );
  }
  if (
    !Array.isArray(data.flights) ||
    data.flights.some(
      (flight: Partial<SearchResponse['flights'][number]> | null) =>
        !flight ||
        !Array.isArray(flight.segments) ||
        !Array.isArray(flight.layovers) ||
        typeof flight.totalDurationMinutes !== 'number',
    ) ||
    !data.metadata ||
    !Array.isArray(data.metadata.airlines) ||
    !Array.isArray(data.metadata.alliances) ||
    !Array.isArray(data.metadata.locations) ||
    !Array.isArray(data.metadata.baggageLinks)
  )
    throw new SearchError(
      'The flight service returned an unexpected response. Please try again.',
      [],
      retryDelay,
    );
  return data;
}

export interface SearchRetry {
  attempt: number;
  delayMs: number;
  message: string;
}
function retryAfter(value: string | null) {
  if (!value) return 0;
  const seconds = Number(value);
  const delay = Number.isFinite(seconds) ? seconds * 1000 : Date.parse(value) - Date.now();
  // Browsers cannot represent timers above the signed 32-bit millisecond limit.
  return Number.isFinite(delay) ? Math.min(2_147_483_647, Math.max(0, delay)) : 0;
}
function waitForRetry(delayMs: number, signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    signal?.throwIfAborted();
    const abort = () => {
      clearTimeout(timer);
      reject(signal?.reason);
    };
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', abort);
      resolve();
    }, delayMs);
    signal?.addEventListener('abort', abort, { once: true });
  });
}
// Both regular and split-ticket searches pass through this wrapper. A failed
// request remains pending until it succeeds or the user cancels/replaces it.
export async function searchFlights(
  request: SearchRequest,
  signal?: AbortSignal,
  options: { onRetry?: (retry: SearchRetry | null) => void } = {},
): Promise<SearchResponse> {
  let attempt = 1;
  try {
    while (true) {
      signal?.throwIfAborted();
      let failure: unknown;
      try {
        const result = await searchFlightsOnce(request, signal);
        signal?.throwIfAborted();
        return result;
      } catch (error) {
        signal?.throwIfAborted();
        failure = error;
      }
      const backoff = Math.min(30_000, 1000 * 2 ** Math.min(attempt - 1, 5));
      const delayMs = Math.max(backoff, failure instanceof SearchError ? failure.retryAfterMs : 0);
      attempt++;
      options.onRetry?.({
        attempt,
        delayMs,
        message: failure instanceof Error ? failure.message : 'Search failed',
      });
      await waitForRetry(delayMs, signal);
    }
  } finally {
    options.onRetry?.(null);
  }
}
