# API client + TanStack Query setup — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Provide a typed `apiClient` that injects Supabase access tokens, plus TanStack Query wiring so feature hooks can consume it.

**Architecture:** Pure transport layer (`src/lib/api`) that owns `fetch`, base URL, and auth. Throws typed errors only — never mutates auth state. A separate orchestration layer (`src/lib/query`) owns the `QueryClient` and reacts to `ApiUnauthorizedError` via `QueryCache`/`MutationCache` listeners by calling `supabase.auth.signOut()`. Features later consume `apiClient` from inside `useQuery`/`useMutation` hooks.

**Tech Stack:** TypeScript, fetch, `@tanstack/react-query@5`, `@supabase/supabase-js@2`, Jest + jest-expo, Biome. Path alias `@/*` → `./src/*`.

**Spec:** [`docs/superpowers/specs/2026-05-09-api-client-design.md`](../specs/2026-05-09-api-client-design.md)

---

## File map

**Created:**
- `src/lib/api/errors.ts`
- `src/lib/api/errors.test.ts`
- `src/lib/api/config.ts`
- `src/lib/api/client.ts`
- `src/lib/api/client.test.ts`
- `src/lib/api/index.ts`
- `src/lib/query/client.ts`
- `src/lib/query/client.test.ts`
- `src/lib/query/provider.tsx`

**Modified:**
- `src/app/_layout.tsx` (wrap tree with `<QueryProvider>`)
- `CLAUDE.md` (add API conventions section)
- `.env` (add `EXPO_PUBLIC_API_URL=http://192.168.15.3/api/v1` — engineer must update locally; not committed)

---

## Conventions used in this plan

- Test files live next to source as `*.test.ts` (per CLAUDE.md). The existing `src/__tests__/` location is from before this convention; new tests go next to source.
- All imports use the `@/*` alias.
- After every passing test run, do **not** auto-commit. The user has a memory rule: only commit when asked. **Pause for the user** at the commit step in each task — show the staged diff and the proposed message, and wait for explicit approval before running `git commit`.
- Lefthook hooks run on commit (lint + tests). Don't bypass with `--no-verify`.

---

## Task 1: Errors module

**Files:**
- Create: `src/lib/api/errors.ts`
- Test: `src/lib/api/errors.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/api/errors.test.ts`:

```ts
import { ApiError, ApiNetworkError, ApiUnauthorizedError } from './errors';

describe('ApiError', () => {
  test('exposes status, message, and optional code', () => {
    const err = new ApiError(500, 'Boom', 'INTERNAL');
    expect(err.status).toBe(500);
    expect(err.message).toBe('Boom');
    expect(err.code).toBe('INTERNAL');
    expect(err.name).toBe('ApiError');
  });

  test('code is undefined when not provided', () => {
    const err = new ApiError(404, 'Not found');
    expect(err.code).toBeUndefined();
  });
});

describe('ApiUnauthorizedError', () => {
  test('is an ApiError with status 401', () => {
    const err = new ApiUnauthorizedError('Token expired');
    expect(err).toBeInstanceOf(ApiError);
    expect(err).toBeInstanceOf(ApiUnauthorizedError);
    expect(err.status).toBe(401);
    expect(err.message).toBe('Token expired');
    expect(err.name).toBe('ApiUnauthorizedError');
  });

  test('defaults message to "Unauthorized"', () => {
    const err = new ApiUnauthorizedError();
    expect(err.message).toBe('Unauthorized');
  });
});

describe('ApiNetworkError', () => {
  test('wraps the underlying cause', () => {
    const cause = new TypeError('Network request failed');
    const err = new ApiNetworkError(cause);
    expect(err.cause).toBe(cause);
    expect(err.name).toBe('ApiNetworkError');
    expect(err.message).toBe('Network request failed');
  });

  test('is not an ApiError (network failures have no HTTP status)', () => {
    const err = new ApiNetworkError(new Error('boom'));
    expect(err).not.toBeInstanceOf(ApiError);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun run test -- src/lib/api/errors.test.ts`

Expected: FAIL — `Cannot find module './errors'`.

- [ ] **Step 3: Implement `errors.ts`**

Create `src/lib/api/errors.ts`:

