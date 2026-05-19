-- Rollback: restore previous get_variation_history from migration
-- 20260409133707_limit_variation_history.sql (TABLE return, no metadata,
-- no authorization guard).

DROP FUNCTION IF EXISTS public.get_variation_history(uuid, uuid);

CREATE OR REPLACE FUNCTION public.get_variation_history(
  p_user_id uuid,
  p_variation_id uuid
)
RETURNS TABLE(
  workout_log_id uuid,
  started_at timestamptz,
  max_weight_kg numeric,
  total_volume_kg numeric,
  max_reps integer,
  total_sets integer,
  sets jsonb
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    sub.workout_log_id,
    sub.started_at,
    sub.max_weight_kg,
    sub.total_volume_kg,
    sub.max_reps,
    sub.total_sets,
    sub.sets
  FROM (
    SELECT
      wl.id AS workout_log_id,
      wl.started_at,
      MAX(wesl.weight_kg) FILTER (WHERE wesl.set_type <> 'warmup') AS max_weight_kg,
      COALESCE(SUM(wesl.weight_kg * wesl.reps) FILTER (WHERE wesl.set_type <> 'warmup'), 0) AS total_volume_kg,
      MAX(wesl.reps) FILTER (WHERE wesl.set_type <> 'warmup') AS max_reps,
      COUNT(*) FILTER (WHERE wesl.set_type <> 'warmup')::integer AS total_sets,
      jsonb_agg(
        jsonb_build_object(
          'set_order', wesl.set_order,
          'set_type', wesl.set_type,
          'weight_kg', wesl.weight_kg,
          'reps', wesl.reps,
          'reps_min', wesl.reps_min,
          'reps_max', wesl.reps_max
        ) ORDER BY wesl.set_order
      ) AS sets
    FROM public.workout_logs wl
    JOIN public.workout_exercise_logs wel ON wel.workout_log_id = wl.id
    JOIN public.workout_exercise_set_logs wesl ON wesl.workout_exercise_log_id = wel.id
    WHERE wl.user_id = p_user_id
      AND wel.variation_id = p_variation_id
      AND wl.deleted_at IS NULL
    GROUP BY wl.id, wl.started_at
    ORDER BY wl.started_at DESC
    LIMIT 10
  ) sub
  ORDER BY sub.started_at ASC;
$$;
