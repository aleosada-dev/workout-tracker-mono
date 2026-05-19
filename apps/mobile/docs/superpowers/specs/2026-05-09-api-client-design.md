# API client + TanStack Query setup

**Status:** Approved
**Date:** 2026-05-09

## Goal

Provide a single, typed entry point for calling the backend API at `EXPO_PUBLIC_API_URL` from React Native features. The client must inject the Supabase access token automatically, surface a stable error contract, and be the only place in the app that talks to `fetch`. Wire up TanStack Query so feature hooks (added in later PRs) can consume the client cleanly.

## Non-goals

- Building any real feature hook that consumes the client. The first consumer ships in a separate PR.
- Code-generated clients from OpenAPI. Types are written by hand per endpoint.
- Token refresh logic beyond what Supabase already does. We rely on `autoRefreshToken: true`.

## Context

- TanStack Query is installed (`@tanstack/react-query@^5.100.9`) but **not wired up** — no `QueryClientProvider`, no usage in `src/`.
- Supabase client (`src/lib/supabase.ts`) has `autoRefreshToken: true` and uses MMKV-encrypted persistence; `useSession()` exposes the current session via `onAuthStateChange`.
- Observability layer (`src/lib/observability`) reserves a `'http'` breadcrumb category. CLAUDE.md forbids `console.error` for user-visible failures and forbids importing `@sentry/react-native` directly from features.
- `EXPO_PUBLIC_API_URL` differs per environment (development uses `http://192.168.15.3/api/v1`; preview/production point at a public domain configured later).
- Backend returns errors as JSON with the shape `{ error: string, message?: string, code?: string }` (or similar — parser is tolerant of either `error` or `message` as the human-readable field).

## Architecture

```
src/
  lib/
    api/
      client.ts        // apiClient (singleton)
      errors.ts        // ApiError, ApiUnauthorizedError, ApiNetworkError
      config.ts        // getBaseUrl()
      index.ts         // public re-exports
    query/
      client.ts        // QueryClient with cache-level onError hook
      provider.tsx     // QueryProvider component
```

Three layers, in order of dependency:

1. **`lib/api`** — pure transport. Knows `fetch`, base URL, auth header. Imports `supabase` to read the current access token. **No React, no observability, no side effects on auth state.**
2. **`lib/query`** — TanStack Query wiring. Owns the `QueryClient`, listens to `QueryCache`/`MutationCache` errors, and reacts to `ApiUnauthorizedError` by calling `supabase.auth.signOut()`. This is where the "401 = logout" policy lives.
3. **`features/<feature>/api/`** (added in later PRs) — `useQuery`/`useMutation` hooks per resource. Never call `fetch` directly; always go through `apiClient`.

### Request flow

```
useWorkoutsQuery
  → apiClient.get<Workout[]>('/workouts', { signal })
    → getBaseUrl() + '/workouts'
    → supabase.auth.getSession() → access_token
    → fetch(url, { headers: { Authorization: `Bearer ${token}`, ... }, signal })
    → addBreadcrumb({ category: 'http', message: 'GET /workouts', data: { status } })
    → response.status === 401 → throw ApiUnauthorizedError(...)
    → !response.ok → parse JSON body → throw ApiError(status, message, code)
    → status === 204 → return undefined as T
    → return response.json() as T
  ← QueryCache.onError sees ApiUnauthorizedError → supabase.auth.signOut()
```

`Stack.Protected` in `_layout.tsx` reacts to the resulting auth state change and routes the user to `(auth)/signIn`.

## `apiClient` API

```ts
type RequestOptions = {
  signal?: AbortSignal;
  headers?: Record<string, string>;
  /** Default true. Set to false for endpoints that don't require auth. */
  authenticated?: boolean;
};

type ApiClient = {
  get<T>(path: string, options?: RequestOptions): Promise<T>;
  post<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T>;
  put<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T>;
  patch<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T>;
  delete<T>(path: string, options?: RequestOptions): Promise<T>;
};

export const apiClient: ApiClient;
```

### Behavior

- `path` is always relative (e.g. `/workouts`); the client prefixes `getBaseUrl()`.
- Body is JSON-serialized when present; `Content-Type: application/json` is added.
- Successful responses are JSON-parsed and returned as `T`.
- `204 No Content` returns `undefined as T` without parsing.
- `authenticated: false` skips token lookup and the `Authorization` header.
- `signal` is forwarded to `fetch` so TanStack Query cancellation works on unmount/refetch.
- Every request emits an `observability.addBreadcrumb({ category: 'http', message: '<METHOD> <path>', data: { status } })` (success and failure).
- The client **does not** call `signOut`, log errors, or otherwise mutate global state. It only throws.

