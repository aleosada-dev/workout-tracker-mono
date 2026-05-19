jest.mock('@/features/shared/lib/supabase', () => {
  const { createSupabaseMock } = jest.requireActual('@/features/test-utils/supabase');
  return createSupabaseMock();
});

jest.mock('react-native-toast-message', () => {
  const { createToastMock } = jest.requireActual(
    '@/features/test-utils/react-native-toast-message',
  );
  return createToastMock();
});

import type { QueryClient } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import { ApiError, ApiNetworkError, ApiUnauthorizedError } from '@/features/api/lib/errors';
import { createQueryClient } from '@/features/query/lib/client';
import { supabase } from '@/features/shared/lib/supabase';
import { setupI18n } from '@/internationalization/i18n';

const mockSignOut = supabase.auth.signOut as jest.Mock;
const mockToastShow = Toast.show as jest.Mock;

describe('createQueryClient', () => {
  let client: QueryClient;

  beforeAll(() => {
    setupI18n('en');
  });

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

  const runQuery = (error: unknown) =>
    client
      .fetchQuery({
        queryKey: ['test'],
        queryFn: () => {
          throw error;
        },
        retry: false,
      })
      .catch(() => {
        /* expected */
      });

  const runMutation = (error: unknown) =>
    client
      .getMutationCache()
      .build(client, {
        mutationFn: async () => {
          throw error;
        },
        retry: false,
      })
      .execute(undefined)
      .catch(() => {
        /* expected */
      });

  test('calls supabase.auth.signOut when a query throws ApiUnauthorizedError', async () => {
    await runQuery(new ApiUnauthorizedError());
    expect(mockSignOut).toHaveBeenCalledTimes(1);
    expect(mockToastShow).not.toHaveBeenCalled();
  });

  test('calls supabase.auth.signOut when a mutation throws ApiUnauthorizedError', async () => {
    await runMutation(new ApiUnauthorizedError());
    expect(mockSignOut).toHaveBeenCalledTimes(1);
    expect(mockToastShow).not.toHaveBeenCalled();
  });

  test('shows server error toast when a query throws 5XX ApiError', async () => {
    await runQuery(new ApiError(500, 'boom'));
    expect(mockSignOut).not.toHaveBeenCalled();
    expect(mockToastShow).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'error', text1: 'Server error' }),
    );
  });

  test('shows server error toast when a mutation throws 5XX ApiError', async () => {
    await runMutation(new ApiError(503, 'down'));
    expect(mockToastShow).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'error', text1: 'Server error' }),
    );
  });

  test('shows network error toast when query throws ApiNetworkError', async () => {
    await runQuery(new ApiNetworkError(new Error('offline')));
    expect(mockToastShow).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'error', text1: 'No connection' }),
    );
  });

  test('does NOT show toast or call signOut for 4XX (non-401) ApiError', async () => {
    await runQuery(new ApiError(404, 'not found'));
    expect(mockSignOut).not.toHaveBeenCalled();
    expect(mockToastShow).not.toHaveBeenCalled();
  });

  test('does NOT show toast or call signOut for arbitrary errors', async () => {
    await runQuery(new Error('boom'));
    expect(mockSignOut).not.toHaveBeenCalled();
    expect(mockToastShow).not.toHaveBeenCalled();
  });
});
