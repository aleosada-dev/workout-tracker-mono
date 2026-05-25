jest.mock('@/features/auth/hooks/useSession', () => ({
  useSession: () => ({
    session: { user: { id: '00000000-0000-4000-8000-000000000001' } },
  }),
}));
jest.mock('@/features/workouts/api/workouts', () => ({
  createWorkoutFolder: jest.fn(),
  fetchWorkoutFolders: jest.fn(),
}));

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { createWorkoutFolder, fetchWorkoutFolders } from '@/features/workouts/api/workouts';
import { useCreateWorkoutFolder } from '@/features/workouts/hooks/use-create-workout-folder';
import { useWorkoutFolders } from '@/features/workouts/hooks/use-workout-folders';

const mockCreate = createWorkoutFolder as jest.Mock;
const mockFetch = fetchWorkoutFolders as jest.Mock;

const FOLDER_A = {
  id: 'aaa',
  userId: '00000000-0000-4000-8000-000000000001',
  name: 'A',
  color: 'blue',
  workoutCount: 0,
  createdAt: '2026-05-25T00:00:00Z',
  updatedAt: '2026-05-25T00:00:00Z',
};
const FOLDER_B = {
  ...FOLDER_A,
  id: 'bbb',
  name: 'B',
  color: 'amber',
};

function makeWrapper() {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0, staleTime: 0 },
      mutations: { retry: false },
    },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return { client, wrapper };
}

describe('useCreateWorkoutFolder', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('invalidate triggers a refetch of useWorkoutFolders', async () => {
    mockFetch.mockResolvedValueOnce([FOLDER_A]);
    mockCreate.mockResolvedValueOnce(FOLDER_B);
    mockFetch.mockResolvedValueOnce([FOLDER_A, FOLDER_B]);

    const { wrapper } = makeWrapper();

    const folders = renderHook(() => useWorkoutFolders(), { wrapper });
    await waitFor(() => expect(folders.result.current.data).toEqual([FOLDER_A]));
    expect(mockFetch).toHaveBeenCalledTimes(1);

    const create = renderHook(() => useCreateWorkoutFolder(), { wrapper });
    act(() => {
      create.result.current.mutate({ name: 'B', color: 'amber' });
    });

    await waitFor(() => expect(create.result.current.isSuccess).toBe(true));
    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(folders.result.current.data).toEqual([FOLDER_A, FOLDER_B]));
  });
});
