# Exercícios alternativos — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir configurar opcionalmente **um** exercício alternativo por exercício de treino (inclusive por membro de superset), trocável na execução; o log registra a variação de fato executada.

**Architecture:** Abordagem A do spec — o alternativo é outra linha de `workout_exercises` com `alternative_of_id` apontando para o principal e seus próprios `workout_sets`. A linha do alternativo é mantida **flat** no contrato da API (espelhando como supersets já trafegam flat) e **aninhada** nas bordas de carga/salvamento do mobile (`alternative` dentro de cada exercício do form). O estado do form e a renderização da lista só lidam com principais + alternativo aninhado.

**Tech Stack:** Postgres/Supabase (plpgsql, `wt_*` SECURITY INVOKER), Hono + Zod (apps/api), `@workout-tracker/domain` + infraestrutura Supabase, React Native/Expo + react-hook-form + Zod (apps/mobile). Testes: `bun test` (api/domain/infra), `jest` (mobile).

**Convenção de commits do projeto:** `git commit` é bloqueado por hook. Cada passo "Commit" significa **`git add` (stage) e pedir ao usuário para commitar**. Não tente commitar.

**Referência do spec:** `docs/superpowers/specs/2026-06-12-exercicios-alternativos-design.md`

---

## File Structure

**Criar:**
- `supabase/migrations/20260612000000_workout_exercises_alternative.sql` — coluna `alternative_of_id`, FK deferível, índice único parcial de 1-alternativo, e recriação do índice de posição como parcial.
- `supabase/migrations/20260612000100_wt_upsert_workout_alternatives.sql` — `CREATE OR REPLACE FUNCTION wt_upsert_workout` com suporte a `alternative`.
- `apps/mobile/src/features/workouts/components/ExerciseBuilderCard/AlternativeBuilderBlock.tsx` — sub-bloco recolhível do alternativo no builder.
- `apps/mobile/src/features/workouts/components/ExerciseExecutionCard/AlternativeSwapControl.tsx` — controle de troca na execução (compartilhado single+membro).

**Modificar:**
- `apps/api/src/modules/workouts/schemas.ts` — `alternativeOfId` na resposta; `alternative` no request de upsert.
- `packages/infrastructure/src/workouts/supabase-workouts-adapter.ts` — `alternative_of_id` no select e no mapeamento.
- `apps/api/src/modules/workouts/routes.ts` — repassar `alternative` ao payload de `wt_upsert_workout` (verificar).
- `apps/mobile/src/features/workouts/lib/builder-form.ts` — schema/tipos `BuilderAlternative`, seed, nesting de carga, emissão no request.
- `apps/mobile/src/features/workouts/lib/execution-form.ts` — schema do alternativo na execução, `usingAlternative`, nesting de carga, builder do log lendo o item ativo.
- `apps/mobile/src/features/workouts/lib/workout-mappers.ts` — `alternative` nos tipos de item da lista (`SingleExerciseItem`, `SupersetMember`).
- `apps/mobile/src/features/workouts/components/ExerciseBuilderCard/ExerciseBuilderCard.tsx` — render do `AlternativeBuilderBlock`.
- `apps/mobile/src/features/workouts/components/SupersetBuilderCard/SupersetBuilderCard.tsx` — render do bloco por membro.
- `apps/mobile/src/features/workouts/components/ExerciseExecutionCard/ExerciseExecutionCard.tsx` — swap + render condicional dos sets do ativo.
- `apps/mobile/src/features/workouts/components/SupersetExecutionCard/SupersetExecutionCard.tsx` — swap por membro.
- `apps/mobile/src/app/(stacks)/(workouts)/workoutForm.tsx` — ação de long-press "adicionar/remover alternativo".
- `apps/mobile/src/app/(stacks)/(workouts)/workoutExecution.tsx` — passar alternativo nos items; build do log.
- `src/internationalization/locales/{en,pt}.ts` — strings novas.

---

## Phase 1 — Banco de dados

### Task 1: Migration de schema (coluna + índices)

**Files:**
- Create: `supabase/migrations/20260612000000_workout_exercises_alternative.sql`

- [ ] **Step 1: Escrever a migration**

```sql
-- alternative_of_id: o alternativo é outra linha de workout_exercises que aponta
-- para o exercício principal. FK DEFERRABLE para permitir inserir principal e
-- alternativo no mesmo INSERT (wt_upsert_workout) sem depender da ordem das linhas.
ALTER TABLE "public"."workout_exercises"
  ADD COLUMN "alternative_of_id" "uuid";

ALTER TABLE "public"."workout_exercises"
  ADD CONSTRAINT "workout_exercises_alternative_of_id_fkey"
  FOREIGN KEY ("alternative_of_id")
  REFERENCES "public"."workout_exercises"("id")
  ON DELETE CASCADE
  DEFERRABLE INITIALLY DEFERRED;

-- No máximo 1 alternativo por principal.
CREATE UNIQUE INDEX "ux_workout_exercises_one_alternative"
  ON "public"."workout_exercises" ("alternative_of_id")
  WHERE "alternative_of_id" IS NOT NULL;

-- O alternativo herda a position do principal e usa superset_order = 0, o que
-- colidiria com um principal standalone no índice (workout_id, position,
-- superset_order). Recria o índice como parcial: a unicidade posicional só vale
-- para exercícios "reais" (alternative_of_id IS NULL).
DROP INDEX "public"."workout_exercises_workout_position_superset_uidx";
CREATE UNIQUE INDEX "workout_exercises_workout_position_superset_uidx"
  ON "public"."workout_exercises" ("workout_id", "position", "superset_order")
  WHERE "alternative_of_id" IS NULL;
```

- [ ] **Step 2: Aplicar e verificar que sobe limpo**

Run: `supabase db reset` (aplica todas as migrations + seeds do zero).
Expected: termina sem erro; a tabela `workout_exercises` passa a ter a coluna `alternative_of_id`.

- [ ] **Step 3: Verificar as invariantes com SQL manual**

Run (psql na instância local, como um usuário de seed via RLS ou como superuser para checar constraint):
```sql
-- Índice de 1-alternativo impede dois alternativos do mesmo principal:
--   inserir duas linhas com o mesmo alternative_of_id deve falhar com unique_violation.
-- Índice posicional parcial: um principal standalone e seu alternativo podem
--   coexistir com a mesma (workout_id, position, superset_order) sem violar.
\d+ public.workout_exercises
```
Expected: a saída de `\d+` lista `ux_workout_exercises_one_alternative` e o `workout_position_superset_uidx` com a cláusula `WHERE (alternative_of_id IS NULL)`.

- [ ] **Step 4: Commit (stage; o usuário commita)**

```bash
git add supabase/migrations/20260612000000_workout_exercises_alternative.sql
```

---

### Task 2: `wt_upsert_workout` com suporte a `alternative`

**Files:**
- Create: `supabase/migrations/20260612000100_wt_upsert_workout_alternatives.sql`

Contexto: a função atual (`supabase/migrations/20260610140000_wt_upsert_workout.sql`) monta `temp_exercises` e `temp_sets`, deleta os exercícios do treino e reinsere. Não há validação de superset na função (o índice cobre). Vamos: (a) recusar alternativo aninhado; (b) acrescentar as linhas do alternativo em `temp_exercises` via `UNION ALL`; (c) incluir `alternative_of_id` no INSERT.

- [ ] **Step 1: Escrever a migration (CREATE OR REPLACE completo)**

Copie a função de `20260610140000_wt_upsert_workout.sql` e aplique exatamente estas 3 mudanças. Migration:

