# Objetos de compatibilidade com o legado (PWA)

Contexto: a migração `supabase/migrations/20260531120000_unify_exercise_measurement_type.sql`
unificou os exercícios de treino em `workout_exercises` / `workout_sets`
(eixos `exercise_type` + `measurement_type`). Para a **PWA legada**
(`~/development/workout-tracker`) continuar funcionando — ela acessa o template
de treino só via RPC (`get_workout`, `upsert_workout`, `copy_workout`,
`list_workouts_with_summary`, `search_workouts`) — as antigas tabelas de
template preparatório foram recriadas como **views atualizáveis + triggers
`INSTEAD OF`**.

Este documento lista o que existe **somente** para essa compatibilidade e que
pode ser **removido quando o legado for desligado**.

> Como confirmar que o legado parou: nenhum app além do mobile (que usa só
> `wt_*` e o `get_workout` unificado) deve ler/gravar nos nomes
> `workout_preparatory_*`.

---

## 1. Views de compatibilidade (descartáveis)

| Objeto | Tipo | Sobre |
|---|---|---|
| `public.workout_preparatory_exercises` | VIEW | Espelha `workout_exercises WHERE exercise_type = 'preparatory'`; reconstrói `duration_type` a partir do 1º set. |
| `public.workout_preparatory_sets` | VIEW | Espelha `workout_sets` dos exercícios preparatórios (`reps_min` → `reps`). |

## 2. Funções de trigger das views (descartáveis)

| Função | View | Operação |
|---|---|---|
| `public.wt_prep_exercises_view_insert()` | `workout_preparatory_exercises` | INSTEAD OF INSERT |
| `public.wt_prep_exercises_view_update()` | `workout_preparatory_exercises` | INSTEAD OF UPDATE |
| `public.wt_prep_exercises_view_delete()` | `workout_preparatory_exercises` | INSTEAD OF DELETE |
| `public.wt_prep_sets_view_insert()` | `workout_preparatory_sets` | INSTEAD OF INSERT |
| `public.wt_prep_sets_view_update()` | `workout_preparatory_sets` | INSTEAD OF UPDATE |
| `public.wt_prep_sets_view_delete()` | `workout_preparatory_sets` | INSTEAD OF DELETE |

## 3. Triggers nas views (caem junto com as views via `CASCADE`)

`wt_prep_exercises_view_insert_trg`, `wt_prep_exercises_view_update_trg`,
`wt_prep_exercises_view_delete_trg`, `wt_prep_sets_view_insert_trg`,
`wt_prep_sets_view_update_trg`, `wt_prep_sets_view_delete_trg`.

## 4. Grants das views

`GRANT ... ON public.workout_preparatory_exercises` e
`... ON public.workout_preparatory_sets` (para `anon`, `authenticated`,
`service_role`) — somem com o `DROP VIEW`.

---

## O que NÃO é descartável (faz parte do modelo novo, fica)

- Colunas `workout_exercises.exercise_type`, `workout_sets.measurement_type`,
  `workout_sets.duration_seconds` e seus CHECKs / índice único.
- Os filtros `exercise_type = 'strength'` adicionados em `get_workout`,
  `copy_workout`, `wt_copy_workouts`, `list_workouts_with_summary`,
  `search_workouts` — continuam válidos sem o legado (apenas separam os blocos).
  Ao desligar o legado, dá para *simplificar* essas RPCs (ex.: o `get_workout`
  poderia parar de emitir o array `preparatory_exercises` no formato antigo),
  mas isso é refactor opcional, não remoção obrigatória.

## Pendência relacionada (não é compat, é dívida)

As tabelas de **log** preparatório (`workout_preparatory_exercise_logs`,
`workout_preparatory_set_logs`) **não** foram tocadas pela migração — seguem
como tabelas reais e legadas. A unificação dos logs é uma migração futura
separada (exige tornar ~11 funções de histórico/records `exercise_type`-aware).
Quando o legado for desligado, elas entram nesse mesmo esforço de unificação,
não neste teardown.

---

## Script de teardown (quando o legado for desligado)

```sql
-- Remove a camada de compatibilidade do template preparatório.
-- Pré-requisito: nenhum cliente além do mobile usa os nomes workout_preparatory_*.

DROP VIEW IF EXISTS public.workout_preparatory_sets CASCADE;       -- derruba os 3 triggers de sets
DROP VIEW IF EXISTS public.workout_preparatory_exercises CASCADE;  -- derruba os 3 triggers de exercícios

DROP FUNCTION IF EXISTS public.wt_prep_exercises_view_insert() CASCADE;
DROP FUNCTION IF EXISTS public.wt_prep_exercises_view_update() CASCADE;
DROP FUNCTION IF EXISTS public.wt_prep_exercises_view_delete() CASCADE;
DROP FUNCTION IF EXISTS public.wt_prep_sets_view_insert() CASCADE;
DROP FUNCTION IF EXISTS public.wt_prep_sets_view_update() CASCADE;
DROP FUNCTION IF EXISTS public.wt_prep_sets_view_delete() CASCADE;
```
