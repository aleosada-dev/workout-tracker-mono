-- Superset rounds: explicit round_order per set.
--
-- Grouping superset sets into a "série" is user intent that cannot be derived
-- from set types alone (e.g. A+B+A all-normal in one round). Each set now carries
-- a 0-based round_order. Added to both the template sets (workout_sets) and the
-- log sets (workout_exercise_set_logs), backfilled via the block rule, and the
-- two upsert functions re-emitted to persist it (with a derived fallback so
-- existing callers that omit round_order keep working).

ALTER TABLE public.workout_sets
  ADD COLUMN IF NOT EXISTS round_order integer NOT NULL DEFAULT 0;
ALTER TABLE public.workout_sets
  DROP CONSTRAINT IF EXISTS workout_sets_round_order_check;
ALTER TABLE public.workout_sets
  ADD CONSTRAINT workout_sets_round_order_check CHECK (round_order >= 0);

ALTER TABLE public.workout_exercise_set_logs
  ADD COLUMN IF NOT EXISTS round_order integer NOT NULL DEFAULT 0;
ALTER TABLE public.workout_exercise_set_logs
  DROP CONSTRAINT IF EXISTS workout_exercise_set_logs_round_order_check;
ALTER TABLE public.workout_exercise_set_logs
  ADD CONSTRAINT workout_exercise_set_logs_round_order_check CHECK (round_order >= 0);

-- Backfill (block rule): each normal/warmup opens a new round; drop/cluster
-- inherit the preceding set's round.
UPDATE public.workout_sets ws
SET round_order = sub.r
FROM (
  SELECT id,
    GREATEST(
      (COUNT(*) FILTER (WHERE set_type IN ('normal', 'warmup'))
        OVER (PARTITION BY workout_exercise_id ORDER BY set_order)) - 1,
      0
    ) AS r
  FROM public.workout_sets
) sub
WHERE ws.id = sub.id AND ws.round_order IS DISTINCT FROM sub.r;

UPDATE public.workout_exercise_set_logs wsl
SET round_order = sub.r
FROM (
  SELECT id,
    GREATEST(
      (COUNT(*) FILTER (WHERE set_type IN ('normal', 'warmup'))
        OVER (PARTITION BY workout_exercise_log_id ORDER BY set_order)) - 1,
      0
    ) AS r
  FROM public.workout_exercise_set_logs
) sub
WHERE wsl.id = sub.id AND wsl.round_order IS DISTINCT FROM sub.r;

-- ============================================================================
-- upsert_workout: persist workout_sets.round_order (template write path).
-- Re-emitted from 20260516000000_baseline.sql with round_order plumbing; all
-- existing validations are unchanged.
-- ============================================================================
CREATE OR REPLACE FUNCTION "public"."upsert_workout"("payload" "jsonb") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_workout jsonb := payload->'workout';
  v_workout_id uuid := (v_workout->>'id')::uuid;
  v_workout_name text;
  v_workout_description text;
  v_workout_folder_id uuid;
  v_workout_archived timestamptz;
  v_auth_id uuid;
  v_target_user_id uuid;
  v_user_id uuid;
