import { afterEach, describe, expect, it, vi } from 'vitest';
import { searchFlights } from './api';
import { buildRequest, initialValues } from './search';
import { emptyMetadata, oneWayFlight } from '../test/fixtures';

const request = buildRequest({ ...initialValues(), from: 'JFK', to: 'LAX' });
const empty = { flights: [], metadata: emptyMetadata };
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});
describe('shared flight request and retry wrapper', () => {
  it('posts JSON without credentials and keeps metadata on empty results without retrying', async () => {
    const payload = {
      ...empty,
      metadata: { ...emptyMetadata, airlines: [{ code: 'AA', name: 'American' }] },
    };
    const fetch = vi.fn().mockResolvedValue(Response.json(payload));
    vi.stubGlobal('fetch', fetch);
    expect(await searchFlights(request)).toEqual(payload);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledWith(
      'https://gflight.q1z.dev/flights',
      expect.objectContaining({
        method: 'POST',
        credentials: 'omit',
        body: JSON.stringify(request),
        headers: { 'Content-Type': 'application/json' },
      }),
    );
  });
  it.each([400, 401, 422, 429, 502, 504])(
    'automatically retries HTTP %i before returning success',
    async (status) => {
      vi.useFakeTimers();
      const fetch = vi
        .fn()
        .mockResolvedValueOnce(Response.json({ error: 'Provider message' }, { status }))
        .mockResolvedValueOnce(Response.json(empty));
      vi.stubGlobal('fetch', fetch);
      const onRetry = vi.fn();
      const result = searchFlights(request, undefined, { onRetry });
      await vi.advanceTimersByTimeAsync(999);
      expect(fetch).toHaveBeenCalledTimes(1);
      expect(onRetry).toHaveBeenCalledWith({
        attempt: 2,
        delayMs: 1000,
        message: 'Provider message',
      });
      await vi.advanceTimersByTimeAsync(1);
      expect(await result).toEqual(empty);
      expect(fetch).toHaveBeenCalledTimes(2);
      expect(onRetry).toHaveBeenLastCalledWith(null);
      expect(vi.getTimerCount()).toBe(0);
    },
  );
  it.each(['network', 'timeout', 'json', 'shape', 'obsolete'] as const)(
    'retries %s failures through the same wrapper',
    async (failure) => {
      vi.useFakeTimers();
      const fetch = vi.fn();
      if (failure === 'network') fetch.mockRejectedValueOnce(new TypeError('Failed to fetch'));
      if (failure === 'timeout')
        fetch.mockRejectedValueOnce(new DOMException('Timed out', 'TimeoutError'));
      if (failure === 'json') fetch.mockResolvedValueOnce(new Response('<html>Error</html>'));
      if (failure === 'shape') fetch.mockResolvedValueOnce(Response.json({ flights: [] }));
      if (failure === 'obsolete') {
        const { segments, ...rest } = oneWayFlight;
        fetch.mockResolvedValueOnce(
          Response.json({ flights: [{ ...rest, flights: segments }], metadata: emptyMetadata }),
        );
      }
      fetch.mockResolvedValueOnce(Response.json(empty));
      vi.stubGlobal('fetch', fetch);
      const result = searchFlights(request);
      await vi.advanceTimersByTimeAsync(1000);
      expect(await result).toEqual(empty);
      expect(fetch).toHaveBeenCalledTimes(2);
    },
  );
  it.each(['7', 'date'])('honours Retry-After %s', async (retryAfter) => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-30T00:00:00Z'));
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(
        Response.json(
          { error: 'Rate limit' },
          {
            status: 429,
            headers: {
              'Retry-After': retryAfter === 'date' ? 'Fri, 30 Oct 2026 00:00:07 GMT' : retryAfter,
            },
          },
        ),
      )
      .mockResolvedValueOnce(Response.json(empty));
    vi.stubGlobal('fetch', fetch);
    const result = searchFlights(request);
    await vi.advanceTimersByTimeAsync(6999);
    expect(fetch).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(await result).toEqual(empty);
  });
  it('continues retrying with capped backoff until cancelled, then clears the pending timer', async () => {
    vi.useFakeTimers();
    const fetch = vi.fn().mockRejectedValue(new TypeError('Offline'));
    vi.stubGlobal('fetch', fetch);
    const onRetry = vi.fn();
    const controller = new AbortController();
    const result = searchFlights(request, controller.signal, { onRetry });
    const rejected = expect(result).rejects.toHaveProperty('name', 'AbortError');
    for (const delay of [1000, 2000, 4000, 8000, 16000, 30000, 30000])
      await vi.advanceTimersByTimeAsync(delay);
    expect(fetch).toHaveBeenCalledTimes(8);
    expect(onRetry).toHaveBeenLastCalledWith(
      expect.objectContaining({ attempt: 9, delayMs: 30000 }),
    );
    controller.abort();
    await rejected;
    expect(onRetry).toHaveBeenLastCalledWith(null);
    expect(vi.getTimerCount()).toBe(0);
    await vi.advanceTimersByTimeAsync(60000);
    expect(fetch).toHaveBeenCalledTimes(8);
  });
  it('does not send an already cancelled request', async () => {
    const fetch = vi.fn();
    vi.stubGlobal('fetch', fetch);
    const controller = new AbortController();
    controller.abort();
    await expect(searchFlights(request, controller.signal)).rejects.toHaveProperty(
      'name',
      'AbortError',
    );
    expect(fetch).not.toHaveBeenCalled();
  });
  it('aborts the in-flight fetch and does not retry explicit cancellation', async () => {
    vi.useFakeTimers();
    const fetch = vi.fn().mockImplementation(
      (_url, init: RequestInit) =>
        new Promise((_resolve, reject) =>
          init.signal?.addEventListener('abort', () => reject(init.signal?.reason), {
            once: true,
          }),
        ),
    );
    vi.stubGlobal('fetch', fetch);
    const controller = new AbortController();
    const result = searchFlights(request, controller.signal);
    const rejected = expect(result).rejects.toHaveProperty('name', 'AbortError');
    controller.abort();
    await rejected;
    await vi.advanceTimersByTimeAsync(60000);
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it('keeps successful segment, fare, and booking data unchanged', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(Response.json({ flights: [oneWayFlight], metadata: emptyMetadata })),
    );
    expect((await searchFlights(request)).flights[0]).toEqual(oneWayFlight);
  });
});

it('respects Retry-After even when a proxy returns an HTML error page', async () => {
  vi.useFakeTimers();
  const fetch = vi
    .fn()
    .mockResolvedValueOnce(
      new Response('<h1>Unavailable</h1>', { status: 503, headers: { 'Retry-After': '5' } }),
    )
    .mockResolvedValueOnce(Response.json(empty));
  vi.stubGlobal('fetch', fetch);
  const result = searchFlights(request);
  await vi.advanceTimersByTimeAsync(4999);
  expect(fetch).toHaveBeenCalledTimes(1);
  await vi.advanceTimersByTimeAsync(1);
  expect(await result).toEqual(empty);
});