```sql
CREATE OR REPLACE FUNCTION "public"."wt_upsert_workout"("payload" "jsonb") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY INVOKER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_actor_id UUID := (SELECT auth.uid());
  v_user_id UUID;
  v_workout_id UUID;
BEGIN
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'wt_upsert_workout called without an authenticated user'
      USING ERRCODE = '28000';
  END IF;

  v_user_id := (payload->>'userId')::UUID;
  v_workout_id := (payload->>'workoutId')::UUID;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'userId required' USING ERRCODE = '22023';
  END IF;
  IF v_workout_id IS NULL THEN
    RAISE EXCEPTION 'workoutId required' USING ERRCODE = '22023';
  END IF;
  IF v_user_id <> v_actor_id
    AND NOT public.is_active_coach_of(v_actor_id, v_user_id) THEN
    RAISE EXCEPTION 'actor is neither the target user nor an active coach of them'
      USING ERRCODE = '42501';
  END IF;
  IF jsonb_typeof(payload->'exercises') IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'exercises must be array' USING ERRCODE = '22023';
  END IF;

  -- MUDANÇA 1: alternativo não pode ter alternativo aninhado.
  IF EXISTS (
    SELECT 1 FROM jsonb_array_elements(payload->'exercises') ex
    WHERE jsonb_typeof(ex->'alternative') = 'object'
      AND jsonb_typeof(ex->'alternative'->'alternative') = 'object'
  ) THEN
    RAISE EXCEPTION 'alternative cannot have a nested alternative' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.workouts (
    id, user_id, name, description, folder_id, created_by, updated_by
  )
  VALUES (
    v_workout_id, v_user_id, TRIM(payload->>'name'),
    NULLIF(TRIM(payload->>'description'), ''),
    NULLIF(payload->>'folderId', '')::UUID, v_actor_id, v_actor_id
  )
  ON CONFLICT (id) DO UPDATE SET
    name = excluded.name,
    description = excluded.description,
    folder_id = excluded.folder_id,
    updated_by = excluded.updated_by
  WHERE public.workouts.user_id = v_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'workout not found or access denied' USING ERRCODE = 'P0002';
  END IF;

  -- MUDANÇA 2: temp_exercises inclui as linhas dos alternativos via UNION ALL.
  -- O raw_ex de um alternativo é o próprio objeto 'alternative' (que tem 'sets').
  DROP TABLE IF EXISTS temp_exercises;
  CREATE TEMP TABLE temp_exercises AS
  SELECT
    (ex->>'id')::UUID AS id,
    (ex->>'variationId')::UUID AS variation_id,
    COALESCE(NULLIF(ex->>'exerciseType', ''), 'strength') AS exercise_type,
    (ex->>'position')::INTEGER AS position,
    (ex->>'supersetGroupId')::UUID AS superset_group_id,
    (ex->>'supersetOrder')::INTEGER AS superset_order,
    NULLIF(TRIM(ex->>'note'), '') AS note,
    NULLIF(ex->>'restSeconds', '')::INTEGER AS rest_seconds,
    NULL::UUID AS alternative_of_id,
    ex AS raw_ex
  FROM jsonb_array_elements(payload->'exercises') ex
  UNION ALL
  SELECT
    (ex->'alternative'->>'id')::UUID,
    (ex->'alternative'->>'variationId')::UUID,
    COALESCE(NULLIF(ex->>'exerciseType', ''), 'strength'),
    (ex->>'position')::INTEGER,
    (ex->'alternative'->>'id')::UUID,   -- superset_group_id = próprio id (standalone-like)
    0,
    NULLIF(TRIM(ex->'alternative'->>'note'), ''),
    NULLIF(ex->'alternative'->>'restSeconds', '')::INTEGER,
    (ex->>'id')::UUID,                  -- alternative_of_id = id do principal
    ex->'alternative'
  FROM jsonb_array_elements(payload->'exercises') ex
  WHERE jsonb_typeof(ex->'alternative') = 'object';

  IF EXISTS (SELECT 1 FROM temp_exercises WHERE id IS NULL) THEN
    RAISE EXCEPTION 'exercise id required' USING ERRCODE = '22023';
  END IF;
  IF EXISTS (SELECT 1 FROM temp_exercises WHERE variation_id IS NULL) THEN
    RAISE EXCEPTION 'exercise variationId required' USING ERRCODE = '22023';
  END IF;

  DROP TABLE IF EXISTS temp_sets;
  CREATE TEMP TABLE temp_sets AS
  SELECT
    te.id AS exercise_id,
    (s->>'id')::UUID AS id,
    (s->>'setOrder')::INTEGER AS set_order,
    s->>'setType' AS set_type,
    NULLIF(s->>'repsMin', '')::INTEGER AS reps_min,
    NULLIF(s->>'repsMax', '')::INTEGER AS reps_max,
    NULLIF(s->>'durationSeconds', '')::INTEGER AS duration_seconds,
    NULLIF(s->>'distanceMeters', '')::INTEGER AS distance_meters,
    NULLIF(s->>'linkedSetId', '')::UUID AS linked_set_id,
    NULLIF(s->>'loadPercentOfPrevious', '')::INTEGER AS load_percent_of_previous,
    NULLIF(s->>'roundOrder', '')::INTEGER AS round_order_in
  FROM temp_exercises te
  CROSS JOIN LATERAL jsonb_array_elements(te.raw_ex->'sets') s;

  IF EXISTS (SELECT 1 FROM temp_sets WHERE id IS NULL) THEN
    RAISE EXCEPTION 'set id required' USING ERRCODE = '22023';
  END IF;
  IF EXISTS (
    SELECT 1 FROM temp_sets WHERE set_type IN ('drop', 'cluster') AND linked_set_id IS NULL
  ) THEN
    RAISE EXCEPTION 'linked_set_id required for drop/cluster' USING ERRCODE = '22023';
  END IF;
  IF EXISTS (
    SELECT 1 FROM temp_sets ts
    WHERE ts.set_type IN ('drop', 'cluster')
      AND NOT EXISTS (
        SELECT 1 FROM temp_sets prev
        WHERE prev.exercise_id = ts.exercise_id
          AND prev.set_order = ts.set_order - 1
          AND prev.id = ts.linked_set_id
      )
  ) THEN
    RAISE EXCEPTION 'linked_set_id must reference previous set' USING ERRCODE = '22023';
  END IF;

  DELETE FROM public.workout_exercises WHERE workout_id = v_workout_id;

  -- MUDANÇA 3: inclui alternative_of_id. ORDER BY NULLS FIRST insere principais
  -- antes (a FK é DEFERRABLE, então a ordem não é estritamente necessária, mas
  -- mantém o INSERT determinístico).
  INSERT INTO public.workout_exercises (
    id, workout_id, variation_id, exercise_type, position,
    superset_group_id, superset_order, note, rest_seconds, alternative_of_id
  )
  SELECT
    te.id, v_workout_id, te.variation_id, te.exercise_type, te.position,
    te.superset_group_id, te.superset_order, te.note, te.rest_seconds, te.alternative_of_id
  FROM temp_exercises te
  ORDER BY te.alternative_of_id NULLS FIRST;

  INSERT INTO public.workout_sets (
    id, workout_exercise_id, set_order, set_type,
    reps_min, reps_max, duration_seconds, distance_meters,
    linked_set_id, load_percent_of_previous, round_order
  )
  SELECT
    ts.id, ts.exercise_id, ts.set_order, ts.set_type,
    ts.reps_min, ts.reps_max, ts.duration_seconds, ts.distance_meters,
    ts.linked_set_id, ts.load_percent_of_previous,
    COALESCE(
      ts.round_order_in,
      GREATEST(
        (COUNT(*) FILTER (WHERE ts.set_type IN ('normal', 'warmup'))
          OVER (PARTITION BY ts.exercise_id ORDER BY ts.set_order)) - 1,
        0
      )
    )
  FROM temp_sets ts;

  IF v_user_id <> v_actor_id THEN
    PERFORM public.wt_share_variations_for_copy(v_user_id, ARRAY[v_workout_id]);
  END IF;

  RETURN v_workout_id;
END;
$$;

ALTER FUNCTION "public"."wt_upsert_workout"("payload" "jsonb") OWNER TO "postgres";
GRANT ALL ON FUNCTION "public"."wt_upsert_workout"("payload" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."wt_upsert_workout"("payload" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."wt_upsert_workout"("payload" "jsonb") TO "service_role";
```

- [ ] **Step 2: Aplicar**

Run: `supabase db reset`
Expected: sobe sem erro.

- [ ] **Step 3: Verificar round-trip com SQL manual**

Run (psql como um usuário de seed; use ids de variação dos seeds `05_seed_exercises_variations.sql`):
```sql
SELECT public.wt_upsert_workout('{
  "userId":"<seed_user_id>","workoutId":"<novo_uuid>","name":"Alt test","exercises":[
    {"id":"<exA>","variationId":"<varA>","exerciseType":"strength","position":0,
     "supersetGroupId":"<exA>","supersetOrder":0,"note":null,"restSeconds":null,
     "sets":[{"id":"<setA>","setOrder":0,"setType":"normal","repsMin":8,"repsMax":10,
              "durationSeconds":null,"distanceMeters":null,"roundOrder":0,
              "linkedSetId":null,"loadPercentOfPrevious":null}],
     "alternative":{"id":"<altA>","variationId":"<varB>","note":null,"restSeconds":null,
       "sets":[{"id":"<altSet>","setOrder":0,"setType":"normal","repsMin":8,"repsMax":10,
                "durationSeconds":null,"distanceMeters":null,"roundOrder":0,
                "linkedSetId":null,"loadPercentOfPrevious":null}]}}
  ]}'::jsonb);

SELECT id, variation_id, alternative_of_id FROM workout_exercises WHERE workout_id='<novo_uuid>';
```
Expected: 2 linhas — o principal (`alternative_of_id` NULL) e o alternativo (`alternative_of_id` = id do principal), cada um com seu set.

- [ ] **Step 4: Verificar rejeição de aninhamento e CASCADE**

