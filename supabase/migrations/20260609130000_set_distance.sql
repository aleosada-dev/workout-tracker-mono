-- ============================================================================
-- Distance measurement type para sets.
--
-- Adiciona 'distance' ao vocabulário de measurement_type dos sets (espelhando
-- 'duration') e uma coluna distance_meters tanto no template (workout_sets)
-- quanto no log (workout_exercise_set_logs). O valor é sempre armazenado em
-- METROS; a UI converte m/km na borda. Recria wt_insert_workout_log para
-- extrair, validar e persistir distance_meters.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- workout_sets (template): alvo de distância opcional.
-- ----------------------------------------------------------------------------
ALTER TABLE public.workout_sets
  ADD COLUMN IF NOT EXISTS distance_meters integer;

ALTER TABLE public.workout_sets
  DROP CONSTRAINT IF EXISTS workout_sets_distance_positive,
  ADD CONSTRAINT workout_sets_distance_positive
    CHECK (distance_meters IS NULL OR distance_meters > 0);

-- ----------------------------------------------------------------------------
-- workout_exercise_set_logs (histórico): distância executada + 'distance' no
-- check de measurement_type.
-- ----------------------------------------------------------------------------
ALTER TABLE public.workout_exercise_set_logs
  ADD COLUMN IF NOT EXISTS distance_meters integer;

ALTER TABLE public.workout_exercise_set_logs
  DROP CONSTRAINT IF EXISTS workout_exercise_set_logs_distance_positive,
  ADD CONSTRAINT workout_exercise_set_logs_distance_positive
    CHECK (distance_meters IS NULL OR distance_meters > 0);

ALTER TABLE public.workout_exercise_set_logs
  DROP CONSTRAINT IF EXISTS workout_exercise_set_logs_measurement_type_check,
  ADD CONSTRAINT workout_exercise_set_logs_measurement_type_check
    CHECK (measurement_type IN (
      'weight_reps', 'reps', 'duration', 'duration_reps',
      'weight_duration', 'weight_reps_duration', 'distance'
    ));

