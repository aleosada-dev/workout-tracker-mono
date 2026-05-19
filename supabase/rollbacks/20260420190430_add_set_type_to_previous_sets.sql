-- Rollback: restore get_previous_workout_sets to the pre-set_type signature
-- (matches 20260324110826_workout_log_soft_delete.sql version).

DROP FUNCTION IF EXISTS public.get_previous_workout_sets(uuid, uuid[]);

CREATE OR REPLACE FUNCTION public.get_previous_workout_sets(
  p_user_id UUID,
  p_variation_ids UUID[]
)
RETURNS TABLE (
  variation_id UUID,
  set_order INT,
  reps INT,
  weight_kg NUMERIC
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT ON (wel.variation_id, wesl.set_order)
    wel.variation_id,
    wesl.set_order,
    wesl.reps,
    wesl.weight_kg
  FROM workout_logs wl
  JOIN workout_exercise_logs wel  ON wel.workout_log_id = wl.id
  JOIN workout_exercise_set_logs wesl ON wesl.workout_exercise_log_id = wel.id
  WHERE wl.user_id = p_user_id
    AND wl.deleted_at IS NULL
    AND wel.variation_id = ANY(p_variation_ids)
  ORDER BY wel.variation_id, wesl.set_order, wl.finished_at DESC;
$$;

GRANT EXECUTE ON FUNCTION public.get_previous_workout_sets(uuid, uuid[]) TO authenticated;