Run:
```sql
-- aninhar 'alternative' dentro de 'alternative' deve levantar 22023.
-- DELETE do principal deve remover o alternativo (ON DELETE CASCADE):
DELETE FROM workout_exercises WHERE id='<exA>';
SELECT count(*) FROM workout_exercises WHERE id='<altA>'; -- esperado: 0
```
Expected: a chamada aninhada falha com `alternative cannot have a nested alternative`; o count pós-delete é 0.

- [ ] **Step 5: Commit (stage)**

```bash
git add supabase/migrations/20260612000100_wt_upsert_workout_alternatives.sql
```

---

## Phase 2 — Backend API

### Task 3: Schema da API — `alternativeOfId` na resposta

**Files:**
- Modify: `apps/api/src/modules/workouts/schemas.ts` (WorkoutDetailExerciseSchema, ~linhas 130-140)
- Test: `apps/api/src/modules/workouts/schemas.test.ts` (criar se não existir)

- [ ] **Step 1: Teste falhando para o novo campo**

```typescript
import { describe, expect, test } from 'bun:test';
import { WorkoutDetailExerciseSchema } from './schemas';

describe('WorkoutDetailExerciseSchema', () => {
  const base = {
    id: '00000000-0000-0000-0000-000000000001',
    exerciseType: 'strength',
    position: 0,
    supersetGroupId: '00000000-0000-0000-0000-000000000001',
    supersetOrder: 0,
    note: null,
    restSeconds: null,
    variation: {
      id: '00000000-0000-0000-0000-0000000000a1', slug: null, name: null,
      exercise: { slug: null, name: 'Supino' }, measurementType: 'weight_reps',
      equipment: { slug: 'barbell', preposition: 'com' },
      muscle: { slug: 'chest' }, secondaryMuscle: null,
    },
    sets: [],
  };

  test('accepts a null alternativeOfId', () => {
    const parsed = WorkoutDetailExerciseSchema.parse({ ...base, alternativeOfId: null });
    expect(parsed.alternativeOfId).toBeNull();
  });

  test('accepts a uuid alternativeOfId', () => {
    const id = '00000000-0000-0000-0000-000000000002';
    const parsed = WorkoutDetailExerciseSchema.parse({ ...base, alternativeOfId: id });
    expect(parsed.alternativeOfId).toBe(id);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `cd apps/api && bun test src/modules/workouts/schemas.test.ts`
Expected: FAIL — `alternativeOfId` é desconhecido / `undefined`.

- [ ] **Step 3: Adicionar o campo ao schema**

Em `WorkoutDetailExerciseSchema` (após `restSeconds`):
```typescript
  restSeconds: z.int().nonnegative().nullable(),
  alternativeOfId: z.uuid().nullable(),
```

- [ ] **Step 4: Rodar e ver passar**

Run: `cd apps/api && bun test src/modules/workouts/schemas.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit (stage)**

```bash
git add apps/api/src/modules/workouts/schemas.ts apps/api/src/modules/workouts/schemas.test.ts
```

---

### Task 4: Adapter — selecionar e mapear `alternative_of_id`

**Files:**
- Modify: `packages/infrastructure/src/workouts/supabase-workouts-adapter.ts` (select ~linhas 59-94, e o mapeamento snake→camel da resposta)

- [ ] **Step 1: Adicionar a coluna ao select**

No bloco `.select(...)` de `workout_exercises`, acrescente `alternative_of_id`:
```
    workout_exercises (
      id, position, superset_group_id, superset_order, note, rest_seconds, exercise_type, alternative_of_id,
      variation:variations ( ... ),
      workout_sets ( ... )
    )
```

- [ ] **Step 2: Mapear para `alternativeOfId` na construção da resposta**

Localize onde cada `workout_exercise` (snake_case) é convertido para o objeto da resposta (o mesmo lugar que produz `supersetGroupId`, `restSeconds`, etc.). Acrescente, espelhando o padrão existente:
```typescript
      alternativeOfId: row.alternative_of_id ?? null,
```
(substitua `row` pelo nome real da variável de iteração no arquivo.)

- [ ] **Step 3: Typecheck**

Run: `cd packages/infrastructure && bun run typecheck` (ou `bunx tsc --noEmit` se não houver script).
Expected: sem erros — a resposta passa a satisfazer `WorkoutDetailExerciseSchema` com `alternativeOfId`.

- [ ] **Step 4: Verificar o round-trip de leitura (manual)**

Após o seed, chame o GET workout do treino criado na Task 2 (via teste de integração existente do adapter, se houver, ou manualmente) e confirme que as linhas do alternativo aparecem com `alternativeOfId` preenchido.

- [ ] **Step 5: Commit (stage)**

```bash
git add packages/infrastructure/src/workouts/supabase-workouts-adapter.ts
```

---

### Task 5: Request de upsert — campo `alternative`

**Files:**
- Modify: `apps/api/src/modules/workouts/schemas.ts` (UpsertWorkoutExerciseRequestSchema, ~linhas 242-252)
- Modify: `apps/api/src/modules/workouts/routes.ts` (construção do payload de `wt_upsert_workout`)
- Test: `apps/api/src/modules/workouts/schemas.test.ts`

- [ ] **Step 1: Teste falhando para `alternative`**

Acrescente ao `schemas.test.ts`:
```typescript
import { UpsertWorkoutExerciseRequestSchema } from './schemas';

describe('UpsertWorkoutExerciseRequestSchema', () => {
  const set = {
    id: '00000000-0000-0000-0000-0000000000s1', setOrder: 0, setType: 'normal',
    repsMin: 8, repsMax: 10, durationSeconds: null, distanceMeters: null,
    roundOrder: 0, linkedSetId: null, loadPercentOfPrevious: null,
  };
  const exercise = {
    id: '00000000-0000-0000-0000-000000000001',
    variationId: '00000000-0000-0000-0000-0000000000a1',
    exerciseType: 'strength', position: 0,
    supersetGroupId: '00000000-0000-0000-0000-000000000001', supersetOrder: 0,
    note: null, restSeconds: null, sets: [set],
  };

  test('defaults alternative to null when omitted', () => {
    const parsed = UpsertWorkoutExerciseRequestSchema.parse(exercise);
    expect(parsed.alternative).toBeNull();
  });

  test('accepts an alternative with its own variation and sets', () => {
    const parsed = UpsertWorkoutExerciseRequestSchema.parse({
      ...exercise,
      alternative: {
        id: '00000000-0000-0000-0000-0000000000b1',
        variationId: '00000000-0000-0000-0000-0000000000a2',
        note: null, restSeconds: 90,
        sets: [{ ...set, id: '00000000-0000-0000-0000-0000000000s2' }],
      },
    });
    expect(parsed.alternative?.variationId).toBe('00000000-0000-0000-0000-0000000000a2');
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `cd apps/api && bun test src/modules/workouts/schemas.test.ts`
Expected: FAIL — `alternative` ignorado/`undefined`.

- [ ] **Step 3: Adicionar o schema do alternativo**

Em `schemas.ts`, antes de `UpsertWorkoutExerciseRequestSchema`:
```typescript
export const UpsertWorkoutAlternativeRequestSchema = z.object({
  id: z.uuid(),
  variationId: z.uuid(),
  note: z.string().nullable(),
  restSeconds: z.int().nonnegative().nullable(),
  sets: z.array(UpsertWorkoutSetRequestSchema).min(1),
});
```
E em `UpsertWorkoutExerciseRequestSchema`, após `sets`:
```typescript
  sets: z.array(UpsertWorkoutSetRequestSchema).min(1),
  alternative: UpsertWorkoutAlternativeRequestSchema.nullable().default(null),
```

- [ ] **Step 4: Rodar e ver passar**

Run: `cd apps/api && bun test src/modules/workouts/schemas.test.ts`
Expected: PASS.

- [ ] **Step 5: Garantir que a rota repassa `alternative` ao payload**

Abra `apps/api/src/modules/workouts/routes.ts` e localize onde o body validado vira o `payload` jsonb de `wt_upsert_workout` (procure por `wt_upsert_workout` / `exercises:`). Se a rota constrói o payload campo a campo, acrescente `alternative: exercise.alternative` no map de exercícios. Se ela repassa o body inteiro (`...body`), confirme que `alternative` já flui e não há allowlist que o remova.

Verificação: adicione/estenda o teste de rota existente (se houver `routes.test.ts`) afirmando que um body com `alternative` chega ao mock de `wt_upsert_workout` com o campo presente. Se não houver teste de rota, registre a verificação manual: logar o payload e confirmar `alternative` presente.

- [ ] **Step 6: Commit (stage)**

```bash
git add apps/api/src/modules/workouts/schemas.ts apps/api/src/modules/workouts/schemas.test.ts apps/api/src/modules/workouts/routes.ts
```

---

## Phase 3 — Mappers do mobile (carga + salvamento)

### Task 6: `BuilderAlternative` — schema, tipos e seed

**Files:**
- Modify: `apps/mobile/src/features/workouts/lib/builder-form.ts`
- Test: `apps/mobile/src/features/workouts/lib/builder-form.test.ts` (criar se não existir)

- [ ] **Step 1: Teste falhando para o seed do alternativo**

```typescript
import { test, expect } from '@jest/globals';
import { buildBuilderAlternativeFromPicked } from './builder-form';

