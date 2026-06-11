-- ============================================================================
-- wt_upsert_workout: escrita de template de treino para o app mobile.
--
-- Substitui o caminho legado upsert_workout (PWA, SECURITY DEFINER, contrato
-- snake_case sem duration/distance) por uma função fina no padrão wt_*:
-- payload camelCase no modelo unificado (exercise_type em workout_exercises;
-- as dimensões-alvo do set são as colunas nullable reps_min/reps_max/
-- duration_seconds/distance_meters — o measurement_type vive na variação e o
-- vocabulário por set é derivado na leitura). SECURITY INVOKER para a RLS
-- valer (as policies de workouts/workout_exercises/workout_sets já cobrem
-- dono e coach ativo via is_active_coach_of).
--
-- Estratégia: upsert da linha de workouts + delete/reinsert de exercícios e
-- sets com os ids cunhados pelo cliente (mesma semântica do legado; os logs
-- são snapshot e não referenciam workout_exercises, então o delete é seguro).
-- Validações de forma/valor ficam nas constraints existentes (set_type
-- check, positivos, reps_max >= reps_min, superset_order, índice único de
-- posição); a função só valida o que constraint não alcança: ids
-- obrigatórios e o encadeamento de linked_set_id para drop/cluster.
-- ============================================================================
CREATE OR REPLACE FUNCTION "public"."wt_upsert_workout"("payload" "jsonb") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY INVOKER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_actor_id UUID := (SELECT auth.uid());
  v_user_id UUID;
  v_workout_id UUID;
BEGIN
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'wt_upsert_workout called without an authenticated user'
      USING ERRCODE = '28000';
  END IF;

  v_user_id := (payload->>'userId')::UUID;
  v_workout_id := (payload->>'workoutId')::UUID;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'userId required' USING ERRCODE = '22023';
  END IF;

  IF v_workout_id IS NULL THEN
    RAISE EXCEPTION 'workoutId required' USING ERRCODE = '22023';
  END IF;

  IF v_user_id <> v_actor_id
    AND NOT public.is_active_coach_of(v_actor_id, v_user_id) THEN
    RAISE EXCEPTION 'actor is neither the target user nor an active coach of them'
      USING ERRCODE = '42501';
  END IF;

  IF jsonb_typeof(payload->'exercises') IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'exercises must be array' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.workouts (
    id, user_id, name, description, folder_id, created_by, updated_by
  )
  VALUES (
    v_workout_id,
    v_user_id,
    TRIM(payload->>'name'),
    NULLIF(TRIM(payload->>'description'), ''),
    NULLIF(payload->>'folderId', '')::UUID,
    v_actor_id,
    v_actor_id
  )
  ON CONFLICT (id) DO UPDATE SET
    name = excluded.name,
    description = excluded.description,
    folder_id = excluded.folder_id,
    updated_by = excluded.updated_by
  WHERE public.workouts.user_id = v_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'workout not found or access denied' USING ERRCODE = 'P0002';
  END IF;

  DROP TABLE IF EXISTS temp_exercises;
  CREATE TEMP TABLE temp_exercises AS
  SELECT
    (ex->>'id')::UUID AS id,
    (ex->>'variationId')::UUID AS variation_id,
    COALESCE(NULLIF(ex->>'exerciseType', ''), 'strength') AS exercise_type,
    (ex->>'position')::INTEGER AS position,
    (ex->>'supersetGroupId')::UUID AS superset_group_id,
    (ex->>'supersetOrder')::INTEGER AS superset_order,
    NULLIF(TRIM(ex->>'note'), '') AS note,
    NULLIF(ex->>'restSeconds', '')::INTEGER AS rest_seconds,
    ex AS raw_ex
  FROM jsonb_array_elements(payload->'exercises') ex;

  IF EXISTS (SELECT 1 FROM temp_exercises WHERE id IS NULL) THEN
    RAISE EXCEPTION 'exercise id required' USING ERRCODE = '22023';
  END IF;

  IF EXISTS (SELECT 1 FROM temp_exercises WHERE variation_id IS NULL) THEN
    RAISE EXCEPTION 'exercise variationId required' USING ERRCODE = '22023';
  END IF;

  DROP TABLE IF EXISTS temp_sets;
  CREATE TEMP TABLE temp_sets AS
  SELECT
    te.id AS exercise_id,
    (s->>'id')::UUID AS id,
    (s->>'setOrder')::INTEGER AS set_order,
    s->>'setType' AS set_type,
    NULLIF(s->>'repsMin', '')::INTEGER AS reps_min,
    NULLIF(s->>'repsMax', '')::INTEGER AS reps_max,
    NULLIF(s->>'durationSeconds', '')::INTEGER AS duration_seconds,
    NULLIF(s->>'distanceMeters', '')::INTEGER AS distance_meters,
    NULLIF(s->>'linkedSetId', '')::UUID AS linked_set_id,
    NULLIF(s->>'loadPercentOfPrevious', '')::INTEGER AS load_percent_of_previous,
    NULLIF(s->>'roundOrder', '')::INTEGER AS round_order_in
  FROM temp_exercises te
  CROSS JOIN LATERAL jsonb_array_elements(te.raw_ex->'sets') s;

  IF EXISTS (SELECT 1 FROM temp_sets WHERE id IS NULL) THEN
    RAISE EXCEPTION 'set id required' USING ERRCODE = '22023';
  END IF;

  IF EXISTS (
    SELECT 1 FROM temp_sets
    WHERE set_type IN ('drop', 'cluster') AND linked_set_id IS NULL
  ) THEN
    RAISE EXCEPTION 'linked_set_id required for drop/cluster' USING ERRCODE = '22023';
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
    RAISE EXCEPTION 'linked_set_id must reference previous set' USING ERRCODE = '22023';
  END IF;

  DELETE FROM public.workout_exercises
  WHERE workout_id = v_workout_id;

  INSERT INTO public.workout_exercises (
    id, workout_id, variation_id, exercise_type, position,
    superset_group_id, superset_order, note, rest_seconds
  )
  SELECT
    te.id, v_workout_id, te.variation_id, te.exercise_type, te.position,
    te.superset_group_id, te.superset_order, te.note, te.rest_seconds
  FROM temp_exercises te;

  INSERT INTO public.workout_sets (
    id, workout_exercise_id, set_order, set_type,
    reps_min, reps_max, duration_seconds, distance_meters,
    linked_set_id, load_percent_of_previous, round_order
  )
  SELECT
    ts.id, ts.exercise_id, ts.set_order, ts.set_type,
    ts.reps_min, ts.reps_max, ts.duration_seconds, ts.distance_meters,
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

  -- Coach montando treino do atleta: compartilha com ele as variações do
  -- próprio coach. Reusa o helper DEFINER de wt_copy_workouts — sob INVOKER o
  -- INSERT direto em shared_variations cai na recursão de policies
  -- (shared_variations_insert <-> variations_select_scoped); ver o comentário
  -- em 20260525105936 sobre o 42P17.
  IF v_user_id <> v_actor_id THEN
    PERFORM public.wt_share_variations_for_copy(v_user_id, ARRAY[v_workout_id]);
  END IF;

  RETURN v_workout_id;
END;
$$;

ALTER FUNCTION "public"."wt_upsert_workout"("payload" "jsonb") OWNER TO "postgres";
GRANT ALL ON FUNCTION "public"."wt_upsert_workout"("payload" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."wt_upsert_workout"("payload" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."wt_upsert_workout"("payload" "jsonb") TO "service_role";
