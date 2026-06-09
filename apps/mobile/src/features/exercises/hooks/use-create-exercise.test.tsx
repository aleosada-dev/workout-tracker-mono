jest.mock('@/features/exercises/api/exercises', () => ({
  createExercise: jest.fn(),
}));

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { type CreateExerciseRequest, createExercise } from '@/features/exercises/api/exercises';
import { useCreateExercise } from '@/features/exercises/hooks/use-create-exercise';

const mockCreateExercise = createExercise as jest.Mock;

const createBody: CreateExerciseRequest = {
  variationId: 'd3f0e8a2-3333-4ba2-b2c3-324a63844771',
  exerciseName: 'Supino',
  measurementType: 'weight_reps',
  variationName: 'Barra',
  muscleId: 'b1d0e8a2-1111-4ba2-b2c3-324a63844771',
  secondaryMuscleId: null,
  equipmentId: 'c2e1f9b3-2222-4ba2-b2c3-324a63844771',
  youtubeVideoUrl: null,
  video: null,
};

function makeWrapper() {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return { client, wrapper };
}

describe('useCreateExercise', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('creates the exercise and invalidates the list query on success', async () => {
    mockCreateExercise.mockResolvedValueOnce({ id: 'new-ex-1' });
    const { client, wrapper } = makeWrapper();
    const invalidateSpy = jest.spyOn(client, 'invalidateQueries');

    const { result } = renderHook(() => useCreateExercise(), { wrapper });

    act(() => {
      result.current.mutate(createBody);
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    // React Query passes a MutationFunctionContext as the second argument.
    expect(mockCreateExercise.mock.calls[0][0]).toEqual(createBody);
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['exercises', 'list'] });
  });

  test('surfaces creation errors', async () => {
    mockCreateExercise.mockRejectedValueOnce(new Error('boom'));
    const { wrapper } = makeWrapper();

    const { result } = renderHook(() => useCreateExercise(), { wrapper });

    act(() => {
      result.current.mutate(createBody);
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toEqual(new Error('boom'));
  });
});