const picked = {
  exercise: { slug: 'leg-press', name: 'Leg Press', type: 'musculacao' },
  variation: {
    id: 'var-alt', slug: null, name: null, measurementType: 'weight_reps',
    equipment: { slug: 'machine', preposition: 'na' },
    muscle: { slug: 'quads' }, secondaryMuscle: null,
  },
} as const;

const principalSets = [
  { id: 's1', type: 'normal', measurementType: 'weight_reps', roundOrder: 0,
    repsMin: '8', repsMax: '10', duration: '', distance: '', loadPercent: '', linkedSetId: null },
];

test('seeds the alternative with one set per principal set, copying prescription', () => {
  let n = 0;
  const alt = buildBuilderAlternativeFromPicked(picked, principalSets, () => `gen-${n++}`);
  expect(alt.variation.id).toBe('var-alt');
  expect(alt.sets).toHaveLength(1);
  expect(alt.sets[0].repsMin).toBe('8');
  expect(alt.sets[0].repsMax).toBe('10');
  expect(alt.sets[0].measurementType).toBe('weight_reps'); // do variation do alternativo
  expect(alt.sets[0].linkedSetId).toBeNull();
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `bun run test -- builder-form`
Expected: FAIL — `buildBuilderAlternativeFromPicked` não existe.

- [ ] **Step 3: Adicionar schema, tipos e o builder do seed**

Em `builder-form.ts`:
```typescript
export const BuilderAlternativeSchema = z.object({
  id: z.string(),
  note: z.string().nullable(),
  restSeconds: z.int().nonnegative().nullable(),
  variation: ExecutionExerciseVariationSchema,
  sets: z.array(BuilderSetSchema).min(1),
});
```
Acrescente ao `BuilderExerciseSchema` (após `sets`):
```typescript
  sets: z.array(BuilderSetSchema).min(1),
  alternative: BuilderAlternativeSchema.nullable().default(null),
```
E o builder do seed (mede pelo variation do alternativo, copia a prescrição dos sets do principal):
```typescript
export type BuilderAlternativeInput = BuilderExerciseInput['alternative'];

export function buildBuilderAlternativeFromPicked(
  picked: PickedExercise,
  principalSets: BuilderSetInput[],
  generateId: () => string,
): NonNullable<BuilderAlternativeInput> {
  const measurementType = setMeasurementTypeForVariation(picked.variation.measurementType);
  return {
    id: generateId(),
    note: null,
    restSeconds: null,
    variation: {
      id: picked.variation.id,
      slug: picked.variation.slug,
      name: picked.variation.name,
      exercise: {
        slug: picked.exercise.slug,
        name: picked.exercise.name,
        type: picked.exercise.type,
      },
      measurementType: picked.variation.measurementType,
      equipment: {
        slug: picked.variation.equipment.slug,
        preposition: picked.variation.equipment.preposition,
      },
      muscle: { slug: picked.variation.muscle.slug },
      secondaryMuscle: picked.variation.secondaryMuscle
        ? { slug: picked.variation.secondaryMuscle.slug }
        : null,
    },
    sets: principalSets.map((set) => ({
      id: generateId(),
      type: set.type,
      measurementType,
      roundOrder: set.roundOrder,
      repsMin: set.repsMin,
      repsMax: set.repsMax,
      duration: set.duration,
      distance: set.distance,
      loadPercent: set.loadPercent,
      linkedSetId: null,
    })),
  };
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `bun run test -- builder-form`
Expected: PASS.

- [ ] **Step 5: Commit (stage)**

```bash
git add apps/mobile/src/features/workouts/lib/builder-form.ts apps/mobile/src/features/workouts/lib/builder-form.test.ts
```

---

### Task 7: Carga — `buildBuilderFromWorkout` aninha o alternativo

**Files:**
- Modify: `apps/mobile/src/features/workouts/lib/builder-form.ts` (`buildBuilderFromWorkout`, ~linhas 176-209)
- Test: `apps/mobile/src/features/workouts/lib/builder-form.test.ts`

- [ ] **Step 1: Teste falhando — linhas de alternativo viram `.alternative` aninhado**

```typescript
import { buildBuilderFromWorkout } from './builder-form';

test('nests alternative rows under their principal and drops them from the top list', () => {
  const workout = {
    name: 'W', description: null,
    exercises: [
      { id: 'p1', exerciseType: 'strength', position: 0, supersetGroupId: 'p1', supersetOrder: 0,
        note: null, restSeconds: null, alternativeOfId: null,
        variation: { id: 'vp', slug: null, name: null, exercise: { slug: null, name: 'A', type: 'musculacao' },
          measurementType: 'weight_reps', equipment: { slug: 'barbell', preposition: 'com' },
          muscle: { slug: 'chest' }, secondaryMuscle: null },
        sets: [{ id: 'ps', setType: 'normal', repsMin: 8, repsMax: 10, durationSeconds: null,
          distanceMeters: null, loadPercentOfPrevious: null, linkedSetId: null, roundOrder: 0 }] },
      { id: 'a1', exerciseType: 'strength', position: 0, supersetGroupId: 'a1', supersetOrder: 0,
        note: null, restSeconds: 90, alternativeOfId: 'p1',
        variation: { id: 'va', slug: null, name: null, exercise: { slug: null, name: 'B', type: 'musculacao' },
          measurementType: 'weight_reps', equipment: { slug: 'machine', preposition: 'na' },
          muscle: { slug: 'chest' }, secondaryMuscle: null },
        sets: [{ id: 'as', setType: 'normal', repsMin: 8, repsMax: 10, durationSeconds: null,
          distanceMeters: null, loadPercentOfPrevious: null, linkedSetId: null, roundOrder: 0 }] },
    ],
  } as never;

  const form = buildBuilderFromWorkout(workout);
  expect(form.exercises).toHaveLength(1);
  expect(form.exercises[0].id).toBe('p1');
  expect(form.exercises[0].alternative?.variation.id).toBe('va');
  expect(form.exercises[0].alternative?.sets[0].repsMin).toBe('8');
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `bun run test -- builder-form`
Expected: FAIL — `alternative` é `undefined` e há 2 exercícios na lista.

- [ ] **Step 3: Implementar o nesting**

Extraia o mapeamento de sets atual para um helper local `mapResponseSetsToBuilder(exercise)` (o corpo do `.map` de sets em `buildBuilderFromWorkout`) e reutilize-o para principal e alternativo. Reescreva `buildBuilderFromWorkout`:
```typescript
export function buildBuilderFromWorkout(workout: GetWorkoutResponse): WorkoutFormInput {
  const altByPrincipal = new Map(
    workout.exercises
      .filter((e) => e.alternativeOfId != null)
      .map((e) => [e.alternativeOfId as string, e]),
  );
  return {
    name: workout.name,
    description: workout.description ?? '',
    exercises: workout.exercises
      .filter((exercise) => exercise.alternativeOfId == null)
      .map((exercise) => {
        const alt = altByPrincipal.get(exercise.id) ?? null;
        return {
          id: exercise.id,
          exerciseType: exercise.exerciseType,
          position: exercise.position,
          supersetGroupId: exercise.supersetGroupId,
          supersetOrder: exercise.supersetOrder,
          note: exercise.note,
          restSeconds: exercise.restSeconds,
          variation: exercise.variation,
          sets: mapResponseSetsToBuilder(exercise),
          alternative: alt
            ? {
                id: alt.id,
                note: alt.note,
                restSeconds: alt.restSeconds,
                variation: alt.variation,
                sets: mapResponseSetsToBuilder(alt),
              }
            : null,
        };
      }),
  };
}
```
`mapResponseSetsToBuilder` deve conter exatamente a lógica atual (deriveRoundOrders + setMeasurementTypeForVariation + o `.map` de sets que produz `{ id, type, measurementType, roundOrder, repsMin, ... }`).

- [ ] **Step 4: Rodar e ver passar**

Run: `bun run test -- builder-form`
Expected: PASS (incluindo os testes existentes do arquivo).

- [ ] **Step 5: Commit (stage)**

```bash
git add apps/mobile/src/features/workouts/lib/builder-form.ts apps/mobile/src/features/workouts/lib/builder-form.test.ts
```

---

### Task 8: Salvamento — `toUpsertWorkoutRequest` emite `alternative`

**Files:**
- Modify: `apps/mobile/src/features/workouts/lib/builder-form.ts` (`UpsertWorkoutRequestBody`, `toUpsertWorkoutRequest`, ~linhas 211-283)
- Test: `apps/mobile/src/features/workouts/lib/builder-form.test.ts`

- [ ] **Step 1: Teste falhando — request inclui `alternative` com `linkedSetId` próprio**

```typescript
import { toUpsertWorkoutRequest } from './builder-form';

test('emits alternative with its own sets and null linkedSetId for normal sets', () => {
  const values = {
    name: 'W', description: '',
    exercises: [
      { id: 'p1', exerciseType: 'strength', position: 0, supersetGroupId: 'p1', supersetOrder: 0,
        note: null, restSeconds: null,
        variation: { id: 'vp' /* demais campos */ } as never,
        sets: [{ id: 'ps', type: 'normal', measurementType: 'weight_reps', roundOrder: 0,
          repsMin: 8, repsMax: 10, duration: null, distance: null, loadPercent: null, linkedSetId: null }],
        alternative: {
          id: 'a1', note: null, restSeconds: 90,
          variation: { id: 'va' /* demais campos */ } as never,
          sets: [{ id: 'as', type: 'normal', measurementType: 'weight_reps', roundOrder: 0,
            repsMin: 8, repsMax: 10, duration: null, distance: null, loadPercent: null, linkedSetId: null }],
        } },
    ],
  } as never;

  const body = toUpsertWorkoutRequest(values, { userId: 'u1', folderId: null });
  expect(body.exercises[0].alternative?.variationId).toBe('va');
  expect(body.exercises[0].alternative?.sets[0].setOrder).toBe(0);
  expect(body.exercises[0].alternative?.sets[0].linkedSetId).toBeNull();
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `bun run test -- builder-form`
Expected: FAIL — `alternative` ausente no body.

- [ ] **Step 3: Implementar**

Extraia o `.map` de sets atual de `toUpsertWorkoutRequest` para um helper local `mapBuilderSetsToRequest(sets)` (recebe `WorkoutFormValues['exercises'][number]['sets']` e devolve o array de sets do request, com o `linkedSetId` derivado do set anterior). Acrescente ao tipo `UpsertWorkoutRequestBody` o campo no exercício:
```typescript
    alternative: {
      id: string;
      variationId: string;
      note: string | null;
      restSeconds: number | null;
      sets: UpsertWorkoutRequestBody['exercises'][number]['sets'];
    } | null;
```
E no `.map` de `exercises`, após `sets: mapBuilderSetsToRequest(exercise.sets)`:
```typescript
      alternative: exercise.alternative
        ? {
            id: exercise.alternative.id,
            variationId: exercise.alternative.variation.id,
            note: exercise.alternative.note,
            restSeconds: exercise.alternative.restSeconds,
            sets: mapBuilderSetsToRequest(exercise.alternative.sets),
          }
        : null,
```

- [ ] **Step 4: Rodar e ver passar**

Run: `bun run test -- builder-form`
Expected: PASS.

- [ ] **Step 5: Commit (stage)**

```bash
git add apps/mobile/src/features/workouts/lib/builder-form.ts apps/mobile/src/features/workouts/lib/builder-form.test.ts
```

---

### Task 9: Execução — schema do alternativo, carga e build do log

**Files:**
- Modify: `apps/mobile/src/features/workouts/lib/execution-form.ts` (ExecutionExerciseSchema, `buildExecutionFromWorkout`, e o builder do payload do log)
- Test: `apps/mobile/src/features/workouts/lib/execution-form.test.ts` (criar se não existir)

- [ ] **Step 1: Teste falhando — carga aninha alternativo e `usingAlternative=false`**

```typescript
import { test, expect } from '@jest/globals';
import { buildExecutionFromWorkout } from './execution-form';

const workout = {
  name: 'W', description: null,
  exercises: [
    { id: 'p1', exerciseType: 'strength', position: 0, supersetGroupId: 'p1', supersetOrder: 0,
      note: null, restSeconds: null, alternativeOfId: null,
      variation: { id: 'vp', slug: null, name: null, exercise: { slug: null, name: 'A', type: 'musculacao' },
        measurementType: 'weight_reps', equipment: { slug: 'barbell', preposition: 'com' },
        muscle: { slug: 'chest' }, secondaryMuscle: null },
      sets: [{ id: 'ps', setType: 'normal', repsMin: 8, repsMax: 10, durationSeconds: null,
        distanceMeters: null, loadPercent: null, loadPercentOfPrevious: null, linkedSetId: null, roundOrder: 0 }] },
    { id: 'a1', exerciseType: 'strength', position: 0, supersetGroupId: 'a1', supersetOrder: 0,
      note: null, restSeconds: 90, alternativeOfId: 'p1',
      variation: { id: 'va', slug: null, name: null, exercise: { slug: null, name: 'B', type: 'musculacao' },
        measurementType: 'weight_reps', equipment: { slug: 'machine', preposition: 'na' },
        muscle: { slug: 'chest' }, secondaryMuscle: null },
      sets: [{ id: 'as', setType: 'normal', repsMin: 8, repsMax: 10, durationSeconds: null,
        distanceMeters: null, loadPercent: null, loadPercentOfPrevious: null, linkedSetId: null, roundOrder: 0 }] },
  ],
} as never;

test('nests the alternative and defaults usingAlternative to false', () => {
  const form = buildExecutionFromWorkout(workout);
  expect(form.exercises).toHaveLength(1);
  expect(form.exercises[0].usingAlternative).toBe(false);
  expect(form.exercises[0].alternative?.variation.id).toBe('va');
  expect(form.exercises[0].alternative?.sets[0].repsMin).toBe(8);
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `bun run test -- execution-form`
Expected: FAIL — `usingAlternative`/`alternative` ausentes; 2 exercícios.

- [ ] **Step 3: Implementar schema + nesting na carga**

Em `execution-form.ts`, defina o schema do alternativo de execução (variation + sets de execução próprios, sem `alternative`/`usingAlternative` aninhados):
```typescript
export const ExecutionAlternativeSchema = z.object({
  id: z.string(),
  note: z.string().nullable(),
  restSeconds: z.int().nonnegative().nullable(),
  aliasId: z.string().nullable(),
  variation: ExecutionExerciseVariationSchema,
  sets: z.array(ExecutionSetSchema).min(1),
});
```
Acrescente ao schema do exercício de execução:
```typescript
  usingAlternative: z.boolean().default(false),
  alternative: ExecutionAlternativeSchema.nullable().default(null),
```
Extraia a montagem de sets de `buildExecutionFromWorkout` para um helper `buildExecutionSets(exercise, lastSets, aliasResolution)` e reutilize para principal e alternativo. Reescreva `buildExecutionFromWorkout` para: filtrar `alternativeOfId == null` no `.map`, montar um `altByPrincipal` Map, e anexar `usingAlternative: false` + `alternative` (com seus próprios `sets`/`aliasId`, resolvido pelo `variation.id` do alternativo). O alias e o `lastSets` do alternativo são resolvidos pela variação **do alternativo** (mesmo mecanismo, `lastSets.find(e => e.variationId === alt.variation.id)`).

- [ ] **Step 4: Rodar e ver passar**

Run: `bun run test -- execution-form`
Expected: PASS.

- [ ] **Step 5: Teste falhando — build do log usa o item ativo**

Localize a função que transforma `ExecutionFormValues` no `CreateWorkoutLogRequest` (procure por `variationId` + `weightKg` em `execution-form.ts` ou arquivo vizinho; nomeie-a aqui como `toCreateWorkoutLogRequest`). Adicione:
```typescript
import { toCreateWorkoutLogExercises } from './execution-form'; // ajuste ao nome real

test('logs the alternative variation and sets when usingAlternative is true', () => {
  const exercises = [{
    id: 'p1', exerciseType: 'strength', position: 0, supersetGroupId: 'p1', supersetOrder: 0,
    note: null, restSeconds: null, aliasId: null, usingAlternative: true,
    variation: { id: 'vp', measurementType: 'weight_reps' /* ... */ } as never,
    sets: [{ /* set do principal, done:true, kg/reps preenchidos */ } as never],
    alternative: {
      id: 'a1', note: null, restSeconds: 90, aliasId: null,
      variation: { id: 'va', measurementType: 'weight_reps' /* ... */ } as never,
      sets: [{ /* set do alternativo, done:true, weightKg 50 reps 8 */ } as never],
    },
  }] as never;
  const logged = toCreateWorkoutLogExercises(exercises /*, ...args reais */);
  expect(logged[0].variationId).toBe('va');
});
```

- [ ] **Step 6: Rodar e ver falhar**

Run: `bun run test -- execution-form`
Expected: FAIL — loga `vp` (principal) em vez de `va`.

- [ ] **Step 7: Implementar — selecionar o item ativo no build do log**

No início do map por exercício do builder do log, escolha a fonte ativa:
```typescript
const active = exercise.usingAlternative && exercise.alternative
  ? exercise.alternative
  : exercise;
// use active.variation.id, active.sets, active.aliasId, active.note, active.restSeconds
// (mantenha position/exerciseType/supersetGroupId do exercício principal)
```

- [ ] **Step 8: Rodar e ver passar**

Run: `bun run test -- execution-form`
Expected: PASS.

- [ ] **Step 9: Commit (stage)**

```bash
git add apps/mobile/src/features/workouts/lib/execution-form.ts apps/mobile/src/features/workouts/lib/execution-form.test.ts
```

---

### Task 10: Validação pré-revisão ignora o item não-ativo

**Files:**
- Modify: `apps/mobile/src/features/workouts/lib/workout-mappers.ts` (`listIncompleteStrengthExercises`, ~linhas 172-187)
- Test: `apps/mobile/src/features/workouts/lib/workout-mappers.test.ts` (criar se não existir)

Contexto: `listIncompleteStrengthExercises` marca incompletos por `sets.some(set => !set.done)`. Com alternativo ativo, deve olhar os sets **do item ativo**.

- [ ] **Step 1: Teste falhando**

```typescript
import { test, expect } from '@jest/globals';
import { listIncompleteStrengthExercises } from './workout-mappers';

const t = ((k: string) => k) as never;

test('uses the alternative sets for completeness when usingAlternative is true', () => {
  const exercises = [{
    id: 'p1', exerciseType: 'strength', position: 0, supersetGroupId: 'p1', supersetOrder: 0,
    note: null, restSeconds: null, usingAlternative: true,
    variation: { id: 'vp', slug: null, name: null, exercise: { slug: null, name: 'A' },
      equipment: { slug: 'barbell', preposition: 'com' } },
    sets: [{ done: false }],          // principal incompleto, mas inativo
    alternative: {
      variation: { id: 'va', slug: null, name: null, exercise: { slug: null, name: 'B' },
        equipment: { slug: 'machine', preposition: 'na' } },
      sets: [{ done: true }],         // alternativo completo e ativo
    },
  }] as never;
  expect(listIncompleteStrengthExercises(exercises, t, 'pt')).toHaveLength(0);
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `bun run test -- workout-mappers`
Expected: FAIL — conta o principal (sets inativos) como incompleto.

- [ ] **Step 3: Implementar — olhar os sets do ativo**

Em `listIncompleteStrengthExercises`, troque `exercise.sets.some(...)` por uma leitura do item ativo:
```typescript
    .filter(({ exercise }) => {
      const activeSets =
        exercise.usingAlternative && exercise.alternative
          ? exercise.alternative.sets
          : exercise.sets;
      return exercise.exerciseType === 'strength' && activeSets.some((set) => !set.done);
    })
```
(Ajuste o tipo de `exercises` para incluir os campos `usingAlternative`/`alternative` opcionais.)

- [ ] **Step 4: Rodar e ver passar**

Run: `bun run test -- workout-mappers`
Expected: PASS.

- [ ] **Step 5: Commit (stage)**

```bash
git add apps/mobile/src/features/workouts/lib/workout-mappers.ts apps/mobile/src/features/workouts/lib/workout-mappers.test.ts
```

---

### Task 11: Tipos de item da lista carregam o alternativo

**Files:**
- Modify: `apps/mobile/src/features/workouts/lib/workout-mappers.ts` (`ExerciseExecutionItem`, `SupersetMember`, `MappableExercise`, `toExerciseExecutionItem`, `toExecutionListItems`)
- Test: `apps/mobile/src/features/workouts/lib/workout-mappers.test.ts`

Contexto: as cards precisam saber se um exercício/membro tem alternativo e seu nome, para mostrar o sub-bloco (builder) ou o controle de troca (execução). Os items derivam de `MappableExercise`.

- [ ] **Step 1: Teste falhando — item single expõe descritor `alternative`**

```typescript
import { toExecutionListItems } from './workout-mappers';

test('single item exposes an alternative descriptor when present', () => {
  const exercises = [{
    id: 'p1', exerciseType: 'strength', position: 0, supersetGroupId: 'p1', supersetOrder: 0,
    note: null, restSeconds: null,
    variation: { id: 'vp', slug: null, name: null, exercise: { slug: null, name: 'A' },
      equipment: { slug: 'barbell', preposition: 'com' } },
    alternative: { name: 'B na máquina', variationName: null },
  }] as never;
  const items = toExecutionListItems(exercises, 'strength', ((k: string) => k) as never, 'pt');
  expect(items[0].kind).toBe('single');
  expect((items[0] as never as { alternative: unknown }).alternative).toEqual({
    name: 'B na máquina', variationName: null,
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `bun run test -- workout-mappers`
Expected: FAIL — `alternative` ausente no item.

- [ ] **Step 3: Implementar — propagar um descritor leve**

Acrescente um tipo `AlternativeDescriptor = { name: string; variationName: string | null } | null` e:
- `ExerciseExecutionItem` e `SupersetMember` ganham `alternative: AlternativeDescriptor`.
- `MappableExercise` ganha `alternative?: { variation: MappableExerciseVariation } | null`.
- Em `toExerciseExecutionItem`, compute o nome do alternativo (reutilizando `composeExerciseName`/`resolveExerciseName`/`resolveVariationName` sobre `exercise.alternative.variation`) e devolva `alternative: exercise.alternative ? { name, variationName } : null`.
- `toExecutionListItems` já chama `toExerciseExecutionItem` para singles e membros — o campo flui para ambos.

- [ ] **Step 4: Rodar e ver passar**

Run: `bun run test -- workout-mappers`
Expected: PASS (e os testes existentes continuam verdes).

- [ ] **Step 5: Commit (stage)**

```bash
git add apps/mobile/src/features/workouts/lib/workout-mappers.ts apps/mobile/src/features/workouts/lib/workout-mappers.test.ts
```

---

## Phase 4 — UI do builder

### Task 12: i18n — strings do alternativo

**Files:**
- Modify: `apps/mobile/src/internationalization/locales/pt.ts`, `apps/mobile/src/internationalization/locales/en.ts`

- [ ] **Step 1: Adicionar chaves** (sob a seção `workoutFormScreen`/`workoutExecutionScreen`, conforme a estrutura existente):

pt.ts:
```typescript
alternative: {
  add: 'Adicionar exercício alternativo',
  remove: 'Remover alternativo',
  swap: 'Trocar variação do alternativo',
  label: 'Alternativo',
  use: 'Usar alternativo',
  usePrincipal: 'Voltar ao principal',
},
```
en.ts (mesma chave):
```typescript
alternative: {
  add: 'Add alternative exercise',
  remove: 'Remove alternative',
  swap: 'Swap alternative variation',
  label: 'Alternative',
  use: 'Use alternative',
  usePrincipal: 'Back to main',
},
```

- [ ] **Step 2: Typecheck**

Run: `bun run test -- --listTests >/dev/null` não cobre i18n; rode `cd apps/mobile && bunx tsc --noEmit` (ou `bun run typecheck` na raiz para o app).
Expected: sem erros de chave faltante (en/pt simétricos).

- [ ] **Step 3: Commit (stage)**

```bash
git add apps/mobile/src/internationalization/locales/pt.ts apps/mobile/src/internationalization/locales/en.ts
```

---

### Task 13: Ação de long-press — adicionar/remover alternativo (builder)

**Files:**
- Modify: `apps/mobile/src/app/(stacks)/(workouts)/workoutForm.tsx` (o handler de long-press do item — `editing.handleLongPressItem` / o action sheet que ele abre)

Contexto: o long-press do card chama `editing.handleLongPressItem(item.id)`, que abre um menu de ações (selecionar, etc.). Vamos acrescentar duas ações condicionais para exercícios **single** e para **membros de superset**: "Adicionar alternativo" (se não houver) e "Remover alternativo" (se houver). A ação de adicionar abre o exercise picker e grava em `exercises.${i}.alternative` via `buildBuilderAlternativeFromPicked` (semente = sets atuais do exercício). A de remover seta `alternative` para `null`.

- [ ] **Step 1: Localizar o menu de ações do long-press**

Abra `workoutForm.tsx` e encontre `handleLongPressItem` (vindo de um hook `useExerciseListEditing` ou definido na tela) e o action sheet/menu que ele apresenta. Identifique como uma ação resolve o índice do exercício a partir do `item.id` (o `id` do item da lista = `exercise.id` para single, e para superset o menu age sobre o grupo — aqui a ação precisa do índice do membro; se o menu de superset não expõe membro, adicione a ação no card do membro reutilizando o mesmo handler com o `exercise.id` do membro).

- [ ] **Step 2: Implementar "Adicionar alternativo"**

```typescript
const handleAddAlternative = (exerciseId: string) => {
  const exercises = form.getValues('exercises') ?? [];
  const index = exercises.findIndex((e) => e.id === exerciseId);
  if (index < 0 || exercises[index].alternative) return;
  openExercisePicker({
    onPick: (picked) => {
      if (picked.length === 0) return;
      const current = form.getValues(`exercises.${index}`);
      const alternative = buildBuilderAlternativeFromPicked(
        picked[0],
        current.sets,
        Crypto.randomUUID,
      );
      form.setValue(`exercises.${index}.alternative`, alternative, { shouldDirty: true });
    },
  });
};

const handleRemoveAlternative = (exerciseId: string) => {
  const exercises = form.getValues('exercises') ?? [];
  const index = exercises.findIndex((e) => e.id === exerciseId);
  if (index < 0) return;
  form.setValue(`exercises.${index}.alternative`, null, { shouldDirty: true });
};
```
Acrescente as duas ações ao menu, exibindo "Adicionar" quando `exercise.alternative == null` e "Remover" caso contrário, usando as chaves i18n `workoutFormScreen.alternative.add/remove`.

- [ ] **Step 3: Verificação manual (smoke)**

Run: `bun run start` (ou o fluxo de dev do app), abra um treino em edição, long-press num exercício, escolha "Adicionar exercício alternativo", selecione uma variação. Expected: a ação dispara o picker e, ao escolher, o form fica dirty (o render do sub-bloco vem na Task 14).

- [ ] **Step 4: Commit (stage)**

```bash
git add "apps/mobile/src/app/(stacks)/(workouts)/workoutForm.tsx"
```

---

### Task 14: `AlternativeBuilderBlock` — sub-bloco recolhível

**Files:**
- Create: `apps/mobile/src/features/workouts/components/ExerciseBuilderCard/AlternativeBuilderBlock.tsx`
- Modify: `apps/mobile/src/features/workouts/components/ExerciseBuilderCard/ExerciseBuilderCard.tsx`
- Test: `apps/mobile/src/features/workouts/components/ExerciseBuilderCard/AlternativeBuilderBlock.test.tsx`

Contexto: o bloco lê `exercises.${exerciseIndex}.alternative` via `useWatch`, e edita os sets do alternativo via `useFieldArray({ name: 'exercises.${exerciseIndex}.alternative.sets' })`, reutilizando `BuilderSetRow`/`BuilderSetCells` (mesmos componentes do card principal). Mostra rótulo "Alternativo", nome da variação, e ações de trocar/remover (reusam os handlers da Task 13 via props).

- [ ] **Step 1: Teste falhando — renderiza nome do alternativo e os sets**

```tsx
import { test, expect } from '@jest/globals';
import { render, screen } from '@testing-library/react-native';
import { FormProvider, useForm } from 'react-hook-form';
import { AlternativeBuilderBlock } from './AlternativeBuilderBlock';

function Wrapper() {
  const form = useForm({
    defaultValues: {
      exercises: [{
        id: 'p1', /* ...campos mínimos... */
        sets: [{ id: 'ps', type: 'normal', measurementType: 'weight_reps', roundOrder: 0,
          repsMin: '8', repsMax: '10', duration: '', distance: '', loadPercent: '', linkedSetId: null }],
        alternative: {
          id: 'a1', note: null, restSeconds: null,
          variation: { id: 'va', slug: null, name: 'Variação Alt',
            exercise: { slug: null, name: 'Leg Press', type: 'musculacao' },
            measurementType: 'weight_reps', equipment: { slug: 'machine', preposition: 'na' },
            muscle: { slug: 'quads' }, secondaryMuscle: null },
          sets: [{ id: 'as', type: 'normal', measurementType: 'weight_reps', roundOrder: 0,
            repsMin: '8', repsMax: '10', duration: '', distance: '', loadPercent: '', linkedSetId: null }],
        },
      }],
    },
  });
  return (
    <FormProvider {...form}>
      <AlternativeBuilderBlock exerciseIndex={0} onSwap={() => {}} onRemove={() => {}} />
    </FormProvider>
  );
}

test('renders the alternative label and its set row', () => {
  render(<Wrapper />);
  expect(screen.getByText('workoutFormScreen.alternative.label')).toBeTruthy();
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `bun run test -- AlternativeBuilderBlock`
Expected: FAIL — módulo não existe.

- [ ] **Step 3: Implementar o componente**

Crie `AlternativeBuilderBlock.tsx` espelhando a parte de sets de `ExerciseBuilderCard` (use os mesmos imports `BuilderSetRow`/`BuilderSetCells`, `useFieldArray`, `useWatch`), com o path-base `exercises.${exerciseIndex}.alternative`. Props:
```typescript
interface AlternativeBuilderBlockProps {
  exerciseIndex: number;
  onSwap: () => void;   // reabre o picker e substitui exercises.{i}.alternative
  onRemove: () => void; // seta exercises.{i}.alternative = null
}
```
Estrutura: container recuado/destacado; linha de cabeçalho com `Text` "Alternativo" (`workoutFormScreen.alternative.label`) + nome da variação + botões trocar/remover; abaixo, o `useFieldArray` dos sets do alternativo renderizando `BuilderSetRow` (mesmo padrão das linhas 284-298 de `ExerciseBuilderCard.tsx`, com `name="exercises.${exerciseIndex}.alternative.sets"`). Se `useWatch` do `alternative` for `null`, renderize `null`.

- [ ] **Step 4: Render no `ExerciseBuilderCard`**

Em `ExerciseBuilderCard.tsx`, após o bloco de sets do principal, renderize:
```tsx
{hasAlternative ? (
  <AlternativeBuilderBlock
    exerciseIndex={exerciseIndex}
    onSwap={() => onSwapAlternative?.(/* exercise id */)}
    onRemove={() => onRemoveAlternative?.(/* exercise id */)}
  />
) : null}
```
Acrescente às props do card: `onSwapAlternative?`, `onRemoveAlternative?`, e leia `hasAlternative` via `useWatch({ name: 'exercises.${exerciseIndex}.alternative' }) != null`. Encaminhe esses handlers a partir de `workoutForm.tsx` (renderBuilderCard) usando os handlers da Task 13 (swap = remover+adicionar, ou um `handleSwapAlternative` análogo que substitui sem perguntar 2x).

- [ ] **Step 5: Rodar e ver passar**

Run: `bun run test -- AlternativeBuilderBlock`
Expected: PASS.

- [ ] **Step 6: Commit (stage)**

```bash
git add apps/mobile/src/features/workouts/components/ExerciseBuilderCard/AlternativeBuilderBlock.tsx apps/mobile/src/features/workouts/components/ExerciseBuilderCard/AlternativeBuilderBlock.test.tsx apps/mobile/src/features/workouts/components/ExerciseBuilderCard/ExerciseBuilderCard.tsx
```

---

### Task 15: Bloco do alternativo por membro no `SupersetBuilderCard`

**Files:**
- Modify: `apps/mobile/src/features/workouts/components/SupersetBuilderCard/SupersetBuilderCard.tsx`
- Modify: `apps/mobile/src/app/(stacks)/(workouts)/workoutForm.tsx` (passar os handlers e o exercise index por membro)

Contexto: cada membro do superset é um exercício com seu próprio `exerciseIndex`. O bloco do alternativo aparece sob cada membro, com seu `exercises.${memberIndex}.alternative`.

- [ ] **Step 1: Render por membro**

No `.map(members)` de `SupersetBuilderCard.tsx`, após a área de sets do membro, renderize `<AlternativeBuilderBlock exerciseIndex={member.exerciseIndex} onSwap={...} onRemove={...} />` quando aquele membro tiver alternativo (via `useWatch` no path do membro, ou um campo `member.hasAlternative` propagado pelo mapper).

- [ ] **Step 2: Ação de long-press no membro**

O menu de long-press do superset age no grupo; para o alternativo por membro, exponha a ação no próprio membro (ex.: ícone de "mais" por membro, ou estender o long-press do membro). Reutilize `handleAddAlternative(member.exercise.id)` / `handleRemoveAlternative` da Task 13.

- [ ] **Step 3: Verificação manual (smoke)**

Run: app em dev; crie um superset, adicione alternativo a um membro, confirme que o bloco aparece só naquele membro e que salvar/recarregar preserva (round-trip já coberto pelas tasks de mapper).

- [ ] **Step 4: Commit (stage)**

```bash
git add apps/mobile/src/features/workouts/components/SupersetBuilderCard/SupersetBuilderCard.tsx "apps/mobile/src/app/(stacks)/(workouts)/workoutForm.tsx"
```

---

## Phase 5 — UI de execução

### Task 16: `AlternativeSwapControl` — alternar principal/alternativo

**Files:**
- Create: `apps/mobile/src/features/workouts/components/ExerciseExecutionCard/AlternativeSwapControl.tsx`
- Test: `apps/mobile/src/features/workouts/components/ExerciseExecutionCard/AlternativeSwapControl.test.tsx`

Contexto: controle compartilhado (single e membro). Lê/escreve `exercises.${exerciseIndex}.usingAlternative` via `useController`/`setValue`. Mostra o nome do alvo (alternativo quando no principal; principal quando no alternativo).

- [ ] **Step 1: Teste falhando — toggle inverte `usingAlternative`**

```tsx
import { test, expect } from '@jest/globals';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { FormProvider, useForm } from 'react-hook-form';
import { AlternativeSwapControl } from './AlternativeSwapControl';

function Wrapper({ onState }: { onState: (v: boolean) => void }) {
  const form = useForm({ defaultValues: { exercises: [{ usingAlternative: false }] } });
  return (
    <FormProvider {...form}>
      <AlternativeSwapControl
        exerciseIndex={0}
        principalName="Supino"
        alternativeName="Crossover"
        onChange={(v) => onState(v)}
      />
    </FormProvider>
  );
}

test('toggles to the alternative on press', () => {
  let state = false;
  render(<Wrapper onState={(v) => { state = v; }} />);
  fireEvent.press(screen.getByText('workoutExecutionScreen.alternative.use'));
  expect(state).toBe(true);
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `bun run test -- AlternativeSwapControl`
Expected: FAIL — módulo não existe.

- [ ] **Step 3: Implementar**

```tsx
interface AlternativeSwapControlProps {
  exerciseIndex: number;
  principalName: string;
  alternativeName: string;
  onChange?: (usingAlternative: boolean) => void;
}
```
Use `useController({ name: 'exercises.${exerciseIndex}.usingAlternative' })`. Renderize um `Pressable` cuja label é `t('workoutExecutionScreen.alternative.use')` (+ `alternativeName`) quando `false`, e `t('workoutExecutionScreen.alternative.usePrincipal')` (+ `principalName`) quando `true`. No press: inverte o valor, chama `field.onChange(next)` e `onChange?.(next)`.

- [ ] **Step 4: Rodar e ver passar**

Run: `bun run test -- AlternativeSwapControl`
Expected: PASS.

- [ ] **Step 5: Commit (stage)**

```bash
git add apps/mobile/src/features/workouts/components/ExerciseExecutionCard/AlternativeSwapControl.tsx apps/mobile/src/features/workouts/components/ExerciseExecutionCard/AlternativeSwapControl.test.tsx
```

---

### Task 17: `ExerciseExecutionCard` renderiza o item ativo

**Files:**
- Modify: `apps/mobile/src/features/workouts/components/ExerciseExecutionCard/ExerciseExecutionCard.tsx`
- Modify: `apps/mobile/src/features/workouts/components/ExerciseExecutionList.tsx` (passar `alternative`/nomes para o card)

Contexto: quando o item tem alternativo, o card mostra o `AlternativeSwapControl`. Quando `usingAlternative` é `true`, o nome/variação do header e o set field array passam a apontar para `exercises.${i}.alternative.*`. Os valores digitados ficam separados porque principal e alternativo têm arrays de sets distintos no form.

- [ ] **Step 1: Props e leitura do estado ativo**

Acrescente às props do card: `alternative?: { name: string; variationName: string | null } | null`. Dentro do card, leia `usingAlternative` via `useWatch({ name: 'exercises.${exerciseIndex}.usingAlternative' })`. Defina:
```typescript
const active = usingAlternative;
const setsName = active
  ? `exercises.${exerciseIndex}.alternative.sets`
  : `exercises.${exerciseIndex}.sets`;
const headerName = active ? alternative?.name ?? name : name;
const headerVariation = active ? alternative?.variationName ?? undefined : variationName;
```
Use `setsName` no `useFieldArray` (substitua o name fixo `exercises.${exerciseIndex}.sets`) e `headerName`/`headerVariation` no header. Renderize `<AlternativeSwapControl .../>` quando `alternative != null`, com `principalName={name}` e `alternativeName={alternative.name}`.

- [ ] **Step 2: Passar `alternative` no `ExerciseExecutionList`**

No `renderDefaultCard` (single), passe `alternative={item.alternative}` (o descritor adicionado na Task 11). Nada muda quando `item.alternative == null`.

- [ ] **Step 3: Teste de componente — swap troca a variação exibida**

```tsx
test('shows the alternative variation name after swapping', () => {
  // render ExerciseExecutionCard dentro de FormProvider com um exercício que tem
  // alternative.sets e variação 'Crossover'; press no swap; assert que o header
  // passa a exibir 'Crossover'.
});
```
Run: `bun run test -- ExerciseExecutionCard`
Expected: PASS após a implementação.

- [ ] **Step 4: Verificação manual (smoke)**

Run: app em dev; execute um treino com alternativo; troque; confirme que (a) a variação e os sets mudam, (b) o que foi digitado no principal reaparece ao voltar, (c) o timer de descanso/colunas respeitam o measurement type do ativo.

- [ ] **Step 5: Commit (stage)**

```bash
git add apps/mobile/src/features/workouts/components/ExerciseExecutionCard/ExerciseExecutionCard.tsx apps/mobile/src/features/workouts/components/ExerciseExecutionList.tsx
```

---

### Task 18: `SupersetExecutionCard` — swap por membro

**Files:**
- Modify: `apps/mobile/src/features/workouts/components/SupersetExecutionCard/SupersetExecutionCard.tsx`

Contexto: cada membro alterna independentemente. O `SupersetMemberCell` (sets do membro) precisa apontar para o array ativo daquele membro (`exercises.${member.exerciseIndex}.alternative.sets` quando ativo).

- [ ] **Step 1: Render do controle e troca do path por membro**

No header de cada membro, renderize `<AlternativeSwapControl exerciseIndex={member.exerciseIndex} principalName={member.name} alternativeName={member.alternative.name} />` quando `member.alternative != null`. No `SupersetMemberCell`, derive o `setsName` do membro a partir de `useWatch` em `exercises.${member.exerciseIndex}.usingAlternative`, espelhando a Task 17.

> Nota de rounds: o alternativo de um membro tem seus próprios sets/roundOrder. `buildRounds` opera sobre os sets ativos de cada membro; ao alternar, os rounds daquele membro seguem o array ativo. Garanta que o `setsByMember` passado a `buildRounds` use o array ativo de cada membro.

- [ ] **Step 2: Teste de componente — membro alterna sem afetar os demais**

```tsx
test('swapping member A does not change member B variation', () => {
  // render superset com 2 membros, A com alternativo; press no swap de A;
  // assert que A mostra a variação alternativa e B permanece igual.
});
```
Run: `bun run test -- SupersetExecutionCard`
Expected: PASS.

- [ ] **Step 3: Verificação manual (smoke)**

Run: app em dev; superset com alternativo em um membro; alterne; confirme isolamento entre membros e logging correto (ver Task 19).

- [ ] **Step 4: Commit (stage)**

```bash
git add apps/mobile/src/features/workouts/components/SupersetExecutionCard/SupersetExecutionCard.tsx
```

---

### Task 19: Verificação end-to-end do log

**Files:**
- Verify: fluxo completo (sem mudança de código se as Tasks 9/17/18 estiverem corretas)

- [ ] **Step 1: Round-trip manual**

Run: app em dev. Configure um treino com um exercício + alternativo e um superset com alternativo em um membro. Execute, alterne para o alternativo no exercício single, preencha os sets, finalize e salve.

- [ ] **Step 2: Conferir o log no banco**

Run (psql):
```sql
SELECT wel.variation_id, wel.position
FROM workout_exercise_logs wel
JOIN workout_logs wl ON wl.id = wel.workout_log_id
ORDER BY wl.created_at DESC, wel.position
LIMIT 10;
```
Expected: para o exercício alternado, `variation_id` é o da **variação alternativa**; para os não alternados, o da principal.

- [ ] **Step 3: Suite completa + lint**

Run: `bun run test` (turbo, todos os pacotes) e `bun run check` (biome na raiz).
Expected: tudo verde; sem violações de lint.

- [ ] **Step 4: Commit (stage) — apenas se algo foi ajustado**

```bash
git add -A
```

---

## Self-review (preenchido pelo autor do plano)

- **Cobertura do spec:** schema+índices (T1), upsert/aninhamento/CASCADE (T2), leitura `alternativeOfId` (T3/T4), request `alternative` (T5), seed da prescrição (T6), nesting de carga builder/execução (T7/T9), emissão no save (T8), log do ativo (T9), validação ignora inativo (T10), descritor de item (T11), UI builder single+superset (T13/T14/T15), UI execução single+superset com swap reversível e valores separados (T16/T17/T18), log E2E (T19), i18n (T12). Todos os pontos do spec têm task.
- **Decisões travadas:** alternativo flat na API + aninhado no mobile; FK DEFERRABLE + índice posicional parcial para resolver a colisão de `(workout_id, position, superset_order)`; `usingAlternative` + `alternative` no form de execução com arrays de sets separados (preserva digitação ao alternar).
- **Pontos a confirmar durante a execução (não bloqueiam o plano):** nome real da função builder do payload do log em `execution-form.ts` (T9 Step 5); como `routes.ts` monta o payload de `wt_upsert_workout` (T5 Step 5); nome da variável de iteração no adapter (T4 Step 2); estrutura exata do menu de long-press em `workoutForm.tsx` (T13).
