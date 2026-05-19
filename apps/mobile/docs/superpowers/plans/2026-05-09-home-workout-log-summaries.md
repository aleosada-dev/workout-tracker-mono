# Home — Workout Log Summaries Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Substituir os `WorkoutLogCard` hardcoded da home por uma lista paginada (10 itens por página, cursor-based) consumindo `GET /workout-logs/summaries` via `useInfiniteQuery`.

**Architecture:** O envelope `{ data, error }` é desempacotado dentro do `apiClient` (vira padrão do app). O fetcher HTTP fica em `src/lib/api/workout-logs.ts`; tipos e formatters de domínio em `src/domain/workout-logs/`. UI via FlashList (Shopify) com skeleton no loading inicial, retry no erro inicial, toast em erro de página subsequente, e pull-to-refresh. Datas formatadas com `formatRelative` / `intervalToDuration` / `formatDuration` do date-fns no locale derivado do i18n.

**Tech Stack:** React Native 0.83 + Expo SDK 55 + expo-router · React Query (`useInfiniteQuery`) · `@shopify/flash-list` (novo) · `date-fns` (já presente) · `react-native-toast-message` · NativeWind v4 · Jest + `@testing-library/react-native`.

**Spec:** `docs/superpowers/specs/2026-05-09-home-workout-log-summaries-design.md`.

**Convenções deste repo lembradas:**
- Memória do usuário: **não fazer commits automáticos**. Este plano não inclui passos de commit; o usuário commita quando achar adequado.
- Memória do usuário: **sempre conferir API real do SDK** antes de assumir flags — se algum passo divergir do tipo real do `node_modules/.../*.d.ts`, ajustar antes de escrever o teste.
- CLAUDE.md: testes ficam em `src/__tests__/` (mirror), não ao lado da fonte.
- Path alias: `@/*` → `src/*`. Usar `bun run test -- <pattern>` para rodar testes pontuais.

---

## File Structure

| Arquivo | Ação | Responsabilidade |
|---|---|---|
| `src/lib/api/errors.ts` | MOD | `ApiError` ganha `details?: unknown` opcional |
| `src/lib/api/client.ts` | MOD | `request<T>` desempacota `{ data, error }` (sucesso e erro) |
| `src/__tests__/api/client.test.ts` | MOD | Atualiza casos de sucesso/erro para o novo contrato |
| `src/__tests__/api/errors.test.ts` | MOD | Cobre `details` em `ApiError` |
| `src/lib/api/workout-logs.ts` | NEW | `fetchWorkoutLogSummaries` — só transporte |
| `src/__tests__/api/workout-logs.test.ts` | NEW | Querystring, cursor, userId, signal |
| `src/domain/workout-logs/types.ts` | NEW | `WorkoutLogSummary`, `WorkoutLogSummariesPage`, `FetchWorkoutLogSummariesParams` |
| `src/internationalization/date-locale.ts` | NEW | `getDateFnsLocale(language)` → `Locale` |
| `src/domain/workout-logs/format.ts` | NEW | `formatWorkoutLogSubtitle`, `formatWorkoutDuration`, `formatExerciseCount`, `toCardProps` |
| `src/__tests__/domain/workout-logs/format.test.ts` | NEW | Faixas do `formatRelative`, durações, plurais, timezone |
| `src/hooks/use-workout-log-summaries.ts` | NEW | `useWorkoutLogSummaries()` (`useInfiniteQuery`) |
| `src/__tests__/hooks/use-workout-log-summaries.test.tsx` | NEW | `getNextPageParam` (hasMore + último item; sem mais páginas) |
| `src/components/workout-logs/WorkoutLogCardSkeleton.tsx` | NEW | Placeholder do card |
| `src/components/workout-logs/WorkoutLogList.tsx` | NEW | FlashList + estados |
| `src/__tests__/workout-logs/WorkoutLogList.test.tsx` | NEW | Skeleton/empty/error/pagination/toast/observability |
| `src/internationalization/locales/pt.ts` | MOD | Chaves `workoutLogs.*` |
| `src/internationalization/locales/en.ts` | MOD | Chaves `workoutLogs.*` |
| `src/app/(tabs)/index.tsx` | MOD | Renderiza `<WorkoutLogList />` |
| `package.json` | MOD | `bun add @shopify/flash-list` |

---

## Task 1: Add `@shopify/flash-list` dependency

**Files:**
- Modify: `package.json`
- Modify: `bun.lock`

- [ ] **Step 1: Install the dependency**

Run from repo root:

```bash
bun add @shopify/flash-list
```

Expected: `package.json` ganha `"@shopify/flash-list": "^x.y.z"` em `dependencies`. `bun.lock` é atualizado.

- [ ] **Step 2: Verify import resolves**

```bash
bun run -e 'import("@shopify/flash-list").then(m => console.log(typeof m.FlashList))'
```

Expected: imprime `function` (FlashList class component).

- [ ] **Step 3: Decide on rebuild**

`@shopify/flash-list` em RN 0.83/Expo 55 normalmente funciona sem custom native code. Nesta versão do pacote, NÃO é necessário rebuild do dev client. Se a primeira execução do app reclamar de native module ausente, fazer:

```bash
bun run prebuild:dev
bun run ios   # ou android
```

(Sem ação obrigatória neste passo — apenas registrado para referência.)

---

## Task 2: `ApiError` gains `details`

**Files:**
- Modify: `src/lib/api/errors.ts`
- Modify: `src/__tests__/api/errors.test.ts`

- [ ] **Step 1: Write the failing test**

Append a new `describe` block ao final de `src/__tests__/api/errors.test.ts`:

```ts
describe('ApiError details', () => {
  test('exposes optional details payload', () => {
    const details = { fields: { email: ['Email já em uso'] } };
    const err = new ApiError(422, 'Validação falhou', 'VALIDATION_ERROR', details);

    expect(err.details).toBe(details);
    expect(err.code).toBe('VALIDATION_ERROR');
    expect(err.status).toBe(422);
  });

  test('details defaults to undefined when omitted', () => {
    const err = new ApiError(500, 'boom');

    expect(err.details).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
bun run test -- src/__tests__/api/errors.test.ts
```

Expected: FAIL — `Property 'details' does not exist on type 'ApiError'` (ou o teste roda e falha em `expect(err.details).toBe(...)`).

- [ ] **Step 3: Implement `details` in `ApiError`**

`src/lib/api/errors.ts`:

