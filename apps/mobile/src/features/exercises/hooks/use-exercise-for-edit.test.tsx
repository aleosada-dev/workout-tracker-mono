jest.mock('@/features/exercises/api/exercises', () => ({
  fetchExerciseForEdit: jest.fn(),
}));

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import {
  type ExerciseForEditResponse,
  fetchExerciseForEdit,
} from '@/features/exercises/api/exercises';
import { useExerciseForEdit } from '@/features/exercises/hooks/use-exercise-for-edit';

const mockFetch = fetchExerciseForEdit as jest.Mock;

const variationId = 'd3f0e8a2-3333-4ba2-b2c3-324a63844771';

const editData: ExerciseForEditResponse = {
  variationId,
  exerciseName: 'Supino',
  measurementType: 'weight_reps',
  variationName: 'Barra',
  muscleId: 'b1d0e8a2-1111-4ba2-b2c3-324a63844771',
  secondaryMuscleId: null,
  equipmentId: 'c2e1f9b3-2222-4ba2-b2c3-324a63844771',
  equipmentSlug: 'barbell',
  equipmentPreposition: 'com',
  youtubeVideoUrl: null,
  video: null,
};

function makeWrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return { wrapper };
}

describe('useExerciseForEdit', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('fetches the exercise edit data for the given variation', async () => {
    mockFetch.mockResolvedValueOnce(editData);
    const { wrapper } = makeWrapper();

    const { result } = renderHook(() => useExerciseForEdit(variationId), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(editData);
    expect(mockFetch.mock.calls[0][0]).toBe(variationId);
  });

  test('stays idle when no variation id is given', () => {
    const { wrapper } = makeWrapper();

    const { result } = renderHook(() => useExerciseForEdit(''), { wrapper });

    expect(result.current.fetchStatus).toBe('idle');
    expect(mockFetch).not.toHaveBeenCalled();
  });
});
