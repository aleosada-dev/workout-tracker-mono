jest.mock('@/features/exercises/api/exercises', () => ({
  updateExercise: jest.fn(),
}));

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { type UpdateExerciseRequest, updateExercise } from '@/features/exercises/api/exercises';
import { useUpdateExercise } from '@/features/exercises/hooks/use-update-exercise';

const mockUpdateExercise = updateExercise as jest.Mock;

const variationId = 'd3f0e8a2-3333-4ba2-b2c3-324a63844771';

const updateBody: UpdateExerciseRequest = {
  exerciseName: 'Supino',
  exerciseType: 'musculacao',
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

describe('useUpdateExercise', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('updates the exercise and invalidates list, detail and edit queries on success', async () => {
    mockUpdateExercise.mockResolvedValueOnce({ id: variationId });
    const { client, wrapper } = makeWrapper();
    const invalidateSpy = jest.spyOn(client, 'invalidateQueries');

    const { result } = renderHook(() => useUpdateExercise(variationId), { wrapper });

    act(() => {
      result.current.mutate(updateBody);
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockUpdateExercise).toHaveBeenCalledWith(variationId, updateBody);
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['exercises', 'list'] });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ['exercises', 'detail', variationId],
    });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['exercises', 'edit', variationId] });
  });

  test('surfaces update errors', async () => {
    mockUpdateExercise.mockRejectedValueOnce(new Error('boom'));
    const { wrapper } = makeWrapper();

    const { result } = renderHook(() => useUpdateExercise(variationId), { wrapper });

    act(() => {
      result.current.mutate(updateBody);
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toEqual(new Error('boom'));
  });
});
