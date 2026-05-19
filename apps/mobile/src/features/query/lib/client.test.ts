jest.mock('@/features/shared/lib/supabase', () => {
  const { createSupabaseMock } = jest.requireActual('@/features/test-utils/supabase');
  return createSupabaseMock();
});

import type { QueryClient } from '@tanstack/react-query';
import { ApiError, ApiUnauthorizedError } from '@/features/api/lib/errors';
import { createQueryClient } from '@/features/query/lib/client';
import { supabase } from '@/features/shared/lib/supabase';

const mockSignOut = supabase.auth.signOut as jest.Mock;

describe('createQueryClient', () => {
  let client: QueryClient;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSignOut.mockResolvedValue({ error: null });
    client = createQueryClient();
  });

  afterEach(() => {
    for (const mutation of client.getMutationCache().getAll()) {
      mutation.destroy();
    }
    client.clear();
  });

  test('calls supabase.auth.signOut when a query throws ApiUnauthorizedError', async () => {
    await client
      .fetchQuery({
        queryKey: ['test'],
        queryFn: () => {
          throw new ApiUnauthorizedError();
        },
        retry: false,
      })
      .catch(() => {
        /* expected */
      });

    expect(mockSignOut).toHaveBeenCalledTimes(1);
  });

  test('calls supabase.auth.signOut when a mutation throws ApiUnauthorizedError', async () => {
    await client
      .getMutationCache()
      .build(client, {
        mutationFn: async () => {
          throw new ApiUnauthorizedError();
        },
        retry: false,
      })
      .execute(undefined)
      .catch(() => {
        /* expected */
      });

    expect(mockSignOut).toHaveBeenCalledTimes(1);
  });

  test('does NOT call signOut for non-401 ApiError', async () => {
    await client
      .fetchQuery({
        queryKey: ['test'],
        queryFn: () => {
          throw new ApiError(500, 'boom');
        },
        retry: false,
      })
      .catch(() => {
        /* expected */
      });

    expect(mockSignOut).not.toHaveBeenCalled();
  });

  test('does NOT call signOut for arbitrary errors', async () => {
    await client
      .fetchQuery({
        queryKey: ['test'],
        queryFn: () => {
          throw new Error('boom');
        },
        retry: false,
      })
      .catch(() => {
        /* expected */
      });

    expect(mockSignOut).not.toHaveBeenCalled();
  });
});
