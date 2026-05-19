import { ApiUnauthorizedError } from '@/features/api/lib/errors';
import type { ModuleErrorContext } from '@/features/observability/lib';
import { useOnNewError } from './use-on-new-error';

/** Any request result that may have failed — `useQuery`, `useInfiniteQuery`, `useMutation`, … */
type RequestState = { isError: boolean; error: unknown };

type CaptureError = (err: unknown, ctx: ModuleErrorContext) => void;

/**
 * Reports a request's error to observability once per distinct error, skipping
 * `ApiUnauthorizedError` (already handled globally by the QueryClient, which
 * triggers `signOut`).
 */
export function useReportRequestError(
  request: RequestState,
  captureError: CaptureError,
  context: ModuleErrorContext,
) {
  useOnNewError(request.isError, request.error, (error) => {
    if (error instanceof ApiUnauthorizedError) return;
    captureError(error, context);
  });
}
