jest.mock('@/features/api/lib/config', () => {
  const { createApiConfigMock } = jest.requireActual('@/features/test-utils/api-config');
  return createApiConfigMock();
});

jest.mock('@/features/auth/lib', () => {
  const { createAuthMock } = jest.requireActual('@/features/test-utils/auth');
  return createAuthMock();
});

jest.mock('@/features/observability/lib', () => {
  const { createObservabilityMock } = jest.requireActual('@/features/test-utils/observability');
  return createObservabilityMock();
});

import {
  type CreateExerciseRequest,
  createExercise,
  createVideoUploadUrls,
  EMPTY_EXERCISE_LIST_PARAMS,
  fetchExercises,
} from '@/features/exercises/api/exercises';

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
        visibility: 'owned',
        exerciseTypes: ['musculacao'],
        muscleIds: ['m1', 'm2'],
      },
    });

    const [url] = mockFetch.mock.calls[0];
    const u = new URL(String(url));
    expect(u.pathname).toMatch(/\/exercises$/);
    expect(u.searchParams.get('visibility')).toBe('owned');
    expect(u.searchParams.getAll('exerciseTypes')).toEqual(['musculacao']);
    expect(u.searchParams.getAll('muscleIds')).toEqual(['m1', 'm2']);
  });
});

const createBody: CreateExerciseRequest = {
  variationId: 'd3f0e8a2-3333-4ba2-b2c3-324a63844771',
  exerciseName: 'Supino',
  exerciseType: 'musculacao',
  variationName: 'Barra',
  muscleId: 'b1d0e8a2-1111-4ba2-b2c3-324a63844771',
  secondaryMuscleId: null,
  equipmentId: 'c2e1f9b3-2222-4ba2-b2c3-324a63844771',
  youtubeVideoUrl: null,
  video: null,
};

function jsonResponseWithStatus<T>(data: T, status: number) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('createExercise', () => {
  test('posts the exercise body and returns the created id', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponseWithStatus({ id: 'new-ex-1' }, 201));

    const result = await createExercise(createBody);

    const [url, init] = mockFetch.mock.calls[0];
    expect(String(url)).toContain('/api/v1/exercises');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body)).toEqual(createBody);
    expect(result).toEqual({ id: 'new-ex-1' });
  });

  test('throws ApiError with status 409 when the variation already exists', async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponseWithStatus({ error: 'Exercise variation already exists' }, 409),
    );

    await expect(createExercise(createBody)).rejects.toMatchObject({
      name: 'ApiError',
      status: 409,
      message: 'Exercise variation already exists',
    });
  });
});

describe('createVideoUploadUrls', () => {
  test('posts the variation id and content type, returns the presigned URLs', async () => {
    const payload = {
      uploadId: 'a35c0d15-db1f-4ba2-b2c3-324a63844771',
      video: { objectKey: 'user/var/upload.mp4', uploadUrl: 'https://r2.example/put-video' },
      thumbnail: { objectKey: 'user/var/upload.jpg', uploadUrl: 'https://r2.example/put-thumb' },
    };
    mockFetch.mockResolvedValueOnce(jsonResponseWithStatus(payload, 200));

    const result = await createVideoUploadUrls({
      variationId: 'd3f0e8a2-3333-4ba2-b2c3-324a63844771',
      videoContentType: 'video/mp4',
    });

    const [url, init] = mockFetch.mock.calls[0];
    expect(String(url)).toContain('/api/v1/medias/video-upload-urls');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body)).toEqual({
      variationId: 'd3f0e8a2-3333-4ba2-b2c3-324a63844771',
      videoContentType: 'video/mp4',
    });
    expect(result).toEqual(payload);
  });

  test('throws ApiError when the request fails', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponseWithStatus({ error: 'Invalid input' }, 400));

    await expect(
      createVideoUploadUrls({
        variationId: 'd3f0e8a2-3333-4ba2-b2c3-324a63844771',
        videoContentType: 'video/mp4',
      }),
    ).rejects.toMatchObject({ name: 'ApiError', status: 400 });
  });
});