BEGIN
  v_auth_id := (SELECT auth.uid());
  v_target_user_id := (v_workout->>'user_id')::uuid;

  IF v_target_user_id IS NOT NULL AND v_target_user_id <> v_auth_id THEN
    IF NOT public.is_active_coach_of(v_auth_id, v_target_user_id) THEN
      RAISE EXCEPTION 'access denied: not an active coach of the target user';
    END IF;
    v_user_id := v_target_user_id;
  ELSE
    v_user_id := v_auth_id;
  END IF;

  IF v_workout IS NULL THEN
    RAISE EXCEPTION 'workout payload required';
  END IF;

  IF jsonb_typeof(payload->'exercises') IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'exercises must be array';
  END IF;

  v_workout_name := NULLIF(TRIM(v_workout->>'name'), '');
  v_workout_description := NULLIF(TRIM(v_workout->>'description'), '');
  v_workout_folder_id := NULLIF(v_workout->>'folder_id', '')::uuid;
  v_workout_archived := (v_workout->>'archived_at')::timestamptz;

  IF v_workout_name IS NULL THEN
    RAISE EXCEPTION 'workout name required';
  END IF;

  IF v_workout_id IS NULL THEN
    v_workout_id := gen_random_uuid();
  END IF;

  INSERT INTO public.workouts (
    id, user_id, name, description, folder_id, archived_at
  )
  VALUES (
    v_workout_id, v_user_id, v_workout_name, v_workout_description,
    v_workout_folder_id, v_workout_archived
  )
  ON CONFLICT (id) DO UPDATE SET
    name = excluded.name,
    description = excluded.description,
    folder_id = excluded.folder_id,
    archived_at = excluded.archived_at
  WHERE public.workouts.user_id = v_user_id
    OR public.is_active_coach_of(v_auth_id, public.workouts.user_id);

  IF NOT FOUND THEN
    RAISE EXCEPTION 'workout not found or access denied';
  END IF;

  DROP TABLE IF EXISTS temp_exercises;
  CREATE TEMP TABLE temp_exercises AS
  SELECT
    (ex->>'id')::uuid AS id,
    (ex->>'variation_id')::uuid AS variation_id,
    NULLIF(TRIM(ex->>'note'), '') AS note,
    NULLIF(ex->>'rest_seconds', '')::INTEGER AS rest_seconds,
    (ex->>'position')::INTEGER AS position,
    (ex->>'superset_group_id')::uuid AS superset_group_id,
    (ex->>'superset_order')::INTEGER AS superset_order,
    ex AS raw_ex
  FROM jsonb_array_elements(payload->'exercises') ex;

  IF EXISTS (SELECT 1 FROM temp_exercises WHERE id IS NULL) THEN
    RAISE EXCEPTION 'exercise id required';
  END IF;

  DROP TABLE IF EXISTS temp_sets;
  CREATE TEMP TABLE temp_sets AS
  SELECT
    te.id AS exercise_id,
    (s->>'id')::uuid AS id,
    (s->>'set_order')::INTEGER AS set_order,
    s->>'set_type' AS set_type,
    (s->>'reps_min')::INTEGER AS reps_min,
    (s->>'reps_max')::INTEGER AS reps_max,
    (s->>'linked_set_id')::uuid AS linked_set_id,
    (s->>'load_percent_of_previous')::INTEGER AS load_percent_of_previous,
    NULLIF(s->>'round_order', '')::INTEGER AS round_order_in
  FROM temp_exercises te
  CROSS JOIN LATERAL jsonb_array_elements(te.raw_ex->'sets') s;

  IF EXISTS (SELECT 1 FROM temp_sets WHERE id IS NULL) THEN
    RAISE EXCEPTION 'set id required';
  END IF;

  IF EXISTS (
    SELECT 1 FROM temp_sets
    WHERE set_type IS NULL OR set_type NOT IN ('warmup', 'normal', 'drop', 'cluster')
  ) THEN
    RAISE EXCEPTION 'invalid set_type';
  END IF;

  IF EXISTS (SELECT 1 FROM temp_sets WHERE reps_min IS NULL OR reps_min <= 0) THEN
    RAISE EXCEPTION 'reps_min must be > 0';
  END IF;

  IF EXISTS (SELECT 1 FROM temp_sets WHERE reps_max IS NULL OR reps_max < reps_min) THEN
    RAISE EXCEPTION 'reps_max must be >= reps_min';
  END IF;

  IF EXISTS (
    SELECT 1 FROM temp_sets ts
    WHERE ts.set_type IN ('drop', 'cluster') AND ts.linked_set_id IS NULL
  ) THEN
    RAISE EXCEPTION 'linked_set_id required for drop/cluster';
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
    RAISE EXCEPTION 'linked_set_id must reference previous set';
  END IF;

  IF EXISTS (
    SELECT 1 FROM temp_sets ts
    WHERE ts.set_type IN ('drop', 'cluster')
      AND ts.set_order > 0
      AND NOT EXISTS (
        SELECT 1 FROM temp_sets prev
        WHERE prev.exercise_id = ts.exercise_id
          AND prev.set_order = ts.set_order - 1
          AND (prev.set_type = 'normal' OR prev.set_type = ts.set_type)
      )
  ) THEN
    RAISE EXCEPTION 'drop/cluster sets must follow normal or same type sets';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM temp_exercises te
    WHERE te.superset_group_id IS NOT NULL
    GROUP BY te.superset_group_id
    HAVING COUNT(*) > 3
  ) THEN
    RAISE EXCEPTION 'max 3 exercises per superset group';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM temp_exercises te
    WHERE te.superset_group_id IS NOT NULL
    GROUP BY te.superset_group_id
    HAVING COUNT(*) > 1
      AND COUNT(DISTINCT te.position) > 1
  ) THEN
    RAISE EXCEPTION 'all exercises in a superset group must share the same position';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM (
      SELECT
        te.superset_group_id,
        te.id AS exercise_id,
        COUNT(ts.id) AS set_count
      FROM temp_exercises te
      LEFT JOIN temp_sets ts ON ts.exercise_id = te.id
      WHERE te.superset_group_id IS NOT NULL
      GROUP BY te.superset_group_id, te.id
    ) ex_sets
    WHERE superset_group_id IN (
      SELECT superset_group_id
      FROM temp_exercises
      GROUP BY superset_group_id
      HAVING COUNT(*) > 1
    )
    GROUP BY superset_group_id
    HAVING COUNT(DISTINCT set_count) > 1
  ) THEN
    RAISE EXCEPTION 'all exercises in a superset group must have the same number of sets';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM temp_sets ts
    JOIN temp_exercises te ON te.id = ts.exercise_id
    WHERE te.superset_group_id IN (
      SELECT superset_group_id
      FROM temp_exercises
      GROUP BY superset_group_id
      HAVING COUNT(*) > 1
    )
    AND ts.set_type <> 'normal'
  ) THEN
    RAISE EXCEPTION 'all sets in superset exercises must be type normal';
  END IF;

  DELETE FROM public.workout_exercises
  WHERE workout_id = v_workout_id;

  INSERT INTO public.workout_exercises (
    id, workout_id, variation_id, note, rest_seconds, position,
    superset_group_id, superset_order
  )
  SELECT
    te.id, v_workout_id, te.variation_id, te.note, te.rest_seconds, te.position,
    te.superset_group_id, te.superset_order
  FROM temp_exercises te;

  INSERT INTO public.workout_sets (
    id, workout_exercise_id, set_order, set_type, reps_min, reps_max,
    linked_set_id, load_percent_of_previous, round_order
  )
  SELECT
    ts.id, ts.exercise_id, ts.set_order, ts.set_type, ts.reps_min, ts.reps_max,
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

  DELETE FROM public.workout_preparatory_exercises
  WHERE workout_id = v_workout_id;

  DROP TABLE IF EXISTS temp_prep_exercises;
  CREATE TEMP TABLE temp_prep_exercises AS
  SELECT
    (pe->>'id')::uuid AS id,
    (pe->>'variation_id')::uuid AS variation_id,
    (pe->>'position')::INTEGER AS position,
    pe->>'duration_type' AS duration_type,
    NULLIF(TRIM(pe->>'note'), '') AS note,
    pe AS raw_pe
  FROM jsonb_array_elements(COALESCE(payload->'preparatory_exercises', '[]'::jsonb)) pe;

  INSERT INTO public.workout_preparatory_exercises (
    id, workout_id, variation_id, "position", duration_type, note
  )
  SELECT
    tpe.id, v_workout_id, tpe.variation_id, tpe.position, tpe.duration_type, tpe.note
  FROM temp_prep_exercises tpe;

  INSERT INTO public.workout_preparatory_sets (
    id, workout_preparatory_exercise_id, set_order, duration_seconds, reps
  )
  SELECT
    (s->>'id')::uuid,
    tpe.id,
    (s->>'set_order')::INTEGER,
    (s->>'duration_seconds')::INTEGER,
    (s->>'reps')::INTEGER
  FROM temp_prep_exercises tpe
  CROSS JOIN LATERAL jsonb_array_elements(COALESCE(tpe.raw_pe->'sets', '[]'::jsonb)) s;

  -- Auto-share coach-owned variations with the target athlete.
  INSERT INTO public.shared_variations (variation_id, owner_id, shared_with_id)
  SELECT DISTINCT v.id, v.user_id, v_user_id
  FROM public.workout_exercises we
  JOIN public.variations v ON v.id = we.variation_id
  WHERE we.workout_id = v_workout_id
    AND v.user_id IS NOT NULL
    AND v.user_id <> v_user_id
  ON CONFLICT (variation_id, shared_with_id) DO NOTHING;

  INSERT INTO public.shared_variations (variation_id, owner_id, shared_with_id)
  SELECT DISTINCT v.id, v.user_id, v_user_id
  FROM public.workout_preparatory_exercises wpe
  JOIN public.variations v ON v.id = wpe.variation_id
  WHERE wpe.workout_id = v_workout_id
    AND v.user_id IS NOT NULL
    AND v.user_id <> v_user_id
  ON CONFLICT (variation_id, shared_with_id) DO NOTHING;

  RETURN v_workout_id;
