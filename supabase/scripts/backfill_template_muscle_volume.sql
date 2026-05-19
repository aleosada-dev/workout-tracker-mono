-- Rebuild templateMuscleVolume inside workout_log_summaries.summary_snapshot
-- to include secondary muscle contributions.
--
-- Only updates summaries linked to a workout template (wl.workout_id IS NOT NULL).
-- Recalculates both templateSets and executedSets counting primary + secondary muscles,
-- excluding warmup sets from both counts.
--
-- Usage: psql "$DATABASE_URL" -f supabase/scripts/backfill_template_muscle_volume.sql

DO $$
DECLARE
  target_user_id uuid := '1b387199-dece-4535-98b1-c69f6b797a9a';  -- SET USER ID HERE
BEGIN

-- Step 1: Pre-compute template sets per workout × muscle (from current workout template)
DROP TABLE IF EXISTS tmp_template_muscle;
CREATE TEMP TABLE tmp_template_muscle AS
SELECT
  workout_id,
  muscle_id,
  muscle_name,
  SUM(template_sets)::integer AS template_sets
FROM (
  -- Primary muscle
  SELECT
    we.workout_id,
    v.muscle_id,
    m.name AS muscle_name,
    COUNT(*)::integer AS template_sets
  FROM public.workout_sets ws
  JOIN public.workout_exercises we ON we.id = ws.workout_exercise_id
  JOIN public.variations v ON v.id = we.variation_id
  JOIN public.muscles m ON m.id = v.muscle_id
  WHERE ws.set_type <> 'warmup'
  GROUP BY we.workout_id, v.muscle_id, m.name

  UNION ALL

  -- Secondary muscle
  SELECT
    we.workout_id,
    v.secondary_muscle_id AS muscle_id,
    sm.name AS muscle_name,
    COUNT(*)::integer AS template_sets
  FROM public.workout_sets ws
  JOIN public.workout_exercises we ON we.id = ws.workout_exercise_id
  JOIN public.variations v ON v.id = we.variation_id
  JOIN public.muscles sm ON sm.id = v.secondary_muscle_id
  WHERE ws.set_type <> 'warmup'
    AND v.secondary_muscle_id IS NOT NULL
  GROUP BY we.workout_id, v.secondary_muscle_id, sm.name
) combined
GROUP BY workout_id, muscle_id, muscle_name;

-- Step 2: Pre-compute executed sets per workout_log × muscle
DROP TABLE IF EXISTS tmp_executed_muscle;
CREATE TEMP TABLE tmp_executed_muscle AS
SELECT
  workout_log_id,
  muscle_id,
  SUM(set_count)::integer AS executed_sets
FROM (
  -- Primary muscle
  SELECT
    wel.workout_log_id,
    v.muscle_id,
    COUNT(*)::integer AS set_count
  FROM public.workout_exercise_set_logs wesl
  JOIN public.workout_exercise_logs wel ON wel.id = wesl.workout_exercise_log_id
  JOIN public.workout_logs wl ON wl.id = wel.workout_log_id
  JOIN public.variations v ON v.id = wel.variation_id
  WHERE wesl.set_type <> 'warmup'
    AND wl.user_id = target_user_id
    AND wl.workout_id IS NOT NULL
    AND wl.deleted_at IS NULL
  GROUP BY wel.workout_log_id, v.muscle_id

  UNION ALL

  -- Secondary muscle
  SELECT
    wel.workout_log_id,
    v.secondary_muscle_id AS muscle_id,
    COUNT(*)::integer AS set_count
  FROM public.workout_exercise_set_logs wesl
  JOIN public.workout_exercise_logs wel ON wel.id = wesl.workout_exercise_log_id
  JOIN public.workout_logs wl ON wl.id = wel.workout_log_id
  JOIN public.variations v ON v.id = wel.variation_id
  WHERE wesl.set_type <> 'warmup'
    AND v.secondary_muscle_id IS NOT NULL
    AND wl.user_id = target_user_id
    AND wl.workout_id IS NOT NULL
    AND wl.deleted_at IS NULL
  GROUP BY wel.workout_log_id, v.secondary_muscle_id
) sub
GROUP BY workout_log_id, muscle_id;

-- Step 3: Build the final JSONB per workout_log and update summaries
DROP TABLE IF EXISTS tmp_snapshot_values;
CREATE TEMP TABLE tmp_snapshot_values AS
SELECT
  wl.id AS workout_log_id,
  jsonb_agg(
    jsonb_build_object(
      'muscleId',     tt.muscle_id::text,
      'muscleName',   tt.muscle_name,
      'templateSets', tt.template_sets,
      'executedSets', COALESCE(te.executed_sets, 0)
    )
  ) AS template_muscle_volume
FROM public.workout_logs wl
JOIN tmp_template_muscle tt ON tt.workout_id = wl.workout_id
LEFT JOIN tmp_executed_muscle te
  ON te.workout_log_id = wl.id
  AND te.muscle_id = tt.muscle_id
WHERE wl.user_id = target_user_id
  AND wl.workout_id IS NOT NULL
  AND wl.deleted_at IS NULL
GROUP BY wl.id;

UPDATE public.workout_log_summaries wls
SET summary_snapshot = jsonb_set(
  wls.summary_snapshot,
  '{templateMuscleVolume}',
  sv.template_muscle_volume
)
FROM tmp_snapshot_values sv
WHERE wls.workout_log_id = sv.workout_log_id;

-- Cleanup
DROP TABLE IF EXISTS tmp_template_muscle;
DROP TABLE IF EXISTS tmp_executed_muscle;
DROP TABLE IF EXISTS tmp_snapshot_values;

END $$;
