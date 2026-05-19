-- =============================================================
-- Rollback for 20260415212416_fix_copy_workout_superset_group_id.sql
--
-- Restores copy_workout to the previous behavior from
-- 20260325102849_shared_variations.sql (remapping group_id to the
-- first member's new id).
--
-- Note: this rollback only reverts the function. If the backfill
-- script `supabase/scripts/backfill_superset_group_id.sql` was run
-- separately against this environment, the rewritten
-- `superset_group_id` values are not undone here — there is no
-- deterministic way to recover the old collisions without a
-- pre-run snapshot. Backfilled rows remain valid.
-- =============================================================

CREATE OR REPLACE FUNCTION public.copy_workout(
  p_source_workout_id uuid,
  p_target_user_id uuid
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_coach_id uuid := (SELECT auth.uid());
  v_new_workout_id uuid;
  v_source_workout RECORD;
BEGIN
  IF NOT public.is_active_coach_of(v_coach_id, p_target_user_id) THEN
    RAISE EXCEPTION 'Not authorized to copy workouts for this athlete';
  END IF;

  SELECT * INTO v_source_workout
  FROM public.workouts w
  WHERE w.id = p_source_workout_id
    AND (
      w.user_id = v_coach_id
      OR public.is_active_coach_of(v_coach_id, w.user_id)
    );

  IF v_source_workout IS NULL THEN
    RAISE EXCEPTION 'Source workout not found or access denied';
  END IF;

  v_new_workout_id := gen_random_uuid();

  INSERT INTO public.workouts (
    id,
    user_id,
    name,
    description,
    created_by,
    updated_by
  )
  VALUES (
    v_new_workout_id,
    p_target_user_id,
    v_source_workout.name,
    v_source_workout.description,
    v_coach_id,
    v_coach_id
  );

  DROP TABLE IF EXISTS temp_exercise_mapping;
  CREATE TEMP TABLE temp_exercise_mapping (
    old_id uuid,
    new_id uuid
  );

  INSERT INTO public.workout_exercises (
    id,
    workout_id,
    variation_id,
    note,
    rest_seconds,
    position,
    superset_group_id,
    superset_order
  )
  SELECT
    gen_random_uuid(),
    v_new_workout_id,
    we.variation_id,
    we.note,
    we.rest_seconds,
    we.position,
    we.superset_group_id,  -- temporary: old group id, will be remapped below
    we.superset_order
  FROM public.workout_exercises we
  WHERE we.workout_id = p_source_workout_id
  ORDER BY we.position ASC, we.superset_order ASC;

  INSERT INTO temp_exercise_mapping (old_id, new_id)
  SELECT
    old_we.id,
    new_we.id
  FROM public.workout_exercises old_we
  JOIN public.workout_exercises new_we
    ON old_we.position = new_we.position
    AND old_we.superset_order = new_we.superset_order
  WHERE old_we.workout_id = p_source_workout_id
    AND new_we.workout_id = v_new_workout_id;

  -- Remap superset_group_id: exercises that shared a group in the source
  -- should share a new group in the copy.
  -- Build old_group_id -> new_group_id mapping using the first exercise in each group.
  WITH group_mapping AS (
    SELECT DISTINCT ON (old_we.superset_group_id)
      old_we.superset_group_id AS old_group_id,
      tm.new_id AS new_group_id
    FROM public.workout_exercises old_we
    JOIN temp_exercise_mapping tm ON tm.old_id = old_we.id
    WHERE old_we.workout_id = p_source_workout_id
    ORDER BY old_we.superset_group_id, old_we.superset_order ASC
  )
  UPDATE public.workout_exercises new_we
  SET superset_group_id = gm.new_group_id
  FROM public.workout_exercises old_we
  JOIN temp_exercise_mapping tm ON tm.old_id = old_we.id
  JOIN group_mapping gm ON gm.old_group_id = old_we.superset_group_id
  WHERE new_we.id = tm.new_id
    AND new_we.workout_id = v_new_workout_id;

  DROP TABLE IF EXISTS temp_set_mapping;
  CREATE TEMP TABLE temp_set_mapping (
    old_id uuid,
    new_id uuid,
    exercise_id uuid,
    set_order int,
    set_type text
  );

  INSERT INTO public.workout_sets (
    id,
    workout_exercise_id,
    set_order,
    set_type,
    reps_min,
    reps_max,
    linked_set_id,
    load_percent_of_previous
  )
  SELECT
    gen_random_uuid(),
    tm.new_id,
    ws.set_order,
    ws.set_type,
    ws.reps_min,
    ws.reps_max,
    NULL::uuid,
    ws.load_percent_of_previous
  FROM public.workout_sets ws
  JOIN temp_exercise_mapping tm ON ws.workout_exercise_id = tm.old_id;

  INSERT INTO temp_set_mapping (old_id, new_id, exercise_id, set_order, set_type)
  SELECT
    old_ws.id,
    new_ws.id,
    new_ws.workout_exercise_id,
    new_ws.set_order,
    new_ws.set_type
  FROM public.workout_sets old_ws
  JOIN temp_exercise_mapping tm ON old_ws.workout_exercise_id = tm.old_id
  JOIN public.workout_sets new_ws
    ON new_ws.workout_exercise_id = tm.new_id
    AND new_ws.set_order = old_ws.set_order;

  UPDATE public.workout_sets ws
  SET linked_set_id = prev_set.new_id
  FROM temp_set_mapping curr_set
  JOIN temp_set_mapping prev_set
    ON curr_set.exercise_id = prev_set.exercise_id
    AND curr_set.set_order = prev_set.set_order + 1
  WHERE ws.id = curr_set.new_id
    AND curr_set.set_type IN ('drop', 'cluster');

  -- Copy preparatory exercises
  DROP TABLE IF EXISTS temp_prep_exercise_mapping;
  CREATE TEMP TABLE temp_prep_exercise_mapping (
    old_id uuid,
    new_id uuid
  );

  INSERT INTO public.workout_preparatory_exercises (
    id,
    workout_id,
    variation_id,
    "position",
    duration_type,
    note
  )
  SELECT
    gen_random_uuid(),
    v_new_workout_id,
    wpe.variation_id,
    wpe.position,
    wpe.duration_type,
    wpe.note
  FROM public.workout_preparatory_exercises wpe
  WHERE wpe.workout_id = p_source_workout_id
  ORDER BY wpe.position ASC;

  INSERT INTO temp_prep_exercise_mapping (old_id, new_id)
  SELECT
    old_wpe.id,
    new_wpe.id
  FROM public.workout_preparatory_exercises old_wpe
  JOIN public.workout_preparatory_exercises new_wpe
    ON old_wpe.position = new_wpe.position
  WHERE old_wpe.workout_id = p_source_workout_id
    AND new_wpe.workout_id = v_new_workout_id;

  INSERT INTO public.workout_preparatory_sets (
    id,
    workout_preparatory_exercise_id,
    set_order,
    duration_seconds,
    reps
  )
  SELECT
    gen_random_uuid(),
    tpm.new_id,
    wps.set_order,
    wps.duration_seconds,
    wps.reps
  FROM public.workout_preparatory_sets wps
  JOIN temp_prep_exercise_mapping tpm ON wps.workout_preparatory_exercise_id = tpm.old_id;

  -- =========================================================
  -- Auto-share coach variations with athlete
  -- =========================================================
  INSERT INTO public.shared_variations (variation_id, owner_id, shared_with_id)
  SELECT DISTINCT v.id, v.user_id, p_target_user_id
  FROM public.workout_exercises we
  JOIN public.variations v ON v.id = we.variation_id
  WHERE we.workout_id = v_new_workout_id
    AND v.user_id IS NOT NULL
    AND v.user_id != p_target_user_id
  ON CONFLICT (variation_id, shared_with_id) DO NOTHING;

  INSERT INTO public.shared_variations (variation_id, owner_id, shared_with_id)
  SELECT DISTINCT v.id, v.user_id, p_target_user_id
  FROM public.workout_preparatory_exercises wpe
  JOIN public.variations v ON v.id = wpe.variation_id
  WHERE wpe.workout_id = v_new_workout_id
    AND v.user_id IS NOT NULL
    AND v.user_id != p_target_user_id
  ON CONFLICT (variation_id, shared_with_id) DO NOTHING;

  RETURN v_new_workout_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.copy_workout(uuid, uuid) TO authenticated;
