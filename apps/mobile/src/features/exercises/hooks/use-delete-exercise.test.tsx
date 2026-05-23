jest.mock('@/features/exercises/api/exercises', () => ({
  deleteExercise: jest.fn(),
}));

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { deleteExercise } from '@/features/exercises/api/exercises';
import { useDeleteExercise } from '@/features/exercises/hooks/use-delete-exercise';

const mockDeleteExercise = deleteExercise as jest.Mock;

const variationId = 'd3f0e8a2-3333-4ba2-b2c3-324a63844771';

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

describe('useDeleteExercise', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('deletes the exercise and invalidates list, detail and edit caches on success', async () => {
    mockDeleteExercise.mockResolvedValueOnce({ id: variationId });
    const { client, wrapper } = makeWrapper();
    const invalidateSpy = jest.spyOn(client, 'invalidateQueries');
    const removeSpy = jest.spyOn(client, 'removeQueries');

    const { result } = renderHook(() => useDeleteExercise(variationId), { wrapper });

    act(() => {
      result.current.mutate();
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockDeleteExercise).toHaveBeenCalledWith(variationId);
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['exercises', 'list'] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['exercises', 'detail', variationId] });
    expect(removeSpy).toHaveBeenCalledWith({ queryKey: ['exercises', 'edit', variationId] });
    expect(removeSpy).toHaveBeenCalledWith({ queryKey: ['exercises', 'names'] });
  });

  test('surfaces delete errors', async () => {
    mockDeleteExercise.mockRejectedValueOnce(new Error('boom'));
    const { wrapper } = makeWrapper();

    const { result } = renderHook(() => useDeleteExercise(variationId), { wrapper });

    act(() => {
      result.current.mutate();
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toEqual(new Error('boom'));
  });
});