### Error handling

- 401 → `throw new ApiUnauthorizedError(parsedMessage)`.
- Other non-2xx → try `response.json()`; pull `message` (or `error`) and `code` if present. `throw new ApiError(status, message, code)`. Fallback message: `HTTP <status>`.
- `fetch` itself throws (network down, DNS, etc.) → `throw new ApiNetworkError(cause)`.
- 5xx and `ApiNetworkError` are not retried by the client itself; TanStack Query's `retry: 1` default covers transient failures.

## Errors module

```ts
// src/lib/api/errors.ts

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly code?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export class ApiUnauthorizedError extends ApiError {
  constructor(message = 'Unauthorized') {
    super(401, message);
    this.name = 'ApiUnauthorizedError';
  }
}

export class ApiNetworkError extends Error {
  constructor(readonly cause: unknown) {
    super('Network request failed');
    this.name = 'ApiNetworkError';
  }
}
```

`ApiUnauthorizedError extends ApiError` so a single `instanceof ApiError` check still catches it; we test this explicitly.

## Config

```ts
// src/lib/api/config.ts
const url = process.env.EXPO_PUBLIC_API_URL;
if (!url) {
  throw new Error('Missing EXPO_PUBLIC_API_URL. Set it in .env.');
}
export function getBaseUrl(): string {
  return url;
}
```

Validated at module load, same pattern as `supabase.ts`. `.env` examples:

```
# development
EXPO_PUBLIC_API_URL=http://192.168.15.3/api/v1
# preview / production: configured via EAS secrets or .env.preview / .env.production
```

## TanStack Query setup

```ts
// src/lib/query/client.ts
import { QueryCache, QueryClient, MutationCache } from '@tanstack/react-query';
import { ApiUnauthorizedError } from '@/lib/api/errors';
import { supabase } from '@/lib/supabase';

const handleAuthError = (err: unknown) => {
  if (err instanceof ApiUnauthorizedError) {
    void supabase.auth.signOut();
  }
};

export const queryClient = new QueryClient({
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
```

```tsx
// src/lib/query/provider.tsx
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './client';

export function QueryProvider({ children }: { children: React.ReactNode }) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
```

Mounted in `src/app/_layout.tsx` between `ObservabilityProvider` and `GestureHandlerRootView`:

```tsx
<ObservabilityErrorBoundary>
  <ObservabilityProvider>
    <QueryProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        {/* ... */}
      </GestureHandlerRootView>
    </QueryProvider>
  </ObservabilityProvider>
</ObservabilityErrorBoundary>
```

## Testing

Unit tests (Jest, next to the source as `*.test.ts`):

- **`client.test.ts`** — `fetch` is mocked. Cases:
  - GET success returns parsed JSON typed as `T`.
  - POST/PUT/PATCH serialize body as JSON and set `Content-Type`.
  - Base URL is prefixed correctly when `path` starts with `/`.
  - `Authorization: Bearer <token>` is set when a session exists.
  - `authenticated: false` omits the `Authorization` header.
  - `signal` is forwarded to `fetch`.
  - 204 returns `undefined`.
  - 401 throws `ApiUnauthorizedError`; the error is also `instanceof ApiError`.
  - 4xx with JSON body populates `ApiError.message` and `ApiError.code`.
  - 4xx without JSON body falls back to `HTTP <status>`.
  - 5xx throws `ApiError`.
  - `fetch` throwing throws `ApiNetworkError` with the original cause attached.
  - Each request adds an `http` breadcrumb (mock `observability.addBreadcrumb`).

- **`errors.test.ts`** — `ApiUnauthorizedError` instances satisfy both `instanceof ApiUnauthorizedError` and `instanceof ApiError`.

No E2E (Maestro) tests — this PR doesn't touch UI.

## Scope of this PR

- ✅ `src/lib/api/{client,errors,config,index}.ts`
- ✅ `src/lib/query/{client,provider}.tsx`
- ✅ Wire `QueryProvider` into `src/app/_layout.tsx`
- ✅ Unit tests for `client` and `errors`
- ✅ Update `CLAUDE.md` with a short section: "API calls — always via `apiClient`; never `fetch` from features. 401 → automatic logout via `QueryCache`/`MutationCache` listeners on the `QueryClient`."
- ❌ No feature hook is implemented in this PR. The first feature consumer (e.g. `useWorkoutsQuery`) ships separately.

## Open questions

None — all clarified during brainstorming.
