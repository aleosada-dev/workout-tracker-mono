import { useEffect, useRef } from 'react';

/**
 * Calls `onError` once for each referentially distinct, non-null `error` while
 * `isError` is `true`. Re-renders carrying the same error do not re-fire — the
 * effect marks an error as seen *before* invoking the callback. When `isError`
 * is `false` nothing is recorded, so the same error can still fire later (useful
 * when callers gate with an extra condition, e.g. `isError && hadPages`).
 *
 * Works with any request state that exposes `{ isError, error }` —
 * `useQuery`, `useInfiniteQuery`, `useMutation`, …
 */
export function useOnNewError(isError: boolean, error: unknown, onError: (error: unknown) => void) {
  const lastSeenRef = useRef<unknown>(null);
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;
  useEffect(() => {
    if (!isError || !error) return;
    if (error === lastSeenRef.current) return;
    lastSeenRef.current = error;
    onErrorRef.current(error);
  }, [isError, error]);
}
