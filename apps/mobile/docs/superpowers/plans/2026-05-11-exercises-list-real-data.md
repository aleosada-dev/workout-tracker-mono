# Exercises List — Real Data Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the hard-coded exercise array in `src/app/(tabs)/(workouts)/exercisesList.tsx` with data fetched from `GET /exercises`, following the existing `workout-logs` feature pattern.

**Architecture:** New domain layer (`src/domain/exercises/{types,format}.ts`), a typed API module (`src/lib/api/exercises.ts`), and a React Query hook (`src/hooks/use-exercises.ts`). The screen calls the hook and renders loading / error / empty states; all other screen behavior (select mode, bulk-action stubs, "Filtrar" stub, `addExercise` navigation) is untouched.

**Tech Stack:** Expo / React Native, expo-router, `@tanstack/react-query`, `apiClient` (project HTTP wrapper), NativeWind, Jest + `@testing-library/react-native`, MSW.

**Spec:** `docs/superpowers/specs/2026-05-11-exercises-list-real-data-design.md`

---

## File Structure

- **Create** `src/domain/exercises/types.ts` — raw API row type (`ExerciseApiItem`) + UI types (`Exercise`, `ExerciseVisibility`).
- **Create** `src/domain/exercises/format.ts` — `composeExerciseName`, `toExercise`, `EXERCISE_TYPE_LABELS`.
- **Create** `src/lib/api/exercises.ts` — `fetchExercises({ signal })` → `apiClient.get<ExerciseApiItem[]>('/exercises')`.
- **Create** `src/hooks/use-exercises.ts` — `useExercises()` (React Query `useQuery`).
- **Modify** `src/app/(tabs)/(workouts)/exercisesList.tsx` — swap `INITIAL_EXERCISES` for the hook; add loading/error/empty states; report errors via `captureWorkoutError`.
- **Modify** `src/mocks/handlers.ts` — add a `GET …/exercises` MSW handler.
- **Create** `src/__tests__/domain/exercises/format.test.ts`
- **Create** `src/__tests__/api/exercises.test.ts`
- **Create** `src/__tests__/hooks/use-exercises.test.tsx`

Out of scope (unchanged): bulk actions, functional filter, `addExercise` submit, exercise detail screen, `image_url`/`video_url` rendering, pagination. E2E (Maestro) flow for the exercises list is a follow-up, not part of this plan.

---

## Task 1: Domain types + formatting helpers

**Files:**
- Create: `src/domain/exercises/types.ts`
- Create: `src/domain/exercises/format.ts`
- Test: `src/__tests__/domain/exercises/format.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/__tests__/domain/exercises/format.test.ts`:

```ts
import { composeExerciseName, toExercise } from '@/domain/exercises/format';
import type { ExerciseApiItem } from '@/domain/exercises/types';

function makeItem(overrides: Partial<ExerciseApiItem> = {}): ExerciseApiItem {
  return {
    id: 'id-1',
    exercise_name: 'Abdominal',
    name: null,
    equipment_name: 'Máquina',
    equipment_preposition: 'na',
    muscle_level2_name: 'Abdômen',
    exercise_type: 'musculacao',
    user_id: null,
    image_url: null,
    video_url: null,
    ...overrides,
  };
}

describe('composeExerciseName', () => {
  test('joins exercise name with the equipment preposition and equipment', () => {
    expect(composeExerciseName(makeItem())).toBe('Abdominal na Máquina');
  });

  test('includes the variation name when present', () => {
    expect(
      composeExerciseName(
        makeItem({
          exercise_name: 'Afundo',
          name: 'com Salto',
          equipment_name: 'Peso Corporal',
          equipment_preposition: 'com',
        }),
      ),
    ).toBe('Afundo com Salto com Peso Corporal');
  });

  test('omits equipment when there is none', () => {
    expect(
      composeExerciseName(
        makeItem({ exercise_name: 'Prancha', equipment_name: null, equipment_preposition: null }),
      ),
    ).toBe('Prancha');
  });

  test('still works when equipment has no preposition', () => {
    expect(
      composeExerciseName(makeItem({ equipment_name: 'Halteres', equipment_preposition: null })),
    ).toBe('Abdominal Halteres');
  });
});

describe('toExercise', () => {
  test('maps an API item to the UI shape', () => {
    expect(toExercise(makeItem())).toEqual({
      id: 'id-1',
      name: 'Abdominal na Máquina',
      primaryMuscle: 'Abdômen',
      type: 'Musculação',
      visibility: 'public',
    });
  });

  test('marks items that have a user_id as private', () => {
    expect(toExercise(makeItem({ user_id: 'user-123' })).visibility).toBe('private');
  });

  test('uses the label map for known exercise types and the raw slug otherwise', () => {
    expect(toExercise(makeItem({ exercise_type: 'preparatorio' })).type).toBe('Preparatório');
    expect(toExercise(makeItem({ exercise_type: 'wat' })).type).toBe('wat');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `bun run test -- src/__tests__/domain/exercises/format.test.ts`
Expected: FAIL — `Cannot find module '@/domain/exercises/format'`.

- [ ] **Step 3: Create the types**

Create `src/domain/exercises/types.ts`:

```ts
/** Raw row returned by `GET /exercises` (only the fields this screen consumes). */
export type ExerciseApiItem = {
  id: string;
  exercise_name: string;
  /** Variation suffix, e.g. "com Salto", "Pegada Fechada". */
  name: string | null;
  equipment_name: string | null;
  /** Preposition that links the equipment to the name, e.g. "na", "com", "no". */
  equipment_preposition: string | null;
  /** Broad muscle group shown in the list, e.g. "Abdômen". */
  muscle_level2_name: string;
  /** Exercise type slug, e.g. "musculacao". */
  exercise_type: string;
  /** `null` for the global catalog; set for exercises created by the user. */
  user_id: string | null;
  image_url: string | null;
  video_url: string | null;
};

