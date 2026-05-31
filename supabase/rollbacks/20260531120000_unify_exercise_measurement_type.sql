-- Rollback for 20260531120000_unify_exercise_measurement_type.sql
--
-- ATENÇÃO: rollback parcialmente manual. Reverte schema/views e move os dados
-- preparatórios de TEMPLATE de volta para tabelas recriadas. As tabelas de log
-- não foram tocadas pela migração, então não aparecem aqui.
--
-- As DEFINIÇÕES COMPLETAS das tabelas workout_preparatory_exercises /
-- workout_preparatory_sets (índices, RLS, triggers) e dos 5 RPCs alterados
-- (get_workout, copy_workout, wt_copy_workouts, list_workouts_with_summary,
-- search_workouts) devem ser restauradas a partir do baseline
-- (20260516000000_baseline.sql) e de 20260525105936_workouts_improvements.sql.
--
-- Pré-requisito: nenhuma linha strength pode ter reps_min/reps_max NULL
-- (nenhum exercício de musculação por duração criado pós-migração), senão o
-- ALTER ... SET NOT NULL abaixo falha.

-- 1) Derrubar as views de compatibilidade e seus triggers/funções.
DROP VIEW IF EXISTS public.workout_preparatory_sets CASCADE;
DROP VIEW IF EXISTS public.workout_preparatory_exercises CASCADE;

DROP FUNCTION IF EXISTS public.wt_prep_exercises_view_insert() CASCADE;
DROP FUNCTION IF EXISTS public.wt_prep_exercises_view_update() CASCADE;
DROP FUNCTION IF EXISTS public.wt_prep_exercises_view_delete() CASCADE;
DROP FUNCTION IF EXISTS public.wt_prep_sets_view_insert() CASCADE;
DROP FUNCTION IF EXISTS public.wt_prep_sets_view_update() CASCADE;
DROP FUNCTION IF EXISTS public.wt_prep_sets_view_delete() CASCADE;

-- 2) Recriar as tabelas de template a partir do baseline.
--    >>> Cole aqui o DDL completo de workout_preparatory_exercises e
--    >>> workout_preparatory_sets (CREATE TABLE + índices + RLS + triggers)
--    >>> de 20260516000000_baseline.sql. <<<

-- 3) Mover os dados preparatórios de volta (após recriar as tabelas acima).
INSERT INTO public.workout_preparatory_exercises (id, workout_id, variation_id, "position", duration_type, note, created_at, updated_at)
SELECT we.id, we.workout_id, we.variation_id, we.position,
       COALESCE((
         SELECT CASE WHEN ws.measurement_type = 'reps' THEN 'reps' ELSE 'time' END
         FROM public.workout_sets ws
         WHERE ws.workout_exercise_id = we.id
         ORDER BY ws.set_order ASC, ws.id ASC LIMIT 1
       ), 'time'),
       we.note, we.created_at, we.updated_at
FROM public.workout_exercises we WHERE we.exercise_type = 'preparatory';

INSERT INTO public.workout_preparatory_sets (id, workout_preparatory_exercise_id, set_order, duration_seconds, reps, created_at, updated_at)
SELECT ws.id, ws.workout_exercise_id, ws.set_order, ws.duration_seconds, ws.reps_min, ws.created_at, ws.updated_at
FROM public.workout_sets ws
JOIN public.workout_exercises we ON we.id = ws.workout_exercise_id
WHERE we.exercise_type = 'preparatory';

-- 4) Remover as linhas preparatórias da tabela unificada (cascata limpa os sets).
DELETE FROM public.workout_exercises WHERE exercise_type = 'preparatory';

-- 5) Reverter o schema das tabelas de template.
ALTER TABLE public.workout_sets
  DROP CONSTRAINT IF EXISTS workout_sets_dimensions_present,
  DROP CONSTRAINT IF EXISTS workout_sets_duration_positive,
  DROP CONSTRAINT IF EXISTS workout_sets_measurement_type_check,
  DROP COLUMN IF EXISTS measurement_type,
  DROP COLUMN IF EXISTS duration_seconds;
ALTER TABLE public.workout_sets ALTER COLUMN set_type SET NOT NULL;
ALTER TABLE public.workout_sets ALTER COLUMN reps_max SET NOT NULL;
ALTER TABLE public.workout_sets ALTER COLUMN reps_min SET NOT NULL;

DROP INDEX IF EXISTS public.workout_exercises_workout_type_position_superset_uidx;
CREATE UNIQUE INDEX workout_exercises_workout_position_superset_uidx
  ON public.workout_exercises (workout_id, "position", superset_order);

ALTER TABLE public.workout_exercises
  DROP CONSTRAINT IF EXISTS workout_exercises_exercise_type_check,
  DROP COLUMN IF EXISTS exercise_type;

-- 6) Restaurar get_workout, copy_workout, wt_copy_workouts,
--    list_workouts_with_summary, search_workouts a partir dos migrations
--    baseline / workouts_improvements.
