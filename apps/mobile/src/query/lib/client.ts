import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query';
import { ApiUnauthorizedError } from '@/api/lib/errors';
import { supabase } from '@/shared/lib/supabase';

const handleAuthError = (err: unknown) => {
  if (err instanceof ApiUnauthorizedError) {
    void supabase.auth.signOut();
  }
};

export function createQueryClient(): QueryClient {
  return new QueryClient({
    queryCache: new QueryCache({ onError: handleAuthError }),
    mutationCache: new MutationCache({ onError: handleAuthError }),
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