-- ----------------------------------------------------------------------------
-- wt_insert_workout_log: idêntica à versão de 20260605120000, acrescentando o
-- eixo de distância (extração de distanceMeters, validações e persistência) e
-- 'distance' na lista de measurement_type aceitos.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION "public"."wt_insert_workout_log"("payload" "jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY INVOKER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_log_id UUID;
  v_user_id UUID;
  v_actor_id UUID := (SELECT auth.uid());
  v_is_coached BOOLEAN := COALESCE((payload->>'isCoached')::BOOLEAN, FALSE);
  v_coach_session_id UUID := NULLIF(payload->>'coachSessionId', '')::UUID;
  v_coach_id UUID;
  v_athlete_finished BOOLEAN;
  v_occurrence_id UUID := NULLIF(payload->>'periodizationOccurrenceId', '')::UUID;
BEGIN
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'wt_insert_workout_log called without an authenticated user'
      USING ERRCODE = '28000';
  END IF;

  v_user_id := (payload->>'userId')::UUID;

  IF v_user_id <> v_actor_id
    AND NOT public.is_active_coach_of(v_actor_id, v_user_id) THEN
    RAISE EXCEPTION 'actor is neither the target user nor an active coach of them'
      USING ERRCODE = '42501';
  END IF;

  v_athlete_finished := (v_actor_id = v_user_id);

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
    v_coach_session_id,
    v_is_coached
  )
  RETURNING id INTO v_log_id;

  IF v_coach_session_id IS NOT NULL THEN
    UPDATE public.coach_sessions
    SET workout_log_id = v_log_id, status = 'completed'
    WHERE id = v_coach_session_id
      AND athlete_id = v_user_id
    RETURNING coach_id INTO v_coach_id;
  ELSIF v_is_coached THEN
    IF v_athlete_finished THEN
      SELECT ca.coach_id INTO v_coach_id
      FROM public.coach_athletes ca
      WHERE ca.athlete_id = v_user_id
        AND ca.status = 'active'
      ORDER BY ca.responded_at DESC
      LIMIT 1;
    ELSE
      v_coach_id := v_actor_id;
    END IF;

    IF v_coach_id IS NOT NULL THEN
      INSERT INTO public.coach_sessions (
        coach_id, athlete_id, requested_by, scheduled_at,
        duration_minutes, status, source, workout_log_id
      )
      VALUES (
        v_coach_id,
        v_user_id,
        v_actor_id,
        to_timestamp(
          round(extract(epoch FROM (payload->>'startedAt')::TIMESTAMPTZ) / 1800.0) * 1800
        ),
        60,
        'completed',
        'manual',
        v_log_id
      )
      RETURNING id INTO v_coach_session_id;

      UPDATE public.workout_logs
      SET coach_session_id = v_coach_session_id
      WHERE id = v_log_id;
    END IF;
  END IF;

  DROP TABLE IF EXISTS temp_exercises;
  CREATE TEMP TABLE temp_exercises AS
  SELECT
    ex.ordinality::INTEGER AS exercise_idx,
    (ex.value->>'variationId')::uuid AS variation_id,
    NULLIF(ex.value->>'aliasId', '')::uuid AS alias_id,
    COALESCE(NULLIF(ex.value->>'exerciseType', ''), 'strength') AS exercise_type,
    (ex.value->>'position')::INTEGER AS position,
    NULLIF(TRIM(ex.value->>'note'), '') AS note,
    NULLIF(ex.value->>'restSeconds', '')::INTEGER AS rest_seconds,
    NULLIF(ex.value->>'supersetGroupId', '')::uuid AS superset_group_id,
    ex.value AS raw_ex
  FROM jsonb_array_elements(payload->'exercises') WITH ORDINALITY AS ex(value, ordinality);

  IF EXISTS (SELECT 1 FROM temp_exercises WHERE variation_id IS NULL) THEN
    RAISE EXCEPTION 'exercise variationId required' USING ERRCODE = '22023';
  END IF;

  IF EXISTS (
    SELECT 1 FROM temp_exercises WHERE exercise_type NOT IN ('preparatory', 'strength')
  ) THEN
    RAISE EXCEPTION 'invalid exercise_type' USING ERRCODE = '22023';
  END IF;

  IF EXISTS (
    SELECT 1 FROM temp_exercises te
    WHERE NOT EXISTS (
      SELECT 1 FROM public.variations v WHERE v.id = te.variation_id
    )
  ) THEN
    RAISE EXCEPTION 'invalid variation_id' USING ERRCODE = 'P0002';
  END IF;

  -- Alias (quando informado) precisa ser do atleta, da mesma variação e ativo.
  IF EXISTS (
    SELECT 1 FROM temp_exercises te
    WHERE te.alias_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM public.variation_aliases va
        WHERE va.id = te.alias_id
          AND va.user_id = v_user_id
          AND va.variation_id = te.variation_id
          AND va.deleted_at IS NULL
      )
  ) THEN
    RAISE EXCEPTION 'invalid alias_id for variation' USING ERRCODE = '22023';
  END IF;

  DROP TABLE IF EXISTS temp_sets;
  CREATE TEMP TABLE temp_sets AS
  SELECT
    te.exercise_idx, te.variation_id, te.exercise_type, te.position,
    (s->>'setOrder')::INTEGER AS set_order,
    s->>'setType' AS set_type,
    COALESCE(NULLIF(s->>'measurementType', ''), 'weight_reps') AS measurement_type,
    (s->>'weightKg')::NUMERIC(6,2) AS weight_kg,
    (s->>'reps')::INTEGER AS reps,
    (s->>'repsMin')::INTEGER AS reps_min,
    (s->>'repsMax')::INTEGER AS reps_max,
    NULLIF(s->>'durationSeconds', '')::INTEGER AS duration_seconds,
    NULLIF(s->>'distanceMeters', '')::INTEGER AS distance_meters,
    NULLIF(s->>'roundOrder', '')::INTEGER AS round_order_in
  FROM temp_exercises te
  CROSS JOIN LATERAL jsonb_array_elements(te.raw_ex->'sets') s;

  IF EXISTS (
    SELECT 1 FROM temp_sets
    WHERE set_type IS NULL OR set_type NOT IN ('warmup', 'normal', 'drop', 'cluster')
  ) THEN
    RAISE EXCEPTION 'invalid set_type' USING ERRCODE = '22023';
  END IF;

  IF EXISTS (
    SELECT 1 FROM temp_sets
    WHERE measurement_type NOT IN (
      'weight_reps', 'reps', 'duration', 'duration_reps',
      'weight_duration', 'weight_reps_duration', 'distance'
    )
  ) THEN
    RAISE EXCEPTION 'invalid measurement_type' USING ERRCODE = '22023';
  END IF;

  IF EXISTS (SELECT 1 FROM temp_sets WHERE reps IS NOT NULL AND reps <= 0) THEN
    RAISE EXCEPTION 'reps must be > 0' USING ERRCODE = '22023';
  END IF;

  IF EXISTS (SELECT 1 FROM temp_sets WHERE duration_seconds IS NOT NULL AND duration_seconds <= 0) THEN
    RAISE EXCEPTION 'duration_seconds must be > 0' USING ERRCODE = '22023';
  END IF;

  IF EXISTS (SELECT 1 FROM temp_sets WHERE distance_meters IS NOT NULL AND distance_meters <= 0) THEN
    RAISE EXCEPTION 'distance_meters must be > 0' USING ERRCODE = '22023';
  END IF;

  IF EXISTS (
    SELECT 1 FROM temp_sets
    WHERE measurement_type IN ('duration', 'duration_reps', 'weight_duration', 'weight_reps_duration')
      AND duration_seconds IS NULL
  ) THEN
    RAISE EXCEPTION 'duration_seconds required for measurement_type' USING ERRCODE = '22023';
  END IF;

  IF EXISTS (
    SELECT 1 FROM temp_sets
    WHERE measurement_type = 'distance'
      AND distance_meters IS NULL
  ) THEN
    RAISE EXCEPTION 'distance_meters required for measurement_type' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.workout_exercise_logs (
    workout_log_id, variation_id, alias_id, exercise_type, position, note, rest_seconds,
    superset_group_id, exercise_name, variation_name, alias_name
  )
  SELECT
    v_log_id, te.variation_id, te.alias_id, te.exercise_type, te.position, te.note,
    te.rest_seconds, te.superset_group_id, e.name, v.name, va.name
  FROM temp_exercises te
  JOIN public.variations v ON v.id = te.variation_id
  JOIN public.exercises e ON e.id = v.exercise_id
  LEFT JOIN public.variation_aliases va ON va.id = te.alias_id
  ORDER BY te.exercise_idx;

  INSERT INTO public.workout_exercise_set_logs (
    workout_exercise_log_id, set_order, set_type, measurement_type,
    weight_kg, reps, reps_min, reps_max, duration_seconds, distance_meters, round_order
  )
  SELECT
    wel.id, ts.set_order, ts.set_type, ts.measurement_type,
    ts.weight_kg, ts.reps, ts.reps_min, ts.reps_max, ts.duration_seconds, ts.distance_meters,
    COALESCE(
      ts.round_order_in,
      GREATEST(
        (COUNT(*) FILTER (WHERE ts.set_type IN ('normal', 'warmup'))
          OVER (PARTITION BY ts.exercise_idx ORDER BY ts.set_order)) - 1,
        0
      )
    )
  FROM temp_sets ts
  JOIN public.workout_exercise_logs wel
    ON wel.workout_log_id = v_log_id
   AND wel.variation_id = ts.variation_id
   AND wel.exercise_type = ts.exercise_type
   AND wel.position = ts.position
  ORDER BY ts.exercise_idx, ts.set_order;

  PERFORM public.wt_recalculate_variation_records(
    v_user_id,
    ARRAY(
      SELECT DISTINCT variation_id
      FROM temp_exercises
      WHERE exercise_type = 'strength'
    )
  );

  IF v_occurrence_id IS NOT NULL THEN
    UPDATE public.periodization_occurrences
    SET status = 'done',
        workout_log_id = v_log_id,
        executed_at = (payload->>'finishedAt')::TIMESTAMPTZ,
        updated_at = now()
    WHERE id = v_occurrence_id
      AND status = 'pending';
  END IF;

  RETURN jsonb_build_object(
    'workoutLogId', v_log_id,
    'coachSessionId', v_coach_session_id,
    'coachId', v_coach_id
  );
END;
$$;

ALTER FUNCTION "public"."wt_insert_workout_log"("payload" "jsonb") OWNER TO "postgres";
GRANT ALL ON FUNCTION "public"."wt_insert_workout_log"("payload" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."wt_insert_workout_log"("payload" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."wt_insert_workout_log"("payload" "jsonb") TO "service_role";
