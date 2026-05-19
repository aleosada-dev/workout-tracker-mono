jest.mock('@/api/lib/config', () => {
  const { createApiConfigMock } = jest.requireActual('@/test-utils/api-config');
  return createApiConfigMock();
});

jest.mock('@/auth/lib', () => {
  const { createAuthMock } = jest.requireActual('@/test-utils/auth');
  return createAuthMock();
});

jest.mock('@/observability/lib', () => {
  const { createObservabilityMock } = jest.requireActual('@/test-utils/observability');
  return createObservabilityMock();
});

import { fetchWorkoutLogSummaries } from '@/workout-logs/api/workout-logs';

const mockFetch = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  (globalThis as unknown as { fetch: jest.Mock }).fetch = mockFetch;
});

function jsonResponse<T>(data: T) {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

const samplePage = {
  items: [
    {
      id: 'a1',
      title: 'Treino A',
      startedAt: '2026-05-01T12:00:00Z',
      durationSeconds: 3600,
      exerciseCount: 5,
      muscleGroupSlugs: ['chest'],
      prCount: 0,
    },
  ],
  hasMore: true,
};

describe('fetchWorkoutLogSummaries', () => {
  test('first page: only limit in querystring', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse(samplePage));

    const result = await fetchWorkoutLogSummaries({ limit: 10 });

    const [url] = mockFetch.mock.calls[0];
    const u = new URL(String(url));
    expect(u.pathname).toMatch(/\/api\/v1\/workout-logs\/summaries$/);
    expect(u.searchParams.get('limit')).toBe('10');
    expect(u.searchParams.has('cursor')).toBe(false);
    expect(result).toEqual(samplePage);
  });

  test('subsequent pages: includes cursor', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse(samplePage));

    await fetchWorkoutLogSummaries({ limit: 10, cursor: '2026-04-22T17:39:11.741831+00:00' });

    const [url] = mockFetch.mock.calls[0];
    const u = new URL(String(url));
    expect(u.searchParams.get('limit')).toBe('10');
    expect(u.searchParams.get('cursor')).toBe('2026-04-22T17:39:11.741831+00:00');
  });

  test('aborting the caller signal also aborts the underlying fetch', async () => {
    const controller = new AbortController();
    mockFetch.mockResolvedValueOnce(jsonResponse(samplePage));

    await fetchWorkoutLogSummaries({ limit: 10, signal: controller.signal });

    const [, init] = mockFetch.mock.calls[0];
    expect(init.signal).toBeInstanceOf(AbortSignal);
    expect(init.signal.aborted).toBe(false);

    controller.abort();
    expect(init.signal.aborted).toBe(true);
  });
});