```ts
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

- [ ] **Step 4: Run test to verify it passes**

Run: `bun run test -- src/lib/api/errors.test.ts`

Expected: PASS — 6 tests.

- [ ] **Step 5: Pause for commit approval**

Show the user `git status` and `git diff src/lib/api/`, propose the message:

```
feat(api): add ApiError, ApiUnauthorizedError, ApiNetworkError
```

Wait for explicit approval. Only on approval:

```bash
git add src/lib/api/errors.ts src/lib/api/errors.test.ts
git commit -m "feat(api): add ApiError, ApiUnauthorizedError, ApiNetworkError"
```

---

## Task 2: Config module

**Files:**
- Create: `src/lib/api/config.ts`

No test file — same pattern as `src/lib/supabase.ts` (validate at module load, throw if missing).

- [ ] **Step 1: Implement `config.ts`**

Create `src/lib/api/config.ts`:

```ts
const url = process.env.EXPO_PUBLIC_API_URL;

if (!url) {
  throw new Error('Missing EXPO_PUBLIC_API_URL. Set it in .env.');
}

export function getBaseUrl(): string {
  // url is non-null here (validated at module load).
  return url as string;
}
```

- [ ] **Step 2: Add `EXPO_PUBLIC_API_URL` to local `.env`**

Add this line to your local `.env` (do not commit `.env`):

```
EXPO_PUBLIC_API_URL=http://192.168.15.3/api/v1
```

If a `.env.example` exists, also add the line there (committed). If not, skip — no `.env.example` is currently in the repo.

- [ ] **Step 3: Verify TypeScript compiles**

Run: `bun run check:ci` (Biome) and `npx tsc --noEmit` (or rely on the editor). Expected: no errors related to `config.ts`.

- [ ] **Step 4: Pause for commit approval**

Wait for the user. On approval:

```bash
git add src/lib/api/config.ts
git commit -m "feat(api): add EXPO_PUBLIC_API_URL config loader"
```

---

## Task 3: apiClient — success path (GET, base URL, signal)

**Files:**
- Create: `src/lib/api/client.ts`
- Test: `src/lib/api/client.test.ts`

This task establishes the test scaffolding (mocks for `config`, `supabase`, `observability`, `fetch`) and the minimal GET happy path.

- [ ] **Step 1: Write the failing tests**

Create `src/lib/api/client.test.ts`:

```ts
jest.mock('@/lib/api/config', () => ({
  getBaseUrl: () => 'http://test.local/api/v1',
}));

jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(),
    },
  },
}));

jest.mock('@/lib/observability', () => ({
  observability: {
    addBreadcrumb: jest.fn(),
  },
}));

import { observability } from '@/lib/observability';
import { supabase } from '@/lib/supabase';
import { apiClient } from './client';

const mockGetSession = supabase.auth.getSession as jest.Mock;
const mockBreadcrumb = observability.addBreadcrumb as jest.Mock;
const mockFetch = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  (global as unknown as { fetch: jest.Mock }).fetch = mockFetch;
  mockGetSession.mockResolvedValue({
    data: { session: { access_token: 'fake-token' } },
    error: null,
  });
});

function jsonResponse(body: unknown, init: ResponseInit = { status: 200 }) {
  return new Response(JSON.stringify(body), {
    status: init.status ?? 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('apiClient.get', () => {
  test('prefixes base URL and parses JSON response', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ id: 1, name: 'Fullbody' }));

    const result = await apiClient.get<{ id: number; name: string }>('/workouts/1');

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url] = mockFetch.mock.calls[0];
    expect(url).toBe('http://test.local/api/v1/workouts/1');
    expect(result).toEqual({ id: 1, name: 'Fullbody' });
  });

  test('forwards AbortSignal to fetch', async () => {
    const controller = new AbortController();
    mockFetch.mockResolvedValueOnce(jsonResponse([]));

    await apiClient.get('/workouts', { signal: controller.signal });

    const [, init] = mockFetch.mock.calls[0];
    expect(init.signal).toBe(controller.signal);
  });

  test('uses GET method', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse([]));

    await apiClient.get('/workouts');

    const [, init] = mockFetch.mock.calls[0];
    expect(init.method).toBe('GET');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun run test -- src/lib/api/client.test.ts`

Expected: FAIL — `Cannot find module './client'`.

- [ ] **Step 3: Implement minimal `client.ts`**

Create `src/lib/api/client.ts`:

```ts
import { observability } from '@/lib/observability';
import { supabase } from '@/lib/supabase';
import { getBaseUrl } from './config';
import { ApiError, ApiNetworkError, ApiUnauthorizedError } from './errors';

