import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import { supabase } from '@/features/shared/lib/supabase';
import i18n from '@/internationalization/i18n';
import { classifyGlobalError } from './error-handling';

const handleApiError = (err: unknown) => {
  switch (classifyGlobalError(err)) {
    case 'unauthorized':
      void supabase.auth.signOut();
      break;
    case 'network':
      Toast.show({
        type: 'error',
        text1: i18n.t('errors.network.title'),
        text2: i18n.t('errors.network.message'),
      });
      break;
    case 'server':
      Toast.show({
        type: 'error',
        text1: i18n.t('errors.server.title'),
        text2: i18n.t('errors.server.message'),
      });
      break;
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
