-- ============================================================================
-- Corrige insert_workout_log_with_summary (RPC de finalização do PWA legado).
--
-- A migration de aliases (20260605120000) trocou o índice único de
-- workout_variation_records de (user_id, variation_id) para
-- (user_id, variation_id, alias_id) NULLS NOT DISTINCT, e atualizou
-- recalculate_variation_records / wt_recalculate_variation_records — mas esta
-- função ficou para trás, ainda com ON CONFLICT (user_id, variation_id). Isso
-- quebra o finish de treino no PWA com 42P10 (there is no unique or exclusion
-- constraint matching the ON CONFLICT specification).
--
-- O PWA não conhece aliases: o INSERT não informa alias_id (default NULL), então
-- o conflito casa a linha de PR geral (alias_id IS NULL) via NULLS NOT DISTINCT.
-- Só o ON CONFLICT muda; o resto do corpo é idêntico à definição do baseline.
-- ============================================================================
CREATE OR REPLACE FUNCTION "public"."insert_workout_log_with_summary"("payload" "jsonb", "summary_snapshot" "jsonb") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_log_id UUID;
  v_user_id UUID;
  v_summary_snapshot JSONB;
  v_actor_id UUID := (SELECT auth.uid());
BEGIN
  v_user_id := (payload->>'userId')::UUID;
  v_summary_snapshot := COALESCE(summary_snapshot, '{}'::jsonb);

  IF jsonb_typeof(v_summary_snapshot) <> 'object' THEN
    RAISE EXCEPTION 'summary_snapshot must be a JSON object';
  END IF;

  IF v_user_id <> v_actor_id
    AND NOT public.is_active_coach_of(v_actor_id, v_user_id) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  INSERT INTO public.workout_logs (
    workout_id, user_id, started_by, started_at, finished_at, note,
    coach_session_id, is_coached
  )
  VALUES (
    NULLIF(payload->>'workoutId', '')::UUID,
    v_user_id,
    v_actor_id,
    (payload->>'startedAt')::TIMESTAMPTZ,
    (payload->>'finishedAt')::TIMESTAMPTZ,
    NULLIF(TRIM(payload->>'note'), ''),
    NULLIF(payload->>'coachSessionId', '')::UUID,
    COALESCE((payload->>'isCoached')::BOOLEAN, FALSE)
  )
  RETURNING id INTO v_log_id;

  IF NULLIF(payload->>'coachSessionId', '') IS NOT NULL THEN
    UPDATE public.coach_sessions
    SET workout_log_id = v_log_id, status = 'completed'
    WHERE id = (payload->>'coachSessionId')::UUID;
  END IF;

  DROP TABLE IF EXISTS temp_exercises;
  CREATE TEMP TABLE temp_exercises AS
  SELECT
    ex.ordinality::INTEGER AS exercise_idx,
    (ex.value->>'variationId')::uuid AS variation_id,
    (ex.value->>'position')::INTEGER AS position,
    NULLIF(TRIM(ex.value->>'note'), '') AS note,
    NULLIF(ex.value->>'restSeconds', '')::INTEGER AS rest_seconds,
    (ex.value->>'supersetGroupId')::uuid AS superset_group_id,
    ex.value AS raw_ex
  FROM jsonb_array_elements(payload->'exercises') WITH ORDINALITY AS ex(value, ordinality);

  IF EXISTS (SELECT 1 FROM temp_exercises WHERE variation_id IS NULL) THEN
    RAISE EXCEPTION 'exercise variationId required';
  END IF;

  IF EXISTS (
    SELECT 1 FROM temp_exercises te
    WHERE NOT EXISTS (
      SELECT 1 FROM public.variations v WHERE v.id = te.variation_id
    )
  ) THEN
    RAISE EXCEPTION 'invalid variation_id';
  END IF;

  DROP TABLE IF EXISTS temp_sets;
  CREATE TEMP TABLE temp_sets AS
  SELECT
    te.exercise_idx, te.variation_id, te.position,
    (s->>'setOrder')::INTEGER AS set_order,
    s->>'setType' AS set_type,
    (s->>'weightKg')::NUMERIC(8,2) AS weight_kg,
    (s->>'reps')::INTEGER AS reps,
    (s->>'repsMin')::INTEGER AS reps_min,
    (s->>'repsMax')::INTEGER AS reps_max
  FROM temp_exercises te
  CROSS JOIN LATERAL jsonb_array_elements(te.raw_ex->'sets') s;

  IF EXISTS (
    SELECT 1 FROM temp_sets
    WHERE set_type IS NULL OR set_type NOT IN ('warmup', 'normal', 'drop', 'cluster')
  ) THEN
    RAISE EXCEPTION 'invalid set_type';
  END IF;

  IF EXISTS (SELECT 1 FROM temp_sets WHERE reps IS NOT NULL AND reps <= 0) THEN
    RAISE EXCEPTION 'reps must be > 0';
  END IF;

  INSERT INTO public.workout_exercise_logs (
    workout_log_id, variation_id, position, note, rest_seconds, superset_group_id
  )
  SELECT
    v_log_id, te.variation_id, te.position, te.note, te.rest_seconds, te.superset_group_id
  FROM temp_exercises te
  ORDER BY te.exercise_idx;

  UPDATE public.workout_exercise_logs wel
  SET exercise_name = e.name,
      variation_name = v.name
  FROM public.variations v
  JOIN public.exercises e ON e.id = v.exercise_id
  WHERE wel.workout_log_id = v_log_id
    AND wel.variation_id = v.id
    AND wel.exercise_name IS NULL;

  INSERT INTO public.workout_exercise_set_logs (
    workout_exercise_log_id, set_order, set_type, weight_kg, reps, reps_min, reps_max
  )
  SELECT
    wel.id, ts.set_order, ts.set_type, ts.weight_kg, ts.reps, ts.reps_min, ts.reps_max
  FROM temp_sets ts
  JOIN public.workout_exercise_logs wel
    ON wel.workout_log_id = v_log_id
   AND wel.variation_id = ts.variation_id
   AND wel.position = ts.position
  ORDER BY ts.exercise_idx, ts.set_order;

  DROP TABLE IF EXISTS temp_prep_exercises;
  CREATE TEMP TABLE temp_prep_exercises AS
  SELECT
    pe.ordinality::INTEGER AS exercise_idx,
    (pe.value->>'variationId')::uuid AS variation_id,
    (pe.value->>'position')::INTEGER AS position,
    pe.value->>'durationType' AS duration_type,
    NULLIF(TRIM(pe.value->>'note'), '') AS note,
    pe.value AS raw_pe
  FROM jsonb_array_elements(
    COALESCE(payload->'preparatoryExerciseLogs', '[]'::jsonb)
  ) WITH ORDINALITY AS pe(value, ordinality);

  INSERT INTO public.workout_preparatory_exercise_logs (
    workout_log_id, variation_id, "position", duration_type, note
  )
  SELECT
    v_log_id, tpe.variation_id, tpe.position, tpe.duration_type, tpe.note
  FROM temp_prep_exercises tpe
  ORDER BY tpe.exercise_idx;

  UPDATE public.workout_preparatory_exercise_logs wpel
  SET exercise_name = e.name,
      variation_name = v.name
  FROM public.variations v
  JOIN public.exercises e ON e.id = v.exercise_id
  WHERE wpel.workout_log_id = v_log_id
    AND wpel.variation_id = v.id
    AND wpel.exercise_name IS NULL;

  INSERT INTO public.workout_preparatory_set_logs (
    workout_preparatory_exercise_log_id, set_order, duration_seconds, reps
  )
  SELECT
    wpel.id,
    (s->>'setOrder')::INTEGER,
    (s->>'durationSeconds')::INTEGER,
    (s->>'reps')::INTEGER
  FROM temp_prep_exercises tpe
  CROSS JOIN LATERAL jsonb_array_elements(
    COALESCE(tpe.raw_pe->'setLogs', '[]'::jsonb)
  ) s
  JOIN public.workout_preparatory_exercise_logs wpel
    ON wpel.workout_log_id = v_log_id
   AND wpel.variation_id = tpe.variation_id
   AND wpel.position = tpe.position
  ORDER BY tpe.exercise_idx, (s->>'setOrder')::INTEGER;

  DROP TABLE IF EXISTS temp_variation_metrics;
  CREATE TEMP TABLE temp_variation_metrics AS
  SELECT
    variation_id,
    MAX(weight_kg) AS max_weight_kg,
    COALESCE(SUM(COALESCE(weight_kg, 0) * COALESCE(reps, 0)), 0)::NUMERIC(10,2) AS max_volume_kg,
    MAX(reps) AS max_reps,
    COUNT(*)::INTEGER AS max_sets
  FROM temp_sets
  GROUP BY variation_id;

  INSERT INTO public.workout_variation_records (
    user_id, variation_id, max_weight_kg, max_volume_kg, max_reps, max_sets
  )
  SELECT
    v_user_id, tvm.variation_id, tvm.max_weight_kg, tvm.max_volume_kg, tvm.max_reps, tvm.max_sets
  FROM temp_variation_metrics tvm
  ON CONFLICT (user_id, variation_id, alias_id)
  DO UPDATE SET
    max_weight_kg = CASE
      WHEN workout_variation_records.max_weight_kg IS NULL THEN EXCLUDED.max_weight_kg
      WHEN EXCLUDED.max_weight_kg IS NULL THEN workout_variation_records.max_weight_kg
      ELSE GREATEST(workout_variation_records.max_weight_kg, EXCLUDED.max_weight_kg)
    END,
    max_volume_kg = CASE
      WHEN workout_variation_records.max_volume_kg IS NULL THEN EXCLUDED.max_volume_kg
      WHEN EXCLUDED.max_volume_kg IS NULL THEN workout_variation_records.max_volume_kg
      ELSE GREATEST(workout_variation_records.max_volume_kg, EXCLUDED.max_volume_kg)
    END,
    max_reps = CASE
      WHEN workout_variation_records.max_reps IS NULL THEN EXCLUDED.max_reps
      WHEN EXCLUDED.max_reps IS NULL THEN workout_variation_records.max_reps
      ELSE GREATEST(workout_variation_records.max_reps, EXCLUDED.max_reps)
    END,
    max_sets = CASE
      WHEN workout_variation_records.max_sets IS NULL THEN EXCLUDED.max_sets
      WHEN EXCLUDED.max_sets IS NULL THEN workout_variation_records.max_sets
      ELSE GREATEST(workout_variation_records.max_sets, EXCLUDED.max_sets)
    END;

  v_summary_snapshot := jsonb_set(
    v_summary_snapshot,
    '{workoutLogId}',
    to_jsonb(v_log_id::text),
    true
  );

  INSERT INTO public.workout_log_summaries (
    workout_log_id, user_id, summary_snapshot
  )
  VALUES (
    v_log_id, v_user_id, v_summary_snapshot
  );

  RETURN v_log_id;
END;
$$;

ALTER FUNCTION "public"."insert_workout_log_with_summary"("payload" "jsonb", "summary_snapshot" "jsonb") OWNER TO "postgres";
GRANT ALL ON FUNCTION "public"."insert_workout_log_with_summary"("payload" "jsonb", "summary_snapshot" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."insert_workout_log_with_summary"("payload" "jsonb", "summary_snapshot" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."insert_workout_log_with_summary"("payload" "jsonb", "summary_snapshot" "jsonb") TO "service_role";
