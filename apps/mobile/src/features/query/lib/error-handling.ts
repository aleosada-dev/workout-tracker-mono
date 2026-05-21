import { ApiError, ApiNetworkError, ApiUnauthorizedError } from '@/features/api/lib/errors';

/**
 * Categorias de erro que o QueryClient trata globalmente. `classifyGlobalError`
 * é a fonte única: tanto o `handleApiError` (em `client.ts`) quanto os
 * handlers de feature derivam dela, sem repetir a cadeia de `instanceof`.
 */
export type GlobalErrorKind = 'unauthorized' | 'network' | 'server';

export function classifyGlobalError(error: unknown): GlobalErrorKind | null {
  if (error instanceof ApiUnauthorizedError) return 'unauthorized';
  if (error instanceof ApiNetworkError) return 'network';
  if (error instanceof ApiError && error.status >= 500) return 'server';
  return null;
}

/** `true` quando o erro já foi tratado pelo handler global do QueryClient. */
export function isGloballyHandledError(error: unknown): boolean {
  return classifyGlobalError(error) !== null;
}

/**
 * Envolve o `onError` de uma mutation: descarta os erros já tratados
 * globalmente (signOut / toast de rede / toast 5xx) e delega o restante ao
 * `handler` da feature. Evita toast duplicado e telemetria redundante.
 */
export function handleLocalError(handler: (error: unknown) => void): (error: unknown) => void {
  return (error) => {
    if (isGloballyHandledError(error)) return;
    handler(error);
  };
}
