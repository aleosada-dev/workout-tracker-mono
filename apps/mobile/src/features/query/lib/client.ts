import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import { ApiError, ApiNetworkError, ApiUnauthorizedError } from '@/features/api/lib/errors';
import { supabase } from '@/features/shared/lib/supabase';
import i18n from '@/internationalization/i18n';

const handleApiError = (err: unknown) => {
  if (err instanceof ApiUnauthorizedError) {
    void supabase.auth.signOut();
    return;
  }
  if (err instanceof ApiNetworkError) {
    Toast.show({
      type: 'error',
      text1: i18n.t('errors.network.title'),
      text2: i18n.t('errors.network.message'),
    });
    return;
  }
  if (err instanceof ApiError && err.status >= 500) {
    Toast.show({
      type: 'error',
      text1: i18n.t('errors.server.title'),
      text2: i18n.t('errors.server.message'),
    });
  }
};

export function createQueryClient(): QueryClient {
  return new QueryClient({
    queryCache: new QueryCache({ onError: handleApiError }),
    mutationCache: new MutationCache({ onError: handleApiError }),
    defaultOptions: {
      queries: {
        retry: 1,
        staleTime: 30_000,
        refetchOnWindowFocus: false,
      },
      mutations: {
        retry: 0,
      },
    },
  });
}

export const queryClient = createQueryClient();
