import { afterEach, describe, expect, it, vi } from 'vitest';
import { SearchError, searchFlights } from './api';
import { buildRequest, initialValues } from './search';
import { emptyMetadata, oneWayFlight } from '../test/fixtures';

const request = buildRequest({ ...initialValues(), from: 'JFK', to: 'LAX' });
const empty = { flights: [], metadata: emptyMetadata };
afterEach(() => vi.unstubAllGlobals());
describe('API requests and failure handling', () => {
  it('posts JSON without credentials and keeps metadata on empty results', async () => {
    const payload = {
      ...empty,
      metadata: { ...emptyMetadata, airlines: [{ code: 'AA', name: 'American' }], alliances: [] },
    };
    const mock = vi.fn().mockResolvedValue(Response.json(payload));
    vi.stubGlobal('fetch', mock);
    expect(await searchFlights(request)).toEqual(payload);
    expect(mock).toHaveBeenCalledWith(
      'https://gflight.q1z.dev/flights',
      expect.objectContaining({
        method: 'POST',
        credentials: 'omit',
        body: JSON.stringify(request),
        headers: { 'Content-Type': 'application/json' },
      }),
    );
  });
  it('surfaces provider validation issue paths', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        Response.json(
          {
            error: 'Invalid search parameters',
            issues: [{ path: ['flights', 0, 'date'], message: 'Invalid date' }],
          },
          { status: 400 },
        ),
      ),
    );
    await expect(searchFlights(request)).rejects.toMatchObject({
      message: 'Invalid search parameters',
      issues: ['flights › 0 › date: Invalid date'],
    });
  });
  it.each([422, 502, 504])('preserves the API error for status %i', async (status) => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(Response.json({ error: 'Provider message' }, { status })),
    );
    await expect(searchFlights(request)).rejects.toThrow('Provider message');
  });
  it('handles network failures, invalid JSON, and invalid success shapes', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    await expect(searchFlights(request)).rejects.toThrow('Check your connection');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('<html>Error</html>')));
    await expect(searchFlights(request)).rejects.toThrow('unreadable response');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ flights: [] })));
    await expect(searchFlights(request)).rejects.toThrow('unexpected response');
  });
  it('distinguishes timeouts from explicit cancellation', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new DOMException('Timed out', 'TimeoutError')),
    );
    await expect(searchFlights(request)).rejects.toThrow('took too long');
    const controller = new AbortController();
    controller.abort();
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new DOMException('Aborted', 'AbortError')));
    try {
      await searchFlights(request, controller.signal);
    } catch (error) {
      expect(error).not.toBeInstanceOf(SearchError);
      expect(error).toHaveProperty('name', 'AbortError');
    }
  });
});

it('preserves one-way segments, exact fares, and booking URLs', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue(Response.json({ flights: [oneWayFlight], metadata: empty.metadata })),
  );
  const response = await searchFlights(request);
  expect(response.flights[0]).toEqual(oneWayFlight);
  expect(response.flights[0].segments).toHaveLength(2);
  expect(response.flights[0].price).toBe(553);
});

it('rejects obsolete nested-flight responses instead of silently showing empty itineraries', async () => {
  const { segments: _segments, ...rest } = oneWayFlight;
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue(
      Response.json({
        flights: [{ ...rest, flights: oneWayFlight.segments }],
        metadata: emptyMetadata,
      }),
    ),
  );
  await expect(searchFlights(request)).rejects.toThrow('unexpected response');
});