type RequestOptions = {
  signal?: AbortSignal;
  headers?: Record<string, string>;
  authenticated?: boolean;
};

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

async function request<T>(
  method: Method,
  path: string,
  body: unknown,
  options: RequestOptions = {},
): Promise<T> {
  const url = `${getBaseUrl()}${path}`;
  const headers: Record<string, string> = { ...(options.headers ?? {}) };

  let init: RequestInit = { method, headers, signal: options.signal };

  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    init = { ...init, body: JSON.stringify(body) };
  }

  let response: Response;
  try {
    response = await fetch(url, init);
  } catch (cause) {
    throw new ApiNetworkError(cause);
  }

  observability.addBreadcrumb({
    category: 'http',
    message: `${method} ${path}`,
    data: { status: response.status },
  });

  if (response.status === 401) {
    const message = await safeReadMessage(response);
    throw new ApiUnauthorizedError(message ?? 'Unauthorized');
  }

  if (!response.ok) {
    const { message, code } = await safeReadError(response);
    throw new ApiError(response.status, message, code);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

async function safeReadMessage(response: Response): Promise<string | null> {
  try {
    const body = (await response.json()) as { message?: string; error?: string };
    return body.message ?? body.error ?? null;
  } catch {
    return null;
  }
}

async function safeReadError(
  response: Response,
): Promise<{ message: string; code?: string }> {
  try {
    const body = (await response.json()) as {
      message?: string;
      error?: string;
      code?: string;
    };
    const message = body.message ?? body.error ?? `HTTP ${response.status}`;
    return { message, code: body.code };
  } catch {
    return { message: `HTTP ${response.status}` };
  }
}

export const apiClient = {
  get: <T>(path: string, options?: RequestOptions) =>
    request<T>('GET', path, undefined, options),
  post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>('POST', path, body, options),
  put: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>('PUT', path, body, options),
  patch: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>('PATCH', path, body, options),
  delete: <T>(path: string, options?: RequestOptions) =>
    request<T>('DELETE', path, undefined, options),
};
```

> **Note**: this implementation passes Task 3, 5, 6, and 7 tests as-is. Task 4 adds auth header injection; tasks 5-7 are pure test additions that lock in already-implemented behavior in their own commits.

- [ ] **Step 4: Run test to verify it passes**

Run: `bun run test -- src/lib/api/client.test.ts`

Expected: PASS — 3 tests.

- [ ] **Step 5: Pause for commit approval**

On approval:

```bash
git add src/lib/api/client.ts src/lib/api/client.test.ts
git commit -m "feat(api): add apiClient.get with base URL and signal forwarding"
```

---

## Task 4: apiClient — auth header injection

**Files:**
- Modify: `src/lib/api/client.test.ts` (add tests)
- Modify: `src/lib/api/client.ts` (add header injection)

- [ ] **Step 1: Write failing tests for auth header**

Append to `src/lib/api/client.test.ts`, after the `describe('apiClient.get', ...)` block:

```ts
describe('apiClient auth header', () => {
  test('injects Authorization: Bearer <token> from Supabase session', async () => {
    mockGetSession.mockResolvedValueOnce({
      data: { session: { access_token: 'real-token-abc' } },
      error: null,
    });
    mockFetch.mockResolvedValueOnce(jsonResponse([]));

    await apiClient.get('/workouts');

    const [, init] = mockFetch.mock.calls[0];
    expect(init.headers.Authorization).toBe('Bearer real-token-abc');
  });

  test('omits Authorization header when no session exists', async () => {
    mockGetSession.mockResolvedValueOnce({
      data: { session: null },
      error: null,
    });
    mockFetch.mockResolvedValueOnce(jsonResponse([]));

    await apiClient.get('/workouts');

    const [, init] = mockFetch.mock.calls[0];
    expect(init.headers.Authorization).toBeUndefined();
  });

  test('omits Authorization header when authenticated: false', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse([]));

    await apiClient.get('/public-data', { authenticated: false });

    expect(mockGetSession).not.toHaveBeenCalled();
    const [, init] = mockFetch.mock.calls[0];
    expect(init.headers.Authorization).toBeUndefined();
  });

  test('merges custom headers without dropping Authorization', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse([]));

    await apiClient.get('/workouts', { headers: { 'X-Trace-Id': 'abc' } });

    const [, init] = mockFetch.mock.calls[0];
    expect(init.headers.Authorization).toBe('Bearer fake-token');
    expect(init.headers['X-Trace-Id']).toBe('abc');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `bun run test -- src/lib/api/client.test.ts`

Expected: 2 of the 4 new tests FAIL — the two that expect `Bearer ...` (since no header is injected yet). The two that expect `undefined` already pass because Task 3's impl never sets the header.

- [ ] **Step 3: Update `client.ts` to inject the header**

Modify the `request` function in `src/lib/api/client.ts`. Replace the section that builds `init` with:

```ts
async function request<T>(
  method: Method,
  path: string,
  body: unknown,
  options: RequestOptions = {},
): Promise<T> {
  const url = `${getBaseUrl()}${path}`;
  const headers: Record<string, string> = { ...(options.headers ?? {}) };

  if (options.authenticated !== false) {
    const { data } = await supabase.auth.getSession();
    if (data.session?.access_token) {
      headers.Authorization = `Bearer ${data.session.access_token}`;
    }
  }

  let init: RequestInit = { method, headers, signal: options.signal };

  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    init = { ...init, body: JSON.stringify(body) };
  }

  // ... rest unchanged
```

- [ ] **Step 4: Run tests to verify all pass**

Run: `bun run test -- src/lib/api/client.test.ts`

Expected: PASS — 7 tests total.

- [ ] **Step 5: Pause for commit approval**

On approval:

```bash
git add src/lib/api/client.ts src/lib/api/client.test.ts
git commit -m "feat(api): inject Supabase access token as Authorization header"
```

---

## Task 5: apiClient — POST/PUT/PATCH/DELETE with body

**Files:**
- Modify: `src/lib/api/client.test.ts` (add tests)

The `client.ts` implementation already handles bodies; this task locks in the contract with tests.

- [ ] **Step 1: Write tests for write methods**

Append to `src/lib/api/client.test.ts`:

```ts
describe('apiClient write methods', () => {
  test('POST serializes body as JSON and sets Content-Type', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ id: 1 }));

    await apiClient.post('/workouts', { name: 'Fullbody' });

    const [, init] = mockFetch.mock.calls[0];
    expect(init.method).toBe('POST');
    expect(init.headers['Content-Type']).toBe('application/json');
    expect(init.body).toBe(JSON.stringify({ name: 'Fullbody' }));
  });

  test('PUT serializes body', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({}));

    await apiClient.put('/workouts/1', { name: 'Updated' });

    const [, init] = mockFetch.mock.calls[0];
    expect(init.method).toBe('PUT');
    expect(init.body).toBe(JSON.stringify({ name: 'Updated' }));
  });

  test('PATCH serializes body', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({}));

    await apiClient.patch('/workouts/1', { name: 'Patched' });

    const [, init] = mockFetch.mock.calls[0];
    expect(init.method).toBe('PATCH');
    expect(init.body).toBe(JSON.stringify({ name: 'Patched' }));
  });

  test('DELETE sends no body and no Content-Type', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({}));

    await apiClient.delete('/workouts/1');

    const [, init] = mockFetch.mock.calls[0];
    expect(init.method).toBe('DELETE');
    expect(init.body).toBeUndefined();
    expect(init.headers['Content-Type']).toBeUndefined();
  });

  test('POST without body sends no body and no Content-Type', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({}));

    await apiClient.post('/workouts/1/start');

    const [, init] = mockFetch.mock.calls[0];
    expect(init.body).toBeUndefined();
    expect(init.headers['Content-Type']).toBeUndefined();
  });

  test('204 No Content returns undefined', async () => {
    mockFetch.mockResolvedValueOnce(new Response(null, { status: 204 }));

    const result = await apiClient.delete<undefined>('/workouts/1');

    expect(result).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run tests**

Run: `bun run test -- src/lib/api/client.test.ts`

Expected: PASS — 13 tests total. All write-method behavior is already implemented in Task 3.

- [ ] **Step 3: Pause for commit approval**

On approval:

```bash
git add src/lib/api/client.test.ts
git commit -m "test(api): cover POST/PUT/PATCH/DELETE and 204 responses"
```

---

## Task 6: apiClient — error path

**Files:**
- Modify: `src/lib/api/client.test.ts` (add tests)

- [ ] **Step 1: Write tests for error handling**

Append to `src/lib/api/client.test.ts`:

```ts
import { ApiError, ApiNetworkError, ApiUnauthorizedError } from './errors';

describe('apiClient error path', () => {
  test('401 throws ApiUnauthorizedError with parsed message', async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ message: 'Token expired' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    await expect(apiClient.get('/workouts')).rejects.toMatchObject({
      name: 'ApiUnauthorizedError',
      status: 401,
      message: 'Token expired',
    });
  });

  test('401 thrown error is also instanceof ApiError', async () => {
    mockFetch.mockResolvedValueOnce(new Response(null, { status: 401 }));

    let caught: unknown;
    try {
      await apiClient.get('/workouts');
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(ApiUnauthorizedError);
    expect(caught).toBeInstanceOf(ApiError);
  });

  test('4xx with JSON body populates message and code', async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ message: 'Bad input', code: 'INVALID_NAME' }), {
        status: 422,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    await expect(apiClient.post('/workouts', {})).rejects.toMatchObject({
      name: 'ApiError',
      status: 422,
      message: 'Bad input',
      code: 'INVALID_NAME',
    });
  });

  test('uses "error" field when "message" is absent', async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ error: 'Not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    await expect(apiClient.get('/workouts/999')).rejects.toMatchObject({
      status: 404,
      message: 'Not found',
    });
  });

  test('4xx without parseable body falls back to "HTTP <status>"', async () => {
    mockFetch.mockResolvedValueOnce(new Response('not json', { status: 400 }));

    await expect(apiClient.get('/workouts')).rejects.toMatchObject({
      status: 400,
      message: 'HTTP 400',
    });
  });

  test('5xx throws ApiError with status', async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ message: 'Server boom' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    await expect(apiClient.get('/workouts')).rejects.toMatchObject({
      name: 'ApiError',
      status: 500,
      message: 'Server boom',
    });
  });

  test('fetch rejection throws ApiNetworkError preserving cause', async () => {
    const cause = new TypeError('Network request failed');
    mockFetch.mockRejectedValueOnce(cause);

    let caught: unknown;
    try {
      await apiClient.get('/workouts');
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(ApiNetworkError);
    expect((caught as ApiNetworkError).cause).toBe(cause);
  });
});
```

- [ ] **Step 2: Run tests**

Run: `bun run test -- src/lib/api/client.test.ts`

Expected: PASS — 20 tests total. The error path is already implemented in Task 3.

- [ ] **Step 3: Pause for commit approval**

On approval:

```bash
git add src/lib/api/client.test.ts
git commit -m "test(api): cover 401, 4xx, 5xx, and network errors"
```

---

## Task 7: apiClient — breadcrumbs

**Files:**
- Modify: `src/lib/api/client.test.ts` (add tests)

- [ ] **Step 1: Write tests for breadcrumbs**

Append to `src/lib/api/client.test.ts`:

```ts
describe('apiClient breadcrumbs', () => {
  test('adds an http breadcrumb on success', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse([]));

    await apiClient.get('/workouts');

    expect(mockBreadcrumb).toHaveBeenCalledWith({
      category: 'http',
      message: 'GET /workouts',
      data: { status: 200 },
    });
  });

  test('adds an http breadcrumb on 4xx (before throwing)', async () => {
    mockFetch.mockResolvedValueOnce(new Response(null, { status: 404 }));

    await expect(apiClient.get('/workouts/999')).rejects.toBeDefined();

    expect(mockBreadcrumb).toHaveBeenCalledWith({
      category: 'http',
      message: 'GET /workouts/999',
      data: { status: 404 },
    });
  });

  test('does NOT add a breadcrumb when fetch throws (no response)', async () => {
    mockFetch.mockRejectedValueOnce(new TypeError('Network down'));

    await expect(apiClient.get('/workouts')).rejects.toBeInstanceOf(Error);

    expect(mockBreadcrumb).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run tests**

Run: `bun run test -- src/lib/api/client.test.ts`

Expected: PASS — 23 tests total. Breadcrumbs are already added in Task 3's implementation.

- [ ] **Step 3: Pause for commit approval**

On approval:

```bash
git add src/lib/api/client.test.ts
git commit -m "test(api): cover http breadcrumbs on success and HTTP errors"
```

---

## Task 8: API public re-exports

**Files:**
- Create: `src/lib/api/index.ts`

- [ ] **Step 1: Write the re-export module**

Create `src/lib/api/index.ts`:

```ts
export { apiClient } from './client';
export { ApiError, ApiNetworkError, ApiUnauthorizedError } from './errors';
```

`config.ts` is intentionally not re-exported — it's an internal detail of the client.

- [ ] **Step 2: Verify it builds**

Run: `bun run check:ci`

Expected: no errors.

- [ ] **Step 3: Pause for commit approval**

On approval:

```bash
git add src/lib/api/index.ts
git commit -m "feat(api): expose apiClient and error classes via lib/api"
```

---

## Task 9: QueryClient with cache-level error listeners

**Files:**
- Create: `src/lib/query/client.ts`
- Test: `src/lib/query/client.test.ts`

> **Verify SDK API first** (per memory `feedback_verify_sdk_api_first.md`): confirm `@tanstack/react-query` v5 exports `QueryClient`, `QueryCache`, and `MutationCache`, and that both caches accept an `onError` option.
>
> Run: `cat node_modules/@tanstack/react-query/build/legacy/index.d.ts 2>/dev/null | grep -E "QueryCache|MutationCache" | head -5`
> If that path doesn't exist, try `node_modules/@tanstack/react-query/dist/index.d.ts`. You should see `QueryCache` and `MutationCache` exports.

- [ ] **Step 1: Write the failing test**

Create `src/lib/query/client.test.ts`:

```ts
jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      signOut: jest.fn(),
      getSession: jest.fn(),
    },
  },
}));

import { QueryClient } from '@tanstack/react-query';
import { ApiError, ApiUnauthorizedError } from '@/lib/api/errors';
import { supabase } from '@/lib/supabase';
import { createQueryClient } from './client';

const mockSignOut = supabase.auth.signOut as jest.Mock;

describe('createQueryClient', () => {
  let client: QueryClient;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSignOut.mockResolvedValue({ error: null });
    client = createQueryClient();
  });

  afterEach(() => {
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun run test -- src/lib/query/client.test.ts`

Expected: FAIL — `Cannot find module './client'`.

- [ ] **Step 3: Implement `query/client.ts`**

Create `src/lib/query/client.ts`:

```ts
import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query';
import { ApiUnauthorizedError } from '@/lib/api/errors';
import { supabase } from '@/lib/supabase';

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
```

> Why a factory + a singleton? `createQueryClient()` lets tests build fresh clients per test (avoiding state bleed). The exported `queryClient` is what `QueryProvider` uses at runtime.

- [ ] **Step 4: Run test to verify it passes**

Run: `bun run test -- src/lib/query/client.test.ts`

Expected: PASS — 4 tests.

- [ ] **Step 5: Pause for commit approval**

On approval:

```bash
git add src/lib/query/client.ts src/lib/query/client.test.ts
git commit -m "feat(query): create QueryClient that signs out on ApiUnauthorizedError"
```

---

## Task 10: QueryProvider component

**Files:**
- Create: `src/lib/query/provider.tsx`

No test — trivial provider wrapper.

- [ ] **Step 1: Implement `provider.tsx`**

Create `src/lib/query/provider.tsx`:

```tsx
import { QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { queryClient } from './client';

export function QueryProvider({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
```

- [ ] **Step 2: Verify TS / Biome**

Run: `bun run check:ci`

Expected: no errors.

- [ ] **Step 3: Pause for commit approval**

On approval:

```bash
git add src/lib/query/provider.tsx
git commit -m "feat(query): add QueryProvider wrapper"
```

---

## Task 11: Wire QueryProvider into root layout

**Files:**
- Modify: `src/app/_layout.tsx`

- [ ] **Step 1: Read current `_layout.tsx`**

Open `src/app/_layout.tsx` and locate the existing tree:

```tsx
<ObservabilityErrorBoundary>
  <ObservabilityProvider>
    <GestureHandlerRootView style={{ flex: 1 }}>
      ...
```

- [ ] **Step 2: Add the import**

In the imports section of `src/app/_layout.tsx`, add:

```ts
import { QueryProvider } from '@/lib/query/provider';
```

Maintain Biome's import sort order (it'll auto-fix on save / via `bun run check`).

- [ ] **Step 3: Wrap the tree with `<QueryProvider>`**

Change:

```tsx
<ObservabilityErrorBoundary>
  <ObservabilityProvider>
    <GestureHandlerRootView style={{ flex: 1 }}>
```

To:

```tsx
<ObservabilityErrorBoundary>
  <ObservabilityProvider>
    <QueryProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
```

And the matching closing tag — change:

```tsx
        </GestureHandlerRootView>
      </ObservabilityProvider>
    </ObservabilityErrorBoundary>
```

To:

```tsx
        </GestureHandlerRootView>
      </QueryProvider>
    </ObservabilityProvider>
  </ObservabilityErrorBoundary>
```

- [ ] **Step 4: Verify type check & lint pass**

Run: `bun run check:ci`

Expected: no errors. If Biome wants to reorder imports, run `bun run check` (without `:ci`) to apply.

- [ ] **Step 5: Smoke test the app boots**

Run: `bun run start` (or your usual dev command).

Expected: the app boots without errors. The auth flow still works (no API calls are made yet, so nothing depends on `EXPO_PUBLIC_API_URL` at runtime — but module load of `@/lib/api/config` will throw if it's not set, so make sure it's in `.env`).

If you don't want to start the dev server, at minimum verify `bun run test` still passes (the existing `WorkoutLogCard` test should continue to pass).

- [ ] **Step 6: Pause for commit approval**

On approval:

```bash
git add src/app/_layout.tsx
git commit -m "feat: mount QueryProvider in root layout"
```

---

## Task 12: Update CLAUDE.md

**Files:**
- Modify: `CLAUDE.md`

Add a new top-level section right after the `## Observability` section (and before `## i18n`).

- [ ] **Step 1: Add the API section**

Insert this section into `CLAUDE.md`:

```markdown
## API client

`src/lib/api/index.ts` exposes `apiClient` (typed `get/post/put/patch/delete`) and the error classes (`ApiError`, `ApiUnauthorizedError`, `ApiNetworkError`). All HTTP calls to the workout-tracker backend MUST go through `apiClient`. Never call `fetch` directly from features and never re-implement the auth header or base URL.

The base URL comes from `EXPO_PUBLIC_API_URL` in `.env`, validated at module load. Auth is automatic: the client reads the current Supabase access token and adds `Authorization: Bearer <token>`. For the rare public endpoint, pass `{ authenticated: false }`.

Errors are thrown, never logged inside the client. Features decide whether to surface them; the `QueryClient` in `src/lib/query/client.ts` reacts to `ApiUnauthorizedError` globally via `QueryCache`/`MutationCache` listeners and triggers `supabase.auth.signOut()`. Other errors propagate to the calling hook.

Required env var: `EXPO_PUBLIC_API_URL`. Missing values throw at module load (same pattern as Supabase).
```

- [ ] **Step 2: Verify the edit**

Run: `git diff CLAUDE.md`

Expected: only the new section was added; no other content changed.

- [ ] **Step 3: Pause for commit approval**

On approval:

```bash
git add CLAUDE.md
git commit -m "docs: document apiClient and 401 handling in CLAUDE.md"
```

---

## Final verification

- [ ] **Run the full unit test suite**

Run: `bun run test`

Expected: all tests pass — `errors.test.ts` (6), `client.test.ts` (23), `query/client.test.ts` (4), plus the existing `WorkoutLogCard.test.tsx` (6).

- [ ] **Run lint + type check**

Run: `bun run check:ci`

Expected: no errors.

- [ ] **Confirm scope**

Compare against the spec's "Scope of this PR" checklist. All items should be done:

- ✅ `src/lib/api/{client,errors,config,index}.ts`
- ✅ `src/lib/query/{client,provider}.tsx`
- ✅ Wire `QueryProvider` into `src/app/_layout.tsx`
- ✅ Unit tests for `client` and `errors`
- ✅ Update `CLAUDE.md`
- ❌ No feature hook (intentional — ships separately)

- [ ] **Tell the user the implementation is complete**

Report which tasks landed, total tests passing, and remind them that `EXPO_PUBLIC_API_URL` must be set in `.env` for the app to boot.

---

## Out of scope (do NOT do in this plan)

- Implementing any feature hook (e.g. `useWorkoutsQuery`). That's the next PR.
- Adding `.env.example`. The repo doesn't have one currently; don't introduce it as a side-effect.
- Touching `src/__tests__/` location or migrating existing tests.
- Adding integration tests or Maestro flows — no UI changed.
- Changing the existing Supabase wiring or `useSession`.
