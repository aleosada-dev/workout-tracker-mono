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

import { EMPTY_EXERCISE_LIST_PARAMS, fetchExercises } from '@/exercises/api/exercises';

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

const apiExercise = {
  id: 'ex-1',
  name: 'Abdominal',
  type: 'musculacao' as const,
  userId: null,
  variations: [
    {
      id: 'a35c0d15-db1f-4ba2-b2c3-324a63844771',
      name: null,
      muscle: {
        id: 'm1',
        name: 'Reto Abdominal',
        slug: 'reto-abdominal',
        level2: { name: 'Abdômen', slug: 'abdomen' },
      },
      secondaryMuscle: null,
      equipment: { id: 'eq1', name: 'Máquina', slug: 'maquina', preposition: 'na' },
      video: null,
      imageUrl: null,
    },
  ],
};

describe('fetchExercises', () => {
  test('returns the API exercises payload as-is', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse([apiExercise]));

    const result = await fetchExercises();

    const [url, init] = mockFetch.mock.calls[0];
    expect(String(url)).toContain('/api/v1/exercises');
    expect(init.method).toBe('GET');
    expect(result).toEqual([apiExercise]);
  });

  test('forwards the abort signal to fetch', async () => {
    const controller = new AbortController();
    mockFetch.mockResolvedValueOnce(jsonResponse([]));

    await fetchExercises(EMPTY_EXERCISE_LIST_PARAMS, { signal: controller.signal });

    const [, init] = mockFetch.mock.calls[0];
    expect(init.signal).toBeInstanceOf(AbortSignal);
    expect(init.signal.aborted).toBe(false);

    controller.abort();
    expect(init.signal.aborted).toBe(true);
  });

  test('serializes filter params as repeated query keys', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse([]));

    await fetchExercises({
      query: {
        visibility: 'private',
        exerciseTypes: ['musculacao'],
        muscleIds: ['m1', 'm2'],
      },
    });

    const [url] = mockFetch.mock.calls[0];
    const u = new URL(String(url));
    expect(u.pathname).toMatch(/\/exercises$/);
    expect(u.searchParams.get('visibility')).toBe('private');
    expect(u.searchParams.getAll('exerciseTypes')).toEqual(['musculacao']);
    expect(u.searchParams.getAll('muscleIds')).toEqual(['m1', 'm2']);
  });
});
