import type { AppType } from '@workout-tracker/api-types';
import { hc } from 'hono/client';
import { getAccessToken } from '@/features/auth/lib';
import { observability } from '@/features/observability/lib';
import { getBaseUrl } from './config';
import { ApiError, ApiNetworkError, ApiUnauthorizedError } from './errors';

function extractUrl(input: RequestInfo | URL): string {
  if (typeof input === 'string') return input;
  if (input instanceof URL) return input.toString();
  return input.url;
}

const loggingFetch: typeof fetch = async (input, init) => {
  const url = extractUrl(input);
  const method = init?.method ?? 'GET';

  try {
    const response = await fetch(input, init);
    observability.addBreadcrumb({
      category: 'http',
      message: `${method} ${url}`,
      data: { status: response.status },
    });
    return response;
  } catch (err) {
    observability.addBreadcrumb({
      category: 'http',
      message: `${method} ${url} (network error)`,
    });
    throw new ApiNetworkError(err);
  }
};

type OkLike = { ok: boolean; status: number; json: () => Promise<unknown> };

/**
 * Lê `{ error }` / `{ message }` da resposta não-ok e devolve
 * ApiUnauthorizedError em 401 ou ApiError nos demais. Pareie com
 * `if (!response.ok) throw await buildApiError(response)` no call site para
 * preservar o narrowing nativo do Hono RPC sobre `.json()`.
 */
export async function buildApiError(response: OkLike): Promise<ApiError> {
  const message = await safeReadErrorMessage(response);
  if (response.status === 401) {
    return new ApiUnauthorizedError(message ?? 'Unauthorized');
  }
  return new ApiError(response.status, message ?? `HTTP ${response.status}`);
}

async function safeReadErrorMessage(response: OkLike): Promise<string | null> {
  try {
    const body = (await response.json()) as { error?: unknown; message?: unknown };
    if (typeof body.error === 'string') return body.error;
    if (typeof body.message === 'string') return body.message;
    return null;
  } catch {
    return null;
  }
}

/**
 * Typed Hono RPC client. Routes mirror the api app (`/api/v1/...`).
 * Auth header is injected per-call from the current Supabase session.
 */
export const honoClient = hc<AppType>(getBaseUrl(), {
  fetch: loggingFetch,
  headers: async (): Promise<Record<string, string>> => {
    const token = await getAccessToken();
    const headers: Record<string, string> = {};
    if (token) headers.Authorization = `Bearer ${token}`;
    return headers;
  },
});
