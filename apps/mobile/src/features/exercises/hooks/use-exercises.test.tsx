jest.mock('@/features/exercises/api/exercises', () => ({
  fetchExercises: jest.fn(),
}));

jest.mock('@/features/auth/hooks/useSession', () => ({
  useSession: () => ({ session: { user: { id: 'test-user' } }, loading: false }),
}));

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { fetchExercises } from '@/features/exercises/api/exercises';
import { useExercises } from '@/features/exercises/hooks/use-exercises';

const mockFetchExercises = fetchExercises as jest.Mock;

function makeWrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
}

const sampleItem = {
  id: 'ex-1',
  name: 'Abdominal',
  type: 'musculacao',
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
      measurementType: 'weight_reps',
      video: null,
      imageUrl: null,
    },
  ],
};

describe('useExercises', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('fetches the exercises list', async () => {
    mockFetchExercises.mockResolvedValueOnce([sampleItem]);

    const { result } = renderHook(() => useExercises(), { wrapper: makeWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockFetchExercises).toHaveBeenCalledTimes(1);
    expect(result.current.data).toEqual([sampleItem]);
  });

  test('surfaces fetch errors', async () => {
    mockFetchExercises.mockRejectedValueOnce(new Error('boom'));

    const { result } = renderHook(() => useExercises(), { wrapper: makeWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toEqual(new Error('boom'));
  });
});
