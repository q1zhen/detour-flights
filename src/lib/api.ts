import type { SearchRequest, SearchResponse } from './types';

export const API_URL = 'https://gflight.q1z.dev';
export class SearchError extends Error {
  constructor(message: string, public issues: string[] = []) { super(message); }
}
export async function searchFlights(request: SearchRequest, signal?: AbortSignal): Promise<SearchResponse> {
  let response: Response;
  try {
    response = await fetch(`${API_URL}/flights`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request), credentials: 'omit',
      signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(30_000)]) : AbortSignal.timeout(30_000),
    });
  } catch (error) {
    if (signal?.aborted) throw error;
    if (error instanceof DOMException && error.name === 'TimeoutError') throw new SearchError('The search took too long. Please try again.');
    throw new SearchError('We couldn’t reach the flight service. Check your connection and try again.');
  }
  let data;
  try { data = await response.json(); }
  catch { throw new SearchError('The flight service returned an unreadable response. Please try again.'); }
  if (!response.ok) {
    const fallback = response.status === 504 ? 'The flight provider timed out. Please try again.' : response.status === 502 ? 'The flight provider is temporarily unavailable. Please try again.' : `The search failed (${response.status}). Please try again.`;
    throw new SearchError(typeof data.error === 'string' ? data.error : fallback,
      Array.isArray(data.issues) ? data.issues.map((issue: { path?: (string | number)[]; message?: string }) => `${issue.path?.join(' › ') || 'Search'}: ${issue.message || 'Invalid value'}`) : []);
  }
  if (!Array.isArray(data.flights) || !data.metadata || !Array.isArray(data.metadata.airlines) || !Array.isArray(data.metadata.alliances)) throw new SearchError('The flight service returned an unexpected response. Please try again.');
  return data;
}
