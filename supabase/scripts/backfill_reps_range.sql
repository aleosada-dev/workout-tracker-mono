-- Backfill reps_min/reps_max on existing workout_exercise_set_logs
-- from the workout template (workout_sets) when available.
--
-- Logic: match set logs to template sets by variation + set_type + set_order rank.
-- Only updates rows where reps_min IS NULL (not yet backfilled).
--
-- Usage: psql "$DATABASE_URL" -f supabase/scripts/backfill_reps_range.sql

DO $$
BEGIN

WITH ranked_template AS (
  SELECT
    we.workout_id,
    we.variation_id,
    ws.set_type,
    ws.reps_min,
    ws.reps_max,
    ROW_NUMBER() OVER (
      PARTITION BY we.workout_id, we.variation_id, ws.set_type
      ORDER BY ws.set_order
    ) AS type_rank
  FROM public.workout_sets ws
  JOIN public.workout_exercises we ON we.id = ws.workout_exercise_id
),
ranked_logs AS (
  SELECT
    wesl.id AS set_log_id,
    wl.workout_id,
    wel.variation_id,
    wesl.set_type,
    ROW_NUMBER() OVER (
      PARTITION BY wl.id, wel.variation_id, wesl.set_type
      ORDER BY wesl.set_order
    ) AS type_rank
  FROM public.workout_exercise_set_logs wesl
  JOIN public.workout_exercise_logs wel ON wel.id = wesl.workout_exercise_log_id
  JOIN public.workout_logs wl ON wl.id = wel.workout_log_id
  WHERE wesl.reps_min IS NULL
    AND wl.workout_id IS NOT NULL
    AND wl.deleted_at IS NULL
)
UPDATE public.workout_exercise_set_logs wesl
SET
  reps_min = rt.reps_min,
  reps_max = rt.reps_max
FROM ranked_logs rl
JOIN ranked_template rt
  ON rt.workout_id = rl.workout_id
  AND rt.variation_id = rl.variation_id
  AND rt.set_type = rl.set_type
  AND rt.type_rank = rl.type_rank
WHERE wesl.id = rl.set_log_id;

END $$;