END;
$$;

ALTER FUNCTION "public"."upsert_workout"("payload" "jsonb") OWNER TO "postgres";

-- ============================================================================
-- wt_insert_workout_log: persist workout_exercise_set_logs.round_order (log
-- write path). Re-emitted from 20260601130000 with round_order plumbing.
-- ============================================================================
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

  -- Sessão de coach, atômica com o log (movido da camada de aplicação):
  --   * sessão agendada já informada -> marca como concluída e liga ao log;
  --   * sessão acompanhada sem id -> resolve o coach (coach ativo quando quem
  --     finaliza é o próprio aluno; o próprio actor quando é o coach) e cria uma
  --     sessão já concluída ligada ao log.
  -- Em ambos os casos v_coach_id sai preenchido só quando há de fato um coach,
  -- sinalizando ao app que vale notificar.
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
        -- arredonda started_at para a meia-hora mais próxima (era roundToNearestHalfHour)
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
      'weight_duration', 'weight_reps_duration'
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

  IF EXISTS (
    SELECT 1 FROM temp_sets
    WHERE measurement_type IN ('duration', 'duration_reps', 'weight_duration', 'weight_reps_duration')
      AND duration_seconds IS NULL
  ) THEN
    RAISE EXCEPTION 'duration_seconds required for measurement_type' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.workout_exercise_logs (
    workout_log_id, variation_id, exercise_type, position, note, rest_seconds,
    superset_group_id, exercise_name, variation_name
  )
  SELECT
    v_log_id, te.variation_id, te.exercise_type, te.position, te.note,
    te.rest_seconds, te.superset_group_id, e.name, v.name
  FROM temp_exercises te
  JOIN public.variations v ON v.id = te.variation_id
  JOIN public.exercises e ON e.id = v.exercise_id
  ORDER BY te.exercise_idx;

  INSERT INTO public.workout_exercise_set_logs (
    workout_exercise_log_id, set_order, set_type, measurement_type,
    weight_kg, reps, reps_min, reps_max, duration_seconds, round_order
  )
  SELECT
    wel.id, ts.set_order, ts.set_type, ts.measurement_type,
    ts.weight_kg, ts.reps, ts.reps_min, ts.reps_max, ts.duration_seconds,
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

  -- Conclui a ocorrência da periodização quando o log nasce a partir dela. Só
  -- avança ocorrências ainda 'pending' (não reabre 'done'/'skipped'). A RLS de
  -- periodization_occurrences (INVOKER) já restringe ao dono/atleta da
  -- periodização; uma ocorrência de terceiros simplesmente não casa o WHERE.
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