```ts
export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly code?: string,
    readonly details?: unknown,
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

- [ ] **Step 4: Run the test to verify it passes**

```bash
bun run test -- src/__tests__/api/errors.test.ts
```

Expected: PASS.

---

## Task 3: `apiClient` unwraps `{ data, error }`

**Files:**
- Modify: `src/__tests__/api/client.test.ts`
- Modify: `src/lib/api/client.ts`

Contexto: o backend responde `{ data: T, error: null }` para sucesso e `{ data: null, error: { code, message, details? } }` para erro. Hoje o `apiClient` retorna o JSON cru. Vamos:
- No sucesso (`response.ok`), validar que `error === null` e retornar `payload.data`. Se vier `error != null` no body com status 2xx (defensivo), lançar `ApiError`.
- No erro (`!response.ok`), continuar lançando `ApiError`/`ApiUnauthorizedError`, mas extraindo `code`/`message`/`details` do envelope canônico (com fallback para `{ message }` cru).
- `204 No Content` continua devolvendo `undefined` antes de qualquer parse.

- [ ] **Step 1: Update existing success-path test fixtures (envelope wrap)**

Em `src/__tests__/api/client.test.ts`, todos os mocks de sucesso (200) precisam passar a embrulhar a payload em `{ data: ..., error: null }`. Substitua o helper `jsonResponse` atual pelas duas variações:

```ts
function successResponse<T>(data: T, init: ResponseInit = { status: 200 }) {
  return new Response(JSON.stringify({ data, error: null }), {
    status: init.status ?? 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

function envelopeErrorResponse(
  error: { code: string; message: string; details?: unknown },
  status: number,
) {
  return new Response(JSON.stringify({ data: null, error }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

// mantemos jsonResponse para casos malformados (sem envelope)
function rawResponse(body: unknown, init: ResponseInit = { status: 200 }) {
  return new Response(JSON.stringify(body), {
    status: init.status ?? 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
```

E troque, em todos os testes do `describe('apiClient.get')`, `describe('apiClient auth header')`, `describe('apiClient write methods')` e `describe('apiClient breadcrumbs')`, as chamadas `jsonResponse({...})` por `successResponse({...})` (mantendo o mesmo tipo de payload). Para os testes que usam `jsonResponse([])`, troque para `successResponse([])`.

- [ ] **Step 2: Add new tests for envelope unwrap (success)**

Adicione um novo `describe` após o `describe('apiClient.get')`:

```ts
describe('apiClient envelope unwrap (success)', () => {
  test('returns payload.data when response has { data, error: null }', async () => {
    mockFetch.mockResolvedValueOnce(successResponse({ id: 'abc', title: 'Fullbody' }));

    const result = await apiClient.get<{ id: string; title: string }>('/workouts/abc');

    expect(result).toEqual({ id: 'abc', title: 'Fullbody' });
  });

  test('preserves array payloads', async () => {
    mockFetch.mockResolvedValueOnce(successResponse([{ id: '1' }, { id: '2' }]));

    const result = await apiClient.get<{ id: string }[]>('/workouts');

    expect(result).toEqual([{ id: '1' }, { id: '2' }]);
  });

  test('throws ApiError when 2xx body carries error != null (defensive)', async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(
        JSON.stringify({ data: null, error: { code: 'SERVER_OOPS', message: 'oops' } }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );

    await expect(apiClient.get('/workouts')).rejects.toMatchObject({
      name: 'ApiError',
      status: 200,
      message: 'oops',
      code: 'SERVER_OOPS',
    });
  });
});
```

- [ ] **Step 3: Update existing error-path tests for envelope error shape**

No `describe('apiClient error path')`, substitua os bodies dos mocks de erro (4xx/5xx) para o envelope canônico, mantendo casos de fallback intactos:

```ts
test('401 throws ApiUnauthorizedError with parsed message', async () => {
  mockFetch.mockResolvedValueOnce(
    envelopeErrorResponse({ code: 'UNAUTHORIZED', message: 'Token expired' }, 401),
  );

  await expect(apiClient.get('/workouts')).rejects.toMatchObject({
    name: 'ApiUnauthorizedError',
    status: 401,
    message: 'Token expired',
  });
});

test('4xx with envelope body populates message, code, details', async () => {
  mockFetch.mockResolvedValueOnce(
    envelopeErrorResponse(
      {
        code: 'VALIDATION_ERROR',
        message: 'Validação falhou',
        details: { fields: { email: ['Email inválido'] } },
      },
      422,
    ),
  );

  await expect(apiClient.post('/workouts', {})).rejects.toMatchObject({
    name: 'ApiError',
    status: 422,
    message: 'Validação falhou',
    code: 'VALIDATION_ERROR',
    details: { fields: { email: ['Email inválido'] } },
  });
});

test('legacy raw body { message, code } still works (backward-compat fallback)', async () => {
  mockFetch.mockResolvedValueOnce(
    rawResponse({ message: 'Bad input', code: 'INVALID_NAME' }, { status: 422 }),
  );

  await expect(apiClient.post('/workouts', {})).rejects.toMatchObject({
    status: 422,
    message: 'Bad input',
    code: 'INVALID_NAME',
  });
});

test('uses "error" string field when no envelope', async () => {
  mockFetch.mockResolvedValueOnce(rawResponse({ error: 'Not found' }, { status: 404 }));

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

test('5xx with envelope throws ApiError with status', async () => {
  mockFetch.mockResolvedValueOnce(
    envelopeErrorResponse({ code: 'INTERNAL_ERROR', message: 'Server boom' }, 500),
  );

  await expect(apiClient.get('/workouts')).rejects.toMatchObject({
    name: 'ApiError',
    status: 500,
    message: 'Server boom',
    code: 'INTERNAL_ERROR',
  });
});
```

- [ ] **Step 4: Run the tests to verify they fail**

```bash
bun run test -- src/__tests__/api/client.test.ts
```

Expected: FAIL — todos os testes que esperam `data` desempacotado falham porque o `apiClient` ainda retorna o envelope cru. Os testes de envelope erro também falham porque o parser ainda lê `{ message }` cru.

- [ ] **Step 5: Implement envelope unwrap in `client.ts`**

Substitua `handleResponse` e `safeReadError` em `src/lib/api/client.ts`. Implementação completa do arquivo (substituir o conteúdo das funções afetadas; o `request` chama `handleResponse` igual a hoje):

```ts
import { getAccessToken } from '@/lib/auth';
import { observability } from '@/lib/observability';
import { getBaseUrl } from './config';
import { ApiError, ApiNetworkError, ApiUnauthorizedError } from './errors';

type RequestOptions = {
  signal?: AbortSignal;
  headers?: Record<string, string>;
  authenticated?: boolean;
};

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

type ApiErrorPayload = { code?: string; message?: string; details?: unknown };

type EnvelopeShape = { data?: unknown; error?: ApiErrorPayload | null };

async function request<T>(
  method: Method,
  path: string,
  body: unknown,
  options: RequestOptions = {},
): Promise<T> {
  const url = `${getBaseUrl()}${path}`;
  const headers: Record<string, string> = { ...(options.headers ?? {}) };

  if (options.authenticated !== false) {
    const token = await getAccessToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
  }

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

  return handleResponse<T>(response);
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (response.status === 401) {
    const message = await safeReadEnvelopeMessage(response);
    throw new ApiUnauthorizedError(message ?? 'Unauthorized');
  }

  if (!response.ok) {
    const { message, code, details } = await safeReadEnvelopeError(response);
    throw new ApiError(response.status, message, code, details);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const payload = (await response.json()) as EnvelopeShape;

  if (payload && typeof payload === 'object' && 'error' in payload && payload.error) {
    // Defensive: 2xx body carrying an error envelope.
    throw new ApiError(
      response.status,
      payload.error.message ?? `HTTP ${response.status}`,
      payload.error.code,
      payload.error.details,
    );
  }

  if (payload && typeof payload === 'object' && 'data' in payload) {
    return payload.data as T;
  }

  // No envelope at all — fallback to the raw payload (back-compat).
  return payload as T;
}

async function safeReadEnvelopeMessage(response: Response): Promise<string | null> {
  try {
    const body = (await response.json()) as EnvelopeShape & { message?: string; error?: unknown };
    if (body.error && typeof body.error === 'object' && 'message' in body.error) {
      return (body.error as ApiErrorPayload).message ?? null;
    }
    if (typeof body.error === 'string') return body.error;
    if (typeof body.message === 'string') return body.message;
    return null;
  } catch {
    return null;
  }
}

async function safeReadEnvelopeError(
  response: Response,
): Promise<{ message: string; code?: string; details?: unknown }> {
  try {
    const body = (await response.json()) as EnvelopeShape & {
      message?: string;
      error?: unknown;
      code?: string;
    };

    if (body.error && typeof body.error === 'object') {
      const err = body.error as ApiErrorPayload;
      return {
        message: err.message ?? `HTTP ${response.status}`,
        code: err.code,
        details: err.details,
      };
    }

    if (typeof body.error === 'string') {
      return { message: body.error };
    }

    if (typeof body.message === 'string') {
      return { message: body.message, code: body.code };
    }

    return { message: `HTTP ${response.status}` };
  } catch {
    return { message: `HTTP ${response.status}` };
  }
}

export const apiClient = {
  get: <T>(path: string, options?: RequestOptions) => request<T>('GET', path, undefined, options),
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

- [ ] **Step 6: Run the tests to verify they pass**

```bash
bun run test -- src/__tests__/api/client.test.ts
```

Expected: PASS.

- [ ] **Step 7: Run the full test suite to ensure no regression**

```bash
bun run test
```

Expected: PASS (todos os testes do repo). Se algum teste de outra feature consumia o envelope cru, ajustar a expectativa para o `data` desempacotado.

---

## Task 4: Domain types

**Files:**
- Create: `src/domain/workout-logs/types.ts`

- [ ] **Step 1: Create the types file**

```ts
export type WorkoutLogSummary = {
  id: string;
  title: string;
  /** ISO 8601 UTC, ex.: "2026-04-22T17:39:11.741831+00:00" */
  startedAt: string;
  durationSeconds: number;
  exerciseCount: number;
  muscleGroups: string[];
  prCount: number;
};

export type WorkoutLogSummariesPage = {
  items: WorkoutLogSummary[];
  hasMore: boolean;
};

export type FetchWorkoutLogSummariesParams = {
  limit: number;
  /** ISO do startedAt do último item da página anterior. */
  cursor?: string;
  /** Suportado pela API; reservado para futuras telas (não consumido hoje pela home). */
  userId?: string;
  signal?: AbortSignal;
};
```

- [ ] **Step 2: Confirm TypeScript happy**

```bash
bun run check
```

Expected: PASS (Biome) — sem novos arquivos a corrigir. (TS é checado pelo `expo start`/`tsc` mas Biome valida lint.)

---

## Task 5: Fetcher `fetchWorkoutLogSummaries`

**Files:**
- Create: `src/__tests__/api/workout-logs.test.ts`
- Create: `src/lib/api/workout-logs.ts`

- [ ] **Step 1: Write the failing test**

`src/__tests__/api/workout-logs.test.ts`:

```ts
jest.mock('@/lib/api/config', () => ({
  getBaseUrl: () => 'http://test.local/api/v1',
}));

jest.mock('@/lib/auth', () => {
  const { createAuthMock } = jest.requireActual('@/__tests__/mocks/auth');
  return createAuthMock();
});

jest.mock('@/lib/observability', () => {
  const { createObservabilityMock } = jest.requireActual('@/__tests__/mocks/observability');
  return createObservabilityMock();
});

import { fetchWorkoutLogSummaries } from '@/lib/api/workout-logs';

const mockFetch = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  (globalThis as unknown as { fetch: jest.Mock }).fetch = mockFetch;
});

function envelopeOk<T>(data: T) {
  return new Response(JSON.stringify({ data, error: null }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

const samplePage = {
  items: [
    {
      id: 'a1',
      title: 'Treino A',
      startedAt: '2026-05-01T12:00:00Z',
      durationSeconds: 3600,
      exerciseCount: 5,
      muscleGroups: ['Peito'],
      prCount: 0,
    },
  ],
  hasMore: true,
};

describe('fetchWorkoutLogSummaries', () => {
  test('first page: only limit in querystring', async () => {
    mockFetch.mockResolvedValueOnce(envelopeOk(samplePage));

    const result = await fetchWorkoutLogSummaries({ limit: 10 });

    const [url] = mockFetch.mock.calls[0];
    expect(url).toBe('http://test.local/api/v1/workout-logs/summaries?limit=10');
    expect(result).toEqual(samplePage);
  });

  test('subsequent pages: includes cursor', async () => {
    mockFetch.mockResolvedValueOnce(envelopeOk(samplePage));

    await fetchWorkoutLogSummaries({ limit: 10, cursor: '2026-04-22T17:39:11.741831+00:00' });

    const [url] = mockFetch.mock.calls[0];
    expect(url).toContain('limit=10');
    expect(url).toContain('cursor=2026-04-22T17%3A39%3A11.741831%2B00%3A00');
  });

  test('includes userId when passed', async () => {
    mockFetch.mockResolvedValueOnce(envelopeOk(samplePage));

    await fetchWorkoutLogSummaries({ limit: 10, userId: 'user-123' });

    const [url] = mockFetch.mock.calls[0];
    expect(url).toContain('userId=user-123');
  });

  test('forwards AbortSignal', async () => {
    const controller = new AbortController();
    mockFetch.mockResolvedValueOnce(envelopeOk(samplePage));

    await fetchWorkoutLogSummaries({ limit: 10, signal: controller.signal });

    const [, init] = mockFetch.mock.calls[0];
    expect(init.signal).toBe(controller.signal);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
bun run test -- src/__tests__/api/workout-logs.test.ts
```

Expected: FAIL — `Cannot find module '@/lib/api/workout-logs'`.

- [ ] **Step 3: Implement the fetcher**

`src/lib/api/workout-logs.ts`:

```ts
import { apiClient } from './client';
import type {
  FetchWorkoutLogSummariesParams,
  WorkoutLogSummariesPage,
} from '@/domain/workout-logs/types';

export async function fetchWorkoutLogSummaries({
  limit,
  cursor,
  userId,
  signal,
}: FetchWorkoutLogSummariesParams): Promise<WorkoutLogSummariesPage> {
  const qs = new URLSearchParams({ limit: String(limit) });
  if (cursor) qs.set('cursor', cursor);
  if (userId) qs.set('userId', userId);
  return apiClient.get<WorkoutLogSummariesPage>(
    `/workout-logs/summaries?${qs.toString()}`,
    { signal },
  );
}
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
bun run test -- src/__tests__/api/workout-logs.test.ts
```

Expected: PASS.

---

## Task 6: date-fns locale resolver

**Files:**
- Create: `src/internationalization/date-locale.ts`

- [ ] **Step 1: Implement the helper**

```ts
import { enUS, ptBR, type Locale } from 'date-fns/locale';

export function getDateFnsLocale(language: string | undefined): Locale {
  // Aceita 'pt', 'pt-BR', 'pt-br' etc. Default: ptBR (PT é o idioma padrão da app).
  if (!language) return ptBR;
  const normalized = language.toLowerCase().split('-')[0];
  if (normalized === 'en') return enUS;
  return ptBR;
}
```

- [ ] **Step 2: Smoke check**

Sem teste dedicado — o uso deste helper é coberto indiretamente em `format.test.ts` e no smoke do `WorkoutLogList`. Nenhum comando a rodar.

---

## Task 7: Format helpers + tests

**Files:**
- Create: `src/__tests__/domain/workout-logs/format.test.ts`
- Create: `src/domain/workout-logs/format.ts`

- [ ] **Step 1: Write the failing test**

`src/__tests__/domain/workout-logs/format.test.ts`:

```ts
import { ptBR, enUS } from 'date-fns/locale';
import {
  formatExerciseCount,
  formatWorkoutDuration,
  formatWorkoutLogSubtitle,
  toCardProps,
} from '@/domain/workout-logs/format';
import type { WorkoutLogSummary } from '@/domain/workout-logs/types';

const REFERENCE = new Date('2026-05-09T15:00:00Z');

beforeAll(() => {
  jest.useFakeTimers().setSystemTime(REFERENCE);
});

afterAll(() => {
  jest.useRealTimers();
});

const fakeT = ((key: string, opts?: { count?: number }) => {
  if (key === 'workoutLogs.exerciseCount') {
    return opts?.count === 1 ? '1 exercício' : `${opts?.count ?? 0} exercícios`;
  }
  return key;
}) as unknown as (key: string, opts?: { count?: number }) => string;

describe('formatWorkoutLogSubtitle', () => {
  test('today renders as "Hoje às HH:mm" capitalized (ptBR)', () => {
    // 2026-05-09T14:00:00Z → 2026-05-09 11:00 in BRT? We mock TZ in the test runner — assume UTC.
    const subtitle = formatWorkoutLogSubtitle('2026-05-09T14:00:00Z', ptBR as never);

    expect(subtitle.startsWith('H')).toBe(true); // "Hoje" / "Hoje às ..."
  });

  test('yesterday renders capitalized (ptBR)', () => {
    const subtitle = formatWorkoutLogSubtitle('2026-05-08T14:00:00Z', ptBR as never);

    expect(subtitle.toLowerCase()).toContain('ontem');
    expect(subtitle.charAt(0)).toBe(subtitle.charAt(0).toUpperCase());
  });

  test('within last week shows the weekday (ptBR)', () => {
    const subtitle = formatWorkoutLogSubtitle('2026-05-04T14:00:00Z', ptBR as never);

    // Algo como "Segunda-feira passada às ..." ou "Última segunda-feira às ..." dependendo da versão do date-fns.
    expect(subtitle.charAt(0)).toBe(subtitle.charAt(0).toUpperCase());
    expect(subtitle.length).toBeGreaterThan(5);
  });

  test('older than 6 days falls back to date format (ptBR)', () => {
    const subtitle = formatWorkoutLogSubtitle('2026-04-01T14:00:00Z', ptBR as never);

    // Default ptBR "P" → "01/04/2026"
    expect(subtitle).toMatch(/\d{2}\/\d{2}\/\d{4}/);
  });

  test('renders in enUS when locale is en', () => {
    const subtitle = formatWorkoutLogSubtitle('2026-05-08T14:00:00Z', enUS as never);

    expect(subtitle.toLowerCase()).toContain('yesterday');
  });
});

describe('formatWorkoutDuration', () => {
  test('returns minutes-only for sub-hour durations (ptBR)', () => {
    expect(formatWorkoutDuration(56 * 60, ptBR as never)).toBe('56 minutos');
  });

  test('returns hours and minutes for mixed durations (ptBR)', () => {
    expect(formatWorkoutDuration(78 * 60, ptBR as never)).toBe('1 hora 18 minutos');
  });

  test('returns hours-only when minutes round to zero', () => {
    expect(formatWorkoutDuration(3600, ptBR as never)).toBe('1 hora');
  });

  test('renders enUS', () => {
    expect(formatWorkoutDuration(56 * 60, enUS as never)).toBe('56 minutes');
  });
});

describe('formatExerciseCount', () => {
  test('singular', () => {
    expect(formatExerciseCount(1, fakeT)).toBe('1 exercício');
  });

  test('plural', () => {
    expect(formatExerciseCount(6, fakeT)).toBe('6 exercícios');
  });
});

describe('toCardProps', () => {
  const summary: WorkoutLogSummary = {
    id: 'a1',
    title: 'Treino A',
    startedAt: '2026-05-08T14:00:00Z',
    durationSeconds: 56 * 60,
    exerciseCount: 6,
    muscleGroups: ['Peito', 'Tríceps'],
    prCount: 0,
  };

  test('maps fields and computes hasRecord from prCount', () => {
    const props = toCardProps(summary, fakeT, ptBR as never);

    expect(props.title).toBe('Treino A');
    expect(props.muscleGroups).toEqual(['Peito', 'Tríceps']);
    expect(props.duration).toBe('56 minutos');
    expect(props.exerciseCount).toBe('6 exercícios');
    expect(props.hasRecord).toBe(false);
    expect(props.subtitle.charAt(0)).toBe(props.subtitle.charAt(0).toUpperCase());
  });

  test('hasRecord true when prCount > 0', () => {
    const props = toCardProps({ ...summary, prCount: 1 }, fakeT, ptBR as never);

    expect(props.hasRecord).toBe(true);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
TZ=UTC bun run test -- src/__tests__/domain/workout-logs/format.test.ts
```

Expected: FAIL — `Cannot find module '@/domain/workout-logs/format'`.

- [ ] **Step 3: Implement the formatters**

`src/domain/workout-logs/format.ts`:

```ts
import { formatDuration, formatRelative, intervalToDuration, parseISO } from 'date-fns';
import type { Locale } from 'date-fns';
import type { TFunction } from 'i18next';
import type { WorkoutLogCardProps } from '@/components/workout-logs/WorkoutLogCard';
import type { WorkoutLogSummary } from './types';

export function formatWorkoutLogSubtitle(startedAtIso: string, locale: Locale): string {
  const out = formatRelative(parseISO(startedAtIso), new Date(), { locale });
  if (!out) return out;
  return out.charAt(0).toLocaleUpperCase() + out.slice(1);
}

export function formatWorkoutDuration(seconds: number, locale: Locale): string {
  const duration = intervalToDuration({ start: 0, end: seconds * 1000 });
  return formatDuration(duration, {
    locale,
    format: ['hours', 'minutes'],
    delimiter: ' ',
  });
}

export function formatExerciseCount(count: number, t: TFunction): string {
  return t('workoutLogs.exerciseCount', { count });
}

export function toCardProps(
  summary: WorkoutLogSummary,
  t: TFunction,
  locale: Locale,
): WorkoutLogCardProps {
  return {
    title: summary.title,
    subtitle: formatWorkoutLogSubtitle(summary.startedAt, locale),
    muscleGroups: summary.muscleGroups,
    duration: formatWorkoutDuration(summary.durationSeconds, locale),
    exerciseCount: formatExerciseCount(summary.exerciseCount, t),
    hasRecord: summary.prCount > 0,
  };
}
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
TZ=UTC bun run test -- src/__tests__/domain/workout-logs/format.test.ts
```

Expected: PASS. Se algum assert do `formatRelative` retornar string ligeiramente diferente da esperada (date-fns pode mudar o phrasing entre versões), ajustar o assertion para um substring resiliente — **não abrandar a expectativa de capitalização**.

---

## Task 8: i18n keys

**Files:**
- Modify: `src/internationalization/locales/pt.ts`
- Modify: `src/internationalization/locales/en.ts`

- [ ] **Step 1: Add `workoutLogs` block to PT**

`src/internationalization/locales/pt.ts` — adicionar dentro de `translation`:

```ts
workoutLogs: {
  exerciseCount_one: '{{count}} exercício',
  exerciseCount_other: '{{count}} exercícios',
  empty: 'Nenhum treino registrado ainda.',
  error: {
    title: 'Não foi possível carregar seus treinos.',
    retry: 'Tentar novamente',
    loadMore: 'Não foi possível carregar mais treinos.',
  },
},
```

(Inserir entre `tabs` e `common`, ou em qualquer ponto coerente — a ordem é livre.)

- [ ] **Step 2: Add the equivalent block to EN**

`src/internationalization/locales/en.ts` — mesmo bloco com strings em inglês:

```ts
workoutLogs: {
  exerciseCount_one: '{{count}} exercise',
  exerciseCount_other: '{{count}} exercises',
  empty: 'No workouts logged yet.',
  error: {
    title: 'Could not load your workouts.',
    retry: 'Try again',
    loadMore: 'Could not load more workouts.',
  },
},
```

- [ ] **Step 3: Sanity check**

```bash
bun run check
```

Expected: PASS. Caso o Biome reporte ordem de chaves, deixar como está (Biome não força ordem de chaves de objeto).

---

## Task 9: `useWorkoutLogSummaries` hook + tests

**Files:**
- Create: `src/__tests__/hooks/use-workout-log-summaries.test.tsx`
- Create: `src/hooks/use-workout-log-summaries.ts`

- [ ] **Step 1: Write the failing test**

Esse hook é quase 100% delegação ao `useInfiniteQuery`. O que vale testar é o `getNextPageParam` (regra de paginação).

`src/__tests__/hooks/use-workout-log-summaries.test.tsx`:

```ts
jest.mock('@/lib/api/workout-logs', () => ({
  fetchWorkoutLogSummaries: jest.fn(),
}));

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { fetchWorkoutLogSummaries } from '@/lib/api/workout-logs';
import { PAGE_SIZE, useWorkoutLogSummaries } from '@/hooks/use-workout-log-summaries';
import type { WorkoutLogSummariesPage } from '@/domain/workout-logs/types';

const mockFetch = fetchWorkoutLogSummaries as jest.Mock;

function makeWrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
}

const itemAt = (iso: string): WorkoutLogSummariesPage['items'][number] => ({
  id: iso,
  title: 'X',
  startedAt: iso,
  durationSeconds: 60,
  exerciseCount: 1,
  muscleGroups: [],
  prCount: 0,
});

describe('useWorkoutLogSummaries', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('first page is fetched with PAGE_SIZE and no cursor', async () => {
    mockFetch.mockResolvedValueOnce({
      items: [itemAt('2026-05-01T00:00:00Z')],
      hasMore: false,
    });

    const { result } = renderHook(() => useWorkoutLogSummaries(), { wrapper: makeWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockFetch).toHaveBeenCalledWith(
      expect.objectContaining({ limit: PAGE_SIZE, cursor: undefined }),
    );
  });

  test('fetchNextPage uses last item startedAt as cursor when hasMore', async () => {
    mockFetch
      .mockResolvedValueOnce({
        items: [itemAt('2026-05-03T00:00:00Z'), itemAt('2026-05-02T00:00:00Z')],
        hasMore: true,
      })
      .mockResolvedValueOnce({
        items: [itemAt('2026-05-01T00:00:00Z')],
        hasMore: false,
      });

    const { result } = renderHook(() => useWorkoutLogSummaries(), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    await act(async () => {
      await result.current.fetchNextPage();
    });

    expect(mockFetch).toHaveBeenLastCalledWith(
      expect.objectContaining({ limit: PAGE_SIZE, cursor: '2026-05-02T00:00:00Z' }),
    );
  });

  test('hasNextPage is false when hasMore is false', async () => {
    mockFetch.mockResolvedValueOnce({
      items: [itemAt('2026-05-01T00:00:00Z')],
      hasMore: false,
    });

    const { result } = renderHook(() => useWorkoutLogSummaries(), { wrapper: makeWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.hasNextPage).toBe(false);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
bun run test -- src/__tests__/hooks/use-workout-log-summaries.test.tsx
```

Expected: FAIL — `Cannot find module '@/hooks/use-workout-log-summaries'`.

- [ ] **Step 3: Implement the hook**

`src/hooks/use-workout-log-summaries.ts`:

```ts
import { useInfiniteQuery } from '@tanstack/react-query';
import { fetchWorkoutLogSummaries } from '@/lib/api/workout-logs';
import type { WorkoutLogSummariesPage } from '@/domain/workout-logs/types';

export const PAGE_SIZE = 10;

export function useWorkoutLogSummaries() {
  return useInfiniteQuery<
    WorkoutLogSummariesPage,
    Error,
    { pages: WorkoutLogSummariesPage[]; pageParams: (string | undefined)[] },
    readonly ['workout-logs', 'summaries'],
    string | undefined
  >({
    queryKey: ['workout-logs', 'summaries'] as const,
    initialPageParam: undefined,
    queryFn: ({ pageParam, signal }) =>
      fetchWorkoutLogSummaries({ limit: PAGE_SIZE, cursor: pageParam, signal }),
    getNextPageParam: (last) =>
      last.hasMore ? last.items.at(-1)?.startedAt : undefined,
  });
}
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
bun run test -- src/__tests__/hooks/use-workout-log-summaries.test.tsx
```

Expected: PASS.

---

## Task 10: `WorkoutLogCardSkeleton`

**Files:**
- Create: `src/components/workout-logs/WorkoutLogCardSkeleton.tsx`

- [ ] **Step 1: Implement the skeleton**

Sem teste dedicado (smoke do componente é coberto indiretamente pelo `WorkoutLogList.test.tsx` no estado de loading inicial).

`src/components/workout-logs/WorkoutLogCardSkeleton.tsx`:

```tsx
import { View } from 'react-native';
import { Card } from '@/components/ui/card';

export function WorkoutLogCardSkeleton() {
  return (
    <Card className="gap-3 px-5 py-4" testID="workout-log-card-skeleton">
      <View className="flex-row items-start justify-between gap-3">
        <View className="flex-1 gap-2">
          <View className="h-5 w-2/3 rounded bg-muted" />
          <View className="h-4 w-1/2 rounded bg-muted" />
        </View>
      </View>

      <View className="flex-row gap-2">
        <View className="h-6 w-16 rounded-full bg-muted" />
        <View className="h-6 w-16 rounded-full bg-muted" />
        <View className="h-6 w-20 rounded-full bg-muted" />
      </View>

      <View className="flex-row items-center gap-4">
        <View className="h-4 w-16 rounded bg-muted" />
        <View className="h-4 w-24 rounded bg-muted" />
      </View>
    </Card>
  );
}
```

- [ ] **Step 2: Quick visual confirmation (optional, manual)**

Sem comando obrigatório — o componente será exercido pelo `WorkoutLogList.test.tsx`.

---

## Task 11: `WorkoutLogList` component + tests

**Files:**
- Create: `src/__tests__/workout-logs/WorkoutLogList.test.tsx`
- Create: `src/components/workout-logs/WorkoutLogList.tsx`

Esse é o componente mais denso. Estratégia de teste: **mockar `useWorkoutLogSummaries`** para isolar do React Query, e mockar `react-native-toast-message` para conferir o disparo.

- [ ] **Step 1: Write the failing test**

`src/__tests__/workout-logs/WorkoutLogList.test.tsx`:

```tsx
jest.mock('@/hooks/use-workout-log-summaries', () => ({
  useWorkoutLogSummaries: jest.fn(),
  PAGE_SIZE: 10,
}));

jest.mock('react-native-toast-message', () => ({
  __esModule: true,
  default: { show: jest.fn() },
}));

jest.mock('@/lib/observability', () => {
  const { createObservabilityMock } = jest.requireActual('@/__tests__/mocks/observability');
  return createObservabilityMock();
});

import { fireEvent, render } from '@testing-library/react-native';
import Toast from 'react-native-toast-message';
import { useWorkoutLogSummaries } from '@/hooks/use-workout-log-summaries';
import { WorkoutLogList } from '@/components/workout-logs/WorkoutLogList';
import { ApiError, ApiUnauthorizedError } from '@/lib/api/errors';
import { observability } from '@/lib/observability';

const mockUseHook = useWorkoutLogSummaries as jest.Mock;
const mockToastShow = Toast.show as jest.Mock;
const mockCaptureException = observability.captureException as jest.Mock;

const baseHookReturn = {
  data: undefined,
  isLoading: false,
  isError: false,
  error: null,
  isFetchingNextPage: false,
  isRefetching: false,
  hasNextPage: false,
  fetchNextPage: jest.fn(),
  refetch: jest.fn(),
};

const item = (id: string, startedAt: string) => ({
  id,
  title: `Treino ${id}`,
  startedAt,
  durationSeconds: 3600,
  exerciseCount: 5,
  muscleGroups: ['Peito'],
  prCount: 0,
});

beforeEach(() => {
  jest.clearAllMocks();
  mockUseHook.mockReturnValue(baseHookReturn);
});

describe('<WorkoutLogList />', () => {
  test('renders skeletons during initial load', () => {
    mockUseHook.mockReturnValue({ ...baseHookReturn, isLoading: true });

    const { getAllByTestId } = render(<WorkoutLogList />);

    expect(getAllByTestId('workout-log-card-skeleton').length).toBeGreaterThanOrEqual(3);
  });

  test('shows initial error state with retry button', () => {
    const refetch = jest.fn();
    mockUseHook.mockReturnValue({
      ...baseHookReturn,
      isError: true,
      error: new ApiError(500, 'boom'),
      data: undefined,
      refetch,
    });

    const { getByText } = render(<WorkoutLogList />);

    fireEvent.press(getByText('Tentar novamente'));
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  test('shows empty state when there are no items', () => {
    mockUseHook.mockReturnValue({
      ...baseHookReturn,
      data: { pages: [{ items: [], hasMore: false }], pageParams: [undefined] },
    });

    const { getByText } = render(<WorkoutLogList />);

    getByText('Nenhum treino registrado ainda.');
  });

  test('renders one card per summary across pages', () => {
    mockUseHook.mockReturnValue({
      ...baseHookReturn,
      data: {
        pages: [
          { items: [item('a', '2026-05-08T12:00:00Z'), item('b', '2026-05-07T12:00:00Z')], hasMore: true },
          { items: [item('c', '2026-05-06T12:00:00Z')], hasMore: false },
        ],
        pageParams: [undefined, '2026-05-07T12:00:00Z'],
      },
    });

    const { getByText } = render(<WorkoutLogList />);

    getByText('Treino a');
    getByText('Treino b');
    getByText('Treino c');
  });

  test('captures workout error on isError (non-401)', () => {
    mockUseHook.mockReturnValue({
      ...baseHookReturn,
      isError: true,
      error: new ApiError(500, 'boom'),
    });

    render(<WorkoutLogList />);

    expect(mockCaptureException).toHaveBeenCalledWith(
      expect.any(ApiError),
      expect.objectContaining({
        tags: expect.objectContaining({ feature: 'workout', action: 'load_summaries' }),
      }),
    );
  });

  test('does NOT capture when error is ApiUnauthorizedError', () => {
    mockUseHook.mockReturnValue({
      ...baseHookReturn,
      isError: true,
      error: new ApiUnauthorizedError(),
    });

    render(<WorkoutLogList />);

    expect(mockCaptureException).not.toHaveBeenCalled();
  });

  test('shows toast when paginated error occurs (already had pages)', () => {
    mockUseHook.mockReturnValue({
      ...baseHookReturn,
      isError: true,
      error: new ApiError(500, 'boom'),
      data: {
        pages: [{ items: [item('a', '2026-05-08T12:00:00Z')], hasMore: true }],
        pageParams: [undefined],
      },
    });

    render(<WorkoutLogList />);

    expect(mockToastShow).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'error',
        text2: 'Não foi possível carregar mais treinos.',
      }),
    );
  });
});
```

> **Note:** Assertions de tradução assumem que o `i18n` real do projeto inicializa com PT por default — o que é o caso (ver `src/internationalization`). Se os testes não tiverem i18n inicializado, o `useTranslation` retorna a key como string. Os asserts usam o texto PT para confirmar que o componente está consumindo as keys corretas; se necessário adicionar `import '@/internationalization';` no topo do teste para garantir o init.

- [ ] **Step 2: Run the test to verify it fails**

```bash
bun run test -- src/__tests__/workout-logs/WorkoutLogList.test.tsx
```

Expected: FAIL — `Cannot find module '@/components/workout-logs/WorkoutLogList'`.

- [ ] **Step 3: Implement `WorkoutLogList`**

`src/components/workout-logs/WorkoutLogList.tsx`:

```tsx
import { FlashList } from '@shopify/flash-list';
import { useEffect, useMemo, useRef } from 'react';
import { ActivityIndicator, RefreshControl, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import Toast from 'react-native-toast-message';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { WorkoutLogCard } from '@/components/workout-logs/WorkoutLogCard';
import { WorkoutLogCardSkeleton } from '@/components/workout-logs/WorkoutLogCardSkeleton';
import { toCardProps } from '@/domain/workout-logs/format';
import type { WorkoutLogSummary } from '@/domain/workout-logs/types';
import { useWorkoutLogSummaries } from '@/hooks/use-workout-log-summaries';
import { ApiUnauthorizedError } from '@/lib/api/errors';
import { getDateFnsLocale } from '@/internationalization/date-locale';
import { captureWorkoutError } from '@/lib/observability';

export function WorkoutLogList() {
  const { t, i18n } = useTranslation();
  const locale = useMemo(() => getDateFnsLocale(i18n.language), [i18n.language]);

  const {
    data,
    isLoading,
    isError,
    error,
    isFetchingNextPage,
    isRefetching,
    hasNextPage,
    fetchNextPage,
    refetch,
  } = useWorkoutLogSummaries();

  const items: WorkoutLogSummary[] = useMemo(
    () => (data?.pages ?? []).flatMap((p) => p.items),
    [data],
  );
  const hadPages = items.length > 0;

  // Observability: report feature errors once per transition (skip 401).
  const lastReportedRef = useRef<unknown>(null);
  useEffect(() => {
    if (!isError || !error) return;
    if (error === lastReportedRef.current) return;
    lastReportedRef.current = error;

    if (error instanceof ApiUnauthorizedError) return;
    captureWorkoutError(error, { action: 'load_summaries' });
  }, [isError, error]);

  // Toast on paginated error (we already had pages and a new one failed).
  const lastToastedRef = useRef<unknown>(null);
  useEffect(() => {
    if (!isError || !error || !hadPages) return;
    if (error === lastToastedRef.current) return;
    lastToastedRef.current = error;
    if (error instanceof ApiUnauthorizedError) return;

    Toast.show({
      type: 'error',
      text1: t('workoutLogs.error.title'),
      text2: t('workoutLogs.error.loadMore'),
    });
  }, [isError, error, hadPages, t]);

  if (isLoading) {
    return (
      <View className="gap-3 p-4" testID="workout-log-list.loading">
        <WorkoutLogCardSkeleton />
        <WorkoutLogCardSkeleton />
        <WorkoutLogCardSkeleton />
      </View>
    );
  }

  if (isError && !hadPages) {
    return (
      <View className="flex-1 items-center justify-center gap-4 p-6" testID="workout-log-list.error">
        <Text variant="muted">{t('workoutLogs.error.title')}</Text>
        <Button onPress={() => refetch()}>
          <Text>{t('workoutLogs.error.retry')}</Text>
        </Button>
      </View>
    );
  }

  return (
    <FlashList
      data={items}
      keyExtractor={(it) => it.id}
      estimatedItemSize={156}
      renderItem={({ item }) => <WorkoutLogCard {...toCardProps(item, t, locale)} />}
      ItemSeparatorComponent={() => <View className="h-3" />}
      contentContainerClassName="p-4"
      onEndReached={() => {
        if (hasNextPage && !isFetchingNextPage) fetchNextPage();
      }}
      onEndReachedThreshold={0.5}
      ListEmptyComponent={
        <View className="items-center justify-center p-6">
          <Text variant="muted">{t('workoutLogs.empty')}</Text>
        </View>
      }
      ListFooterComponent={isFetchingNextPage ? (
        <View className="items-center py-4">
          <ActivityIndicator />
        </View>
      ) : null}
      refreshControl={
        <RefreshControl
          refreshing={isRefetching && !isFetchingNextPage}
          onRefresh={() => refetch()}
        />
      }
      testID="workout-log-list"
    />
  );
}
```

> **Note:** se o teste reclamar que `FlashList` não chama `renderItem` no ambiente Jest (problema conhecido), adicionar no topo do `WorkoutLogList.test.tsx`:
>
> ```ts
> jest.mock('@shopify/flash-list', () => {
>   const { FlatList } = jest.requireActual('react-native');
>   return { FlashList: FlatList };
> });
> ```
>
> Isso degrada a FlashList para uma `FlatList` em testes, mantendo a API. Em produção, FlashList real é usada.

- [ ] **Step 4: Run the test to verify it passes**

```bash
bun run test -- src/__tests__/workout-logs/WorkoutLogList.test.tsx
```

Expected: PASS. Se algum teste falhar com "FlashList renderItem nunca chamado", aplicar o mock da nota acima.

---

## Task 12: Wire `<WorkoutLogList />` into the home screen

**Files:**
- Modify: `src/app/(tabs)/index.tsx`

- [ ] **Step 1: Replace hardcoded cards with the list**

`src/app/(tabs)/index.tsx`:

```tsx
import { SafeAreaView } from 'react-native-safe-area-context';
import { WorkoutLogList } from '@/components/workout-logs/WorkoutLogList';

export default function HomeScreen() {
  return (
    <SafeAreaView className="flex-1">
      <WorkoutLogList />
    </SafeAreaView>
  );
}
```

- [ ] **Step 2: Run the full test suite**

```bash
bun run test
```

Expected: PASS — todos os testes incluindo o `WorkoutLogCard.test.tsx` existente.

- [ ] **Step 3: Run lint**

```bash
bun run check
```

Expected: PASS (Biome). Corrigir avisos de ordem de classes Tailwind se houver — `bun run check` já roda `--write`.

---

## Task 13: Manual verification (dev client)

**Files:** none.

- [ ] **Step 1: Confirm `.env` has `EXPO_PUBLIC_API_URL`**

```bash
grep '^EXPO_PUBLIC_API_URL=' /Users/aleosada/development/workout-tracker-app/.env
```

Expected: linha com URL da API local/staging. Se não houver, ajustar antes de rodar o app.

- [ ] **Step 2: Start the dev server (development variant)**

```bash
bun run ios   # ou bun run android
```

Espera-se boot do dev client, sign-in OK e que a aba "Início" carregue 10 cards.

- [ ] **Step 3: Sanity checklist (manual)**

Confirmar visualmente:

- 10 cards aparecem após o sign-in.
- Rolar até o fim mostra `ActivityIndicator` no rodapé e carrega mais 10.
- `hasMore: false` na última página: nada de novo aparece, sem loop.
- Pull-to-refresh recarrega a primeira página.
- Forçar erro (ex.: derrubar a API, ou apontar `EXPO_PUBLIC_API_URL` para porta inválida e abrir o app) mostra estado de erro com botão "Tentar novamente".
- Trocar idioma para EN no perfil (se o toggle existir) atualiza subtitle/duration/plural.
- Logout (401 forçado) leva à tela de login.

- [ ] **Step 4: Done**

Se todos os pontos acima passaram, a feature está pronta. Não faça commit automaticamente — o usuário commita quando quiser.

---

## Self-review (autor do plano)

**Spec coverage**

| Spec section | Task |
|---|---|
| Envelope unwrap no apiClient | 3 |
| `ApiError.details` | 2 |
| Camada de domínio (types) | 4 |
| Fetcher em `lib/api/workout-logs.ts` | 5 |
| Formatters (subtitle/duration/exerciseCount/toCardProps) | 7 |
| Locale resolver | 6 |
| Hook `useWorkoutLogSummaries` | 9 |
| Skeleton | 10 |
| WorkoutLogList (FlashList + estados + toast + observability) | 11 |
| Home screen integration | 12 |
| i18n keys (PT/EN) | 8 |
| `@shopify/flash-list` dependency | 1 |
| Manual verification | 13 |

Sem gaps.

**Placeholders**: nenhum "TBD"/"TODO" pendente. Todos os steps têm código concreto ou comando exato.

**Type/name consistency**:
- `WorkoutLogSummary` / `WorkoutLogSummariesPage` / `FetchWorkoutLogSummariesParams` (Task 4) batem com o uso em Task 5 e Task 9.
- `useWorkoutLogSummaries` exporta `PAGE_SIZE` (Task 9) e isso é re-mockado no Task 11.
- `toCardProps` retorna `WorkoutLogCardProps` (do componente existente) — bate.
- `captureWorkoutError(error, { action: 'load_summaries' })` (Task 11) — `action` é a única chave obrigatória de `WorkoutErrorContext` (verificado em `src/lib/observability/workout-helpers.ts`).
- `getDateFnsLocale` (Task 6) é consumido em Task 11 (componente).
- `formatRelative` retorno: `out.charAt(0).toLocaleUpperCase()` — `toLocaleUpperCase()` é usado sem locale tag para evitar bug do "i" turco se acidentalmente o navegador estiver em tr; em RN/Hermes é equivalente a `toUpperCase()`. Aceitável.
