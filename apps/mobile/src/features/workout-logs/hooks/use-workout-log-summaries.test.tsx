jest.mock('@/features/workout-logs/api/workout-logs', () => ({
  fetchWorkoutLogSummaries: jest.fn(),
}));

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import {
  fetchWorkoutLogSummaries,
  type WorkoutLogSummariesPage,
} from '@/features/workout-logs/api/workout-logs';
import {
  PAGE_SIZE,
  useWorkoutLogSummaries,
} from '@/features/workout-logs/hooks/use-workout-log-summaries';

const mockFetch = fetchWorkoutLogSummaries as jest.Mock;

function makeWrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
}

const itemAt = (iso: string): WorkoutLogSummariesPage['items'][number] => ({
  id: iso,
  title: 'X',
  startedAt: iso,
  durationSeconds: 60,
  exerciseCount: 1,
  muscleGroupSlugs: [],
  prCount: 0,
});

describe('useWorkoutLogSummaries', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('first page is fetched with PAGE_SIZE and no cursor', async () => {
    mockFetch.mockResolvedValueOnce({
      items: [itemAt('2026-05-01T00:00:00Z')],
      hasMore: false,
    });

    const { result } = renderHook(() => useWorkoutLogSummaries(), { wrapper: makeWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockFetch).toHaveBeenCalledWith(
      expect.objectContaining({ limit: PAGE_SIZE, cursor: undefined }),
    );
  });

  test('fetchNextPage uses last item startedAt as cursor when hasMore', async () => {
    mockFetch
      .mockResolvedValueOnce({
        items: [itemAt('2026-05-03T00:00:00Z'), itemAt('2026-05-02T00:00:00Z')],
        hasMore: true,
      })
      .mockResolvedValueOnce({
        items: [itemAt('2026-05-01T00:00:00Z')],
        hasMore: false,
      });

    const { result } = renderHook(() => useWorkoutLogSummaries(), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    await act(async () => {
      await result.current.fetchNextPage();
    });

    expect(mockFetch).toHaveBeenLastCalledWith(
      expect.objectContaining({ limit: PAGE_SIZE, cursor: '2026-05-02T00:00:00Z' }),
    );
  });

  test('hasNextPage is false when hasMore is false', async () => {
    mockFetch.mockResolvedValueOnce({
      items: [itemAt('2026-05-01T00:00:00Z')],
      hasMore: false,
    });

    const { result } = renderHook(() => useWorkoutLogSummaries(), { wrapper: makeWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.hasNextPage).toBe(false);
  });
});