export type ExerciseVisibility = 'public' | 'private';

export type Exercise = {
  id: string;
  name: string;
  primaryMuscle: string;
  type: string;
  visibility: ExerciseVisibility;
};
```

- [ ] **Step 4: Create the formatting helpers**

Create `src/domain/exercises/format.ts`:

```ts
import type { Exercise, ExerciseApiItem } from './types';

const EXERCISE_TYPE_LABELS: Record<string, string> = {
  musculacao: 'Musculação',
  calistenia: 'Calistenia',
  cardio: 'Cardio',
  alongamento: 'Alongamento',
  preparatorio: 'Preparatório',
};

export function composeExerciseName(item: ExerciseApiItem): string {
  const parts = [item.exercise_name];
  if (item.name) parts.push(item.name);
  if (item.equipment_name) {
    if (item.equipment_preposition) parts.push(item.equipment_preposition);
    parts.push(item.equipment_name);
  }
  return parts.join(' ');
}

export function toExercise(item: ExerciseApiItem): Exercise {
  return {
    id: item.id,
    name: composeExerciseName(item),
    primaryMuscle: item.muscle_level2_name,
    type: EXERCISE_TYPE_LABELS[item.exercise_type] ?? item.exercise_type,
    visibility: item.user_id == null ? 'public' : 'private',
  };
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `bun run test -- src/__tests__/domain/exercises/format.test.ts`
Expected: PASS (8 tests).

- [ ] **Step 6: Commit**

```bash
git add src/domain/exercises/types.ts src/domain/exercises/format.ts src/__tests__/domain/exercises/format.test.ts
git commit -m "feat: exercises domain types and formatting helpers"
```

---

## Task 2: API module

**Files:**
- Create: `src/lib/api/exercises.ts`
- Test: `src/__tests__/api/exercises.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/__tests__/api/exercises.test.ts` (mirrors `src/__tests__/api/workout-logs.test.ts`):

```ts
jest.mock('@/lib/api/config', () => {
  const { createApiConfigMock } = jest.requireActual('@/__tests__/mocks/api-config');
  return createApiConfigMock();
});

jest.mock('@/lib/auth', () => {
  const { createAuthMock } = jest.requireActual('@/__tests__/mocks/auth');
  return createAuthMock();
});

jest.mock('@/lib/observability', () => {
  const { createObservabilityMock } = jest.requireActual('@/__tests__/mocks/observability');
  return createObservabilityMock();
});

import { fetchExercises } from '@/lib/api/exercises';

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

const sample = [
  {
    id: 'a35c0d15-db1f-4ba2-b2c3-324a63844771',
    exercise_name: 'Abdominal',
    name: null,
    equipment_name: 'Máquina',
    equipment_preposition: 'na',
    muscle_level2_name: 'Abdômen',
    exercise_type: 'musculacao',
    user_id: null,
    image_url: null,
    video_url: null,
  },
];

describe('fetchExercises', () => {
  test('GETs /exercises and returns the unwrapped array', async () => {
    mockFetch.mockResolvedValueOnce(envelopeOk(sample));

    const result = await fetchExercises();

    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe('http://test.local/api/v1/exercises');
    expect(init.method).toBe('GET');
    expect(result).toEqual(sample);
  });

  test('forwards the abort signal to fetch', async () => {
    const controller = new AbortController();
    mockFetch.mockResolvedValueOnce(envelopeOk(sample));

    await fetchExercises({ signal: controller.signal });

    const [, init] = mockFetch.mock.calls[0];
    expect(init.signal).toBeInstanceOf(AbortSignal);
    expect(init.signal.aborted).toBe(false);

    controller.abort();
    expect(init.signal.aborted).toBe(true);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `bun run test -- src/__tests__/api/exercises.test.ts`
Expected: FAIL — `Cannot find module '@/lib/api/exercises'`.

- [ ] **Step 3: Create the API module**

Create `src/lib/api/exercises.ts`:

```ts
import type { ExerciseApiItem } from '@/domain/exercises/types';
import { apiClient } from './client';

export async function fetchExercises(
  { signal }: { signal?: AbortSignal } = {},
): Promise<ExerciseApiItem[]> {
  return apiClient.get<ExerciseApiItem[]>('/exercises', { signal });
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `bun run test -- src/__tests__/api/exercises.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/api/exercises.ts src/__tests__/api/exercises.test.ts
git commit -m "feat: fetchExercises API module"
```

---

## Task 3: React Query hook

**Files:**
- Create: `src/hooks/use-exercises.ts`
- Test: `src/__tests__/hooks/use-exercises.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/__tests__/hooks/use-exercises.test.tsx` (mirrors `src/__tests__/hooks/use-workout-log-summaries.test.tsx`):

```tsx
jest.mock('@/lib/api/exercises', () => ({
  fetchExercises: jest.fn(),
}));

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import type { ExerciseApiItem } from '@/domain/exercises/types';
import { useExercises } from '@/hooks/use-exercises';
import { fetchExercises } from '@/lib/api/exercises';

const mockFetchExercises = fetchExercises as jest.Mock;

function makeWrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
}

const sampleItem: ExerciseApiItem = {
  id: 'a35c0d15-db1f-4ba2-b2c3-324a63844771',
  exercise_name: 'Abdominal',
  name: null,
  equipment_name: 'Máquina',
  equipment_preposition: 'na',
  muscle_level2_name: 'Abdômen',
  exercise_type: 'musculacao',
  user_id: null,
  image_url: null,
  video_url: null,
};

describe('useExercises', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('fetches the exercises list', async () => {
    mockFetchExercises.mockResolvedValueOnce([sampleItem]);

    const { result } = renderHook(() => useExercises(), { wrapper: makeWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockFetchExercises).toHaveBeenCalledTimes(1);
    expect(result.current.data).toEqual([sampleItem]);
  });

  test('surfaces fetch errors', async () => {
    mockFetchExercises.mockRejectedValueOnce(new Error('boom'));

    const { result } = renderHook(() => useExercises(), { wrapper: makeWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toEqual(new Error('boom'));
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `bun run test -- src/__tests__/hooks/use-exercises.test.tsx`
Expected: FAIL — `Cannot find module '@/hooks/use-exercises'`.

- [ ] **Step 3: Create the hook**

Create `src/hooks/use-exercises.ts`:

```ts
import { useQuery } from '@tanstack/react-query';
import { fetchExercises } from '@/lib/api/exercises';

export function useExercises() {
  return useQuery({
    queryKey: ['exercises', 'list'] as const,
    queryFn: ({ signal }) => fetchExercises({ signal }),
  });
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `bun run test -- src/__tests__/hooks/use-exercises.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/hooks/use-exercises.ts src/__tests__/hooks/use-exercises.test.tsx
git commit -m "feat: useExercises hook"
```

---

## Task 4: Wire the screen to real data

**Files:**
- Modify: `src/mocks/handlers.ts`
- Modify: `src/app/(tabs)/(workouts)/exercisesList.tsx` (full rewrite — content below)

This task has no new automated test (the screen has no test in the repo and we are not adding one here, matching the existing pattern). Verification is the full test suite + lint, plus a manual check.

- [ ] **Step 1: Add the MSW handler**

In `src/mocks/handlers.ts`, add a second entry to the `handlers` array (keep the existing `workout-logs/summaries` handler). The file becomes:

```ts
import { HttpResponse, http } from 'msw';

export const handlers = [
  http.get('https://api-dev.osadainc.com.br/api/v1/workout-logs/summaries', () => {
    return HttpResponse.json({
      data: {
        items: [
          {
            id: 'a1b2c3d4-2222-4bbb-b222-222222222204',
            title: 'Treino B — Costas e Bíceps',
            startedAt: '2026-04-22T17:39:11.741831+00:00',
            durationSeconds: 4800,
            exerciseCount: 4,
            muscleGroups: ['Costas', 'Bíceps'],
            prCount: 0,
          },
          {
            id: 'a1b2c3d4-1111-4aaa-b111-111111111104',
            title: 'Treino A — Peito e Tríceps',
            startedAt: '2026-04-21T17:39:11.741831+00:00',
            durationSeconds: 3900,
            exerciseCount: 1,
            muscleGroups: ['Peito'],
            prCount: 0,
          },
          {
            id: 'a1b2c3d4-2222-4bbb-b222-222222222203',
            title: 'Treino B — Costas e Bíceps',
            startedAt: '2026-04-16T17:39:11.741831+00:00',
            durationSeconds: 5520,
            exerciseCount: 3,
            muscleGroups: ['Costas', 'Bíceps'],
            prCount: 0,
          },
          {
            id: 'a1b2c3d4-1111-4aaa-b111-111111111103',
            title: 'Treino A — Peito e Tríceps',
            startedAt: '2026-04-14T17:39:11.741831+00:00',
            durationSeconds: 4680,
            exerciseCount: 3,
            muscleGroups: ['Peito', 'Tríceps'],
            prCount: 0,
          },
          {
            id: 'a1b2c3d4-2222-4bbb-b222-222222222202',
            title: 'Treino B — Costas e Bíceps',
            startedAt: '2026-04-12T17:39:11.741831+00:00',
            durationSeconds: 4920,
            exerciseCount: 4,
            muscleGroups: ['Costas', 'Bíceps'],
            prCount: 0,
          },
          {
            id: 'a1b2c3d4-1111-4aaa-b111-111111111102',
            title: 'Treino A — Peito e Tríceps',
            startedAt: '2026-04-09T17:39:11.741831+00:00',
            durationSeconds: 4080,
            exerciseCount: 3,
            muscleGroups: ['Peito', 'Tríceps'],
            prCount: 0,
          },
          {
            id: 'a1b2c3d4-2222-4bbb-b222-222222222201',
            title: 'Treino B — Costas e Bíceps',
            startedAt: '2026-04-07T17:39:11.741831+00:00',
            durationSeconds: 5280,
            exerciseCount: 4,
            muscleGroups: ['Costas', 'Bíceps'],
            prCount: 0,
          },
          {
            id: 'a1b2c3d4-1111-4aaa-b111-111111111101',
            title: 'Treino A — Peito e Tríceps',
            startedAt: '2026-04-05T17:39:11.741831+00:00',
            durationSeconds: 4320,
            exerciseCount: 3,
            muscleGroups: ['Peito', 'Tríceps'],
            prCount: 0,
          },
          {
            id: '5964b795-79bc-46a6-9549-7c11607ba937',
            title: 'Treino B — Costas e Bíceps',
            startedAt: '2026-04-03T17:39:11.741831+00:00',
            durationSeconds: 5100,
            exerciseCount: 4,
            muscleGroups: ['Costas', 'Bíceps'],
            prCount: 0,
          },
          {
            id: 'def8c3f1-9b12-41fc-90ae-93a3e6ca7d6a',
            title: 'Treino A — Peito e Tríceps',
            startedAt: '2026-04-01T17:39:11.741831+00:00',
            durationSeconds: 4200,
            exerciseCount: 3,
            muscleGroups: ['Peito', 'Tríceps'],
            prCount: 0,
          },
        ],
        hasMore: true,
      },
      error: null,
    });
  }),

  http.get('https://api-dev.osadainc.com.br/api/v1/exercises', () => {
    return HttpResponse.json({
      data: [
        {
          id: 'a35c0d15-db1f-4ba2-b2c3-324a63844771',
          name: null,
          exercise_id: '98cfa1fb-a39d-46f8-9155-3eb594f44600',
          muscle_id: '0e376e2d-fb0f-4e71-ba90-98cb348c0340',
          secondary_muscle_id: null,
          equipment_id: 'b5482b82-a010-413d-9072-895ccd1934a5',
          video_url: null,
          image_url: null,
          user_id: '39e03cce-5ca5-46c2-b34d-92682a582f05',
          exercise_name: 'Abdominal',
          exercise_type: 'musculacao',
          muscle_name: 'Reto Abdominal',
          muscle_level2_name: 'Abdômen',
          secondary_muscle_name: null,
          equipment_name: 'Máquina',
          equipment_preposition: 'na',
        },
        {
          id: '73fd44e1-bb08-48ed-b303-d37f25a5f89b',
          name: 'com Salto',
          exercise_id: '0dd9d210-c0f5-46e2-a2d3-97156329175d',
          muscle_id: '76334d4f-457b-4482-89fc-ee33f253a773',
          secondary_muscle_id: 'ee92af75-e9c2-4b0d-8566-aa6686c673ce',
          equipment_id: '101de6a0-82f5-4e51-bc3c-5dcb86b8a5cd',
          video_url: null,
          image_url: null,
          user_id: null,
          exercise_name: 'Afundo',
          exercise_type: 'musculacao',
          muscle_name: 'Quadríceps',
          muscle_level2_name: 'Quadríceps',
          secondary_muscle_name: 'Posterior de Coxa',
          equipment_name: 'Peso Corporal',
          equipment_preposition: 'com',
        },
        {
          id: '0edfb728-a143-4e07-83a7-ac4f7ec1096e',
          name: null,
          exercise_id: '4847c7ab-ea7e-419d-aa3e-c32a5896a35b',
          muscle_id: '23bfccf7-9c69-4bc6-8203-510de9255674',
          secondary_muscle_id: null,
          equipment_id: '101de6a0-82f5-4e51-bc3c-5dcb86b8a5cd',
          video_url: null,
          image_url: null,
          user_id: null,
          exercise_name: 'Prancha',
          exercise_type: 'musculacao',
          muscle_name: 'Abdômen',
          muscle_level2_name: 'Abdômen',
          secondary_muscle_name: null,
          equipment_name: 'Peso Corporal',
          equipment_preposition: 'com',
        },
      ],
      error: null,
    });
  }),
];
```

- [ ] **Step 2: Rewrite the screen**

Replace the entire contents of `src/app/(tabs)/(workouts)/exercisesList.tsx` with:

```tsx
import { router, Stack } from 'expo-router';
import {
  CheckCircle2,
  Circle,
  Dumbbell,
  Globe,
  Lock,
  type LucideIcon,
} from 'lucide-react-native';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import * as ScreenActions from '@/components/ScreenActions';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { toExercise } from '@/domain/exercises/format';
import type { Exercise, ExerciseVisibility } from '@/domain/exercises/types';
import { useExercises } from '@/hooks/use-exercises';
import { ApiUnauthorizedError } from '@/lib/api/errors';
import { captureWorkoutError } from '@/lib/observability';

type Mode = 'browse' | 'select';

const VISIBILITY_META: Record<ExerciseVisibility, { label: string; icon: LucideIcon }> = {
  public: { label: 'Público', icon: Globe },
  private: { label: 'Privado', icon: Lock },
};

function ExerciseRowSkeleton() {
  return (
    <Card>
      <CardContent className="flex-row items-center gap-3">
        <View className="h-16 w-16 rounded-sm bg-muted" />
        <View className="flex-1 gap-2">
          <View className="h-4 w-2/3 rounded bg-muted" />
          <View className="h-3 w-1/2 rounded bg-muted" />
        </View>
      </CardContent>
    </Card>
  );
}

export default function ExercisesListScreen() {
  const { data, isLoading, isError, error, refetch } = useExercises();
  const exercises = useMemo<Exercise[]>(() => (data ?? []).map(toExercise), [data]);

  const [mode, setMode] = useState<Mode>('browse');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const lastReportedRef = useRef<unknown>(null);
  useEffect(() => {
    if (!isError || !error) return;
    if (error === lastReportedRef.current) return;
    lastReportedRef.current = error;
    if (error instanceof ApiUnauthorizedError) return;
    captureWorkoutError(error, { action: 'load_exercises' });
  }, [isError, error]);

  const enterSelect = (id: string) => {
    setMode('select');
    setSelected(new Set([id]));
  };
  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const exitSelect = () => {
    setMode('browse');
    setSelected(new Set());
  };
  const selectAll = () => setSelected(new Set(exercises.map((e) => e.id)));

  const title =
    mode === 'select'
      ? selected.size === 0
        ? 'Selecionar'
        : `${selected.size} selecionado${selected.size === 1 ? '' : 's'}`
      : 'Exercícios';

  if (isLoading) {
    return (
      <>
        <Stack.Screen options={{ title }} />
        <ScrollView
          className="flex-1 bg-background"
          contentContainerClassName="p-4 gap-3"
          contentInsetAdjustmentBehavior="automatic"
          testID="exercises-list.loading"
        >
          <ExerciseRowSkeleton />
          <ExerciseRowSkeleton />
          <ExerciseRowSkeleton />
          <ExerciseRowSkeleton />
          <ExerciseRowSkeleton />
        </ScrollView>
      </>
    );
  }

  if (isError && exercises.length === 0) {
    return (
      <>
        <Stack.Screen options={{ title }} />
        <View
          className="flex-1 items-center justify-center gap-4 bg-background p-6"
          testID="exercises-list.error"
        >
          <Text variant="muted">Não foi possível carregar os exercícios.</Text>
          <Button onPress={() => refetch()}>
            <Text>Tentar novamente</Text>
          </Button>
        </View>
      </>
    );
  }

  const browseOverflow: ScreenActions.IconAction[] = [
    {
      iosIcon: 'checkmark.circle',
      androidIcon: 'checkmark-circle-outline',
      label: 'Selecionar',
      onPress: () => setMode('select'),
    },
    {
      iosIcon: 'line.3.horizontal.decrease',
      androidIcon: 'filter',
      label: 'Filtrar',
    },
  ];

  const browsePrimary: ScreenActions.IconAction = {
    iosIcon: 'plus.circle.fill',
    androidIcon: 'add',
    label: 'Adicionar Exercício',
    onPress: () => router.push('/addExercise'),
  };

  const selectionActions: ScreenActions.IconAction[] = [
    {
      iosIcon: 'square.and.arrow.up',
      androidIcon: 'share-outline',
      label: 'Compartilhar',
    },
    { iosIcon: 'folder', androidIcon: 'folder-outline', label: 'Mover' },
    {
      iosIcon: 'trash',
      androidIcon: 'trash-outline',
      label: 'Excluir',
      destructive: true,
    },
  ];

  return (
    <>
      <Stack.Screen options={{ title }} />

      <ScrollView
        className="flex-1 bg-background"
        contentContainerClassName="p-4 gap-3"
        contentInsetAdjustmentBehavior="automatic"
      >
        {exercises.length === 0 ? (
          <EmptyState
            title="Nenhum exercício encontrado."
            subtitle="Adicione um exercício para começar."
            testID="exercises-list.empty"
          />
        ) : null}
        {exercises.map((exercise) => {
          const visibility = VISIBILITY_META[exercise.visibility];
          const isSelected = selected.has(exercise.id);
          return (
            <Pressable
              key={exercise.id}
              onPress={() => {
                if (mode === 'select') toggle(exercise.id);
              }}
              onLongPress={() => {
                if (mode === 'browse') enterSelect(exercise.id);
              }}
              delayLongPress={350}
            >
              <Card>
                <CardContent className="flex-row items-center gap-3">
                  <View className="h-16 w-16 items-center justify-center rounded-sm bg-primary">
                    <Icon as={Dumbbell} size={28} className="text-primary-foreground" />
                  </View>
                  <View className="flex-1 gap-1">
                    <Text className="font-[Geist_600SemiBold]" numberOfLines={1}>
                      {exercise.name}
                    </Text>
                    <View className="flex-row items-center gap-1.5">
                      <Text className="text-foreground text-xs" numberOfLines={1}>
                        {exercise.primaryMuscle}
                      </Text>
                      <Text className="text-muted-foreground text-xs">·</Text>
                      <Text className="text-muted-foreground text-xs" numberOfLines={1}>
                        {exercise.type}
                      </Text>
                      <Text className="text-muted-foreground text-xs">·</Text>
                      <View className="shrink flex-row items-center gap-1">
                        <Icon as={visibility.icon} size={12} className="text-muted-foreground" />
                        <Text className="text-muted-foreground text-xs" numberOfLines={1}>
                          {visibility.label}
                        </Text>
                      </View>
                    </View>
                  </View>
                  {mode === 'select' && (
                    <Icon
                      as={isSelected ? CheckCircle2 : Circle}
                      size={22}
                      className={isSelected ? 'text-primary' : 'text-muted-foreground'}
                    />
                  )}
                </CardContent>
              </Card>
            </Pressable>
          );
        })}
        <View className="h-30" />
      </ScrollView>

      {mode === 'browse' && (
        <ScreenActions.ScreenActions primary={browsePrimary} overflow={browseOverflow} />
      )}
      {mode === 'select' && (
        <ScreenActions.SelectionActions
          count={selected.size}
          onCancel={exitSelect}
          onSelectAll={selectAll}
          actions={selectionActions}
        />
      )}
    </>
  );
}
```

Notes for the implementer:
- The `Users` icon import was removed (it was only used by the dropped `'shared'` visibility).
- The error-reporting `useEffect` with the `lastReportedRef` guard is the same pattern used in `src/components/workout-logs/WorkoutLogList.tsx`; keep it byte-for-byte similar so lint (`useExhaustiveDependencies`) behaves the same.
- Loading and error states are early returns (no `ScreenActions`), mirroring `WorkoutLogList`.

- [ ] **Step 3: Run the full test suite**

Run: `bun run test`
Expected: PASS — all suites green, including the three new ones from Tasks 1–3 and the existing suites (the new MSW handler must not break `onUnhandledRequest: 'error'`).

- [ ] **Step 4: Manual verification**

Start the app (`bun run start` / open in a simulator), sign in, open **Treinos → Exercícios**. Expected:
- A skeleton list flashes briefly, then the real catalog renders (e.g. "Abdominal na Máquina", "Afundo com Salto com Peso Corporal", muscle group / type / "Público" or "Privado" in the subtitle).
- The "+" action still opens the Add Exercise modal; long-press still enters select mode; "Selecionar" / "Filtrar" overflow actions still appear.
- (Optional) Temporarily point `EXPO_PUBLIC_API_URL` at an unreachable host to confirm the error state ("Não foi possível carregar os exercícios." + "Tentar novamente") and revert.

- [ ] **Step 5: Commit**

```bash
git add src/app/'(tabs)'/'(workouts)'/exercisesList.tsx src/mocks/handlers.ts
git commit -m "feat: wire exercises list to GET /exercises"
```

(If `git add` with the parenthesised path is awkward in your shell, use `git add -A src/app src/mocks/handlers.ts` after reviewing `git status`.)

---

## Self-Review

- **Spec coverage:**
  - Contrato da API / tipos consumidos → Task 1 (`ExerciseApiItem`).
  - `composeExerciseName`, `toExercise`, `EXERCISE_TYPE_LABELS` → Task 1.
  - `src/lib/api/exercises.ts` (`fetchExercises`) → Task 2.
  - `src/hooks/use-exercises.ts` (`useExercises`) → Task 3.
  - Screen: swap data source, loading skeleton, error + retry, empty state, `captureWorkoutError` with `{ action: 'load_exercises' }`, PT hardcoded copy, unchanged select/stub behavior, stays on `ScrollView` → Task 4.
  - MSW handler for `/exercises` → Task 4, Step 1.
  - Jest tests: format, api, hook → Tasks 1–3. Screen render test intentionally omitted (no screen tests in repo); noted in plan.
  - Maestro flow → explicitly out of scope (follow-up), per spec.
- **Placeholder scan:** No "TBD"/"TODO"/"handle edge cases"/"similar to Task N"; every code step contains full code.
- **Type consistency:** `ExerciseApiItem`, `Exercise`, `ExerciseVisibility` defined in Task 1 and used identically in Tasks 2–4. `composeExerciseName` / `toExercise` signatures match between `format.ts`, its test, and the screen. `fetchExercises({ signal })` signature matches between `exercises.ts`, its test, and `use-exercises.ts`. `useExercises()` return fields used in the screen (`data`, `isLoading`, `isError`, `error`, `refetch`) are the standard `useQuery` result.
