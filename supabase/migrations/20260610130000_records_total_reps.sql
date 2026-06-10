-- ----------------------------------------------------------------------------
-- Total reps como PR, análogo a max_total_duration_seconds/max_total_distance_meters:
-- além do melhor set (max_reps), passamos a persistir o maior total de repetições
-- somadas em uma sessão. Exercícios de measurement_type = reps (calistenia,
-- peso corporal) ganham o recorde "Reps total" no detalhe e no resumo da sessão.
--
-- Modelo:
--   max_total_reps = MAX da SOMA de reps por sessão (análogo a max_volume_kg, mas
--                    sem peso). "Maior = melhor". Coluna nula surge naturalmente
--                    onde não há reps, sem ramificar por measurement_type.
-- ----------------------------------------------------------------------------

ALTER TABLE "public"."workout_variation_records"
  ADD COLUMN IF NOT EXISTS "max_total_reps" integer;

-- ----------------------------------------------------------------------------
-- wt_recalculate_variation_records: mesma agregação por sessão, agora também
-- levando o maior total de reps por sessão (geral + por alias).
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION "public"."wt_recalculate_variation_records"("p_user_id" "uuid", "p_variation_ids" "uuid"[]) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY INVOKER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_include_warmup boolean := COALESCE(
    (SELECT up.value = 'true'::jsonb
       FROM public.user_preferences up
      WHERE up.user_id = p_user_id
        AND up.key = 'count_warmup_sets'),
    false
  );
BEGIN
  DELETE FROM public.workout_variation_records
  WHERE user_id = p_user_id
    AND variation_id = ANY(p_variation_ids);

  -- PR geral (alias_id NULL): agrega todos os logs da variação, qualquer alias.
  INSERT INTO public.workout_variation_records (
    user_id, variation_id, alias_id,
    max_weight_kg, max_volume_kg, max_reps, max_sets,
    max_duration_seconds, max_distance_meters,
    max_total_duration_seconds, max_total_distance_meters,
    max_total_reps
  )
  SELECT
    p_user_id,
    variation_id,
    NULL::uuid,
    MAX(session_max_weight_kg),
    MAX(session_max_volume_kg),
    MAX(session_max_reps),
    MAX(session_sets_count),
    MAX(session_max_duration_seconds),
    MAX(session_max_distance_meters),
    MAX(session_total_duration_seconds),
    MAX(session_total_distance_meters),
    MAX(session_total_reps)
  FROM (
    SELECT
      wel.variation_id,
      MAX(wesl.weight_kg) AS session_max_weight_kg,
      COALESCE(SUM(wesl.weight_kg * wesl.reps), 0) AS session_max_volume_kg,
      MAX(wesl.reps) AS session_max_reps,
      COUNT(*)::INTEGER AS session_sets_count,
      MAX(wesl.duration_seconds) AS session_max_duration_seconds,
      MAX(wesl.distance_meters) AS session_max_distance_meters,
      SUM(wesl.duration_seconds) AS session_total_duration_seconds,
      SUM(wesl.distance_meters) AS session_total_distance_meters,
      SUM(wesl.reps) AS session_total_reps
    FROM workout_logs wl
    JOIN workout_exercise_logs wel ON wel.workout_log_id = wl.id
    JOIN workout_exercise_set_logs wesl ON wesl.workout_exercise_log_id = wel.id
    WHERE wl.user_id = p_user_id
      AND wl.deleted_at IS NULL
      AND wel.exercise_type = 'strength'
      AND wel.variation_id = ANY(p_variation_ids)
      AND (v_include_warmup OR wesl.set_type <> 'warmup')
    GROUP BY wl.id, wel.variation_id
  ) per_session
  GROUP BY variation_id;

  -- PR por alias: só os logs que registraram um alias.
  INSERT INTO public.workout_variation_records (
    user_id, variation_id, alias_id,
    max_weight_kg, max_volume_kg, max_reps, max_sets,
    max_duration_seconds, max_distance_meters,
    max_total_duration_seconds, max_total_distance_meters,
    max_total_reps
  )
  SELECT
    p_user_id,
    variation_id,
    alias_id,
    MAX(session_max_weight_kg),
    MAX(session_max_volume_kg),
    MAX(session_max_reps),
    MAX(session_sets_count),
    MAX(session_max_duration_seconds),
    MAX(session_max_distance_meters),
    MAX(session_total_duration_seconds),
    MAX(session_total_distance_meters),
    MAX(session_total_reps)
  FROM (
    SELECT
      wel.variation_id,
      wel.alias_id,
      MAX(wesl.weight_kg) AS session_max_weight_kg,
      COALESCE(SUM(wesl.weight_kg * wesl.reps), 0) AS session_max_volume_kg,
      MAX(wesl.reps) AS session_max_reps,
      COUNT(*)::INTEGER AS session_sets_count,
      MAX(wesl.duration_seconds) AS session_max_duration_seconds,
      MAX(wesl.distance_meters) AS session_max_distance_meters,
      SUM(wesl.duration_seconds) AS session_total_duration_seconds,
      SUM(wesl.distance_meters) AS session_total_distance_meters,
      SUM(wesl.reps) AS session_total_reps
    FROM workout_logs wl
    JOIN workout_exercise_logs wel ON wel.workout_log_id = wl.id
    JOIN workout_exercise_set_logs wesl ON wesl.workout_exercise_log_id = wel.id
    WHERE wl.user_id = p_user_id
      AND wl.deleted_at IS NULL
      AND wel.exercise_type = 'strength'
      AND wel.variation_id = ANY(p_variation_ids)
      AND wel.alias_id IS NOT NULL
      AND (v_include_warmup OR wesl.set_type <> 'warmup')
    GROUP BY wl.id, wel.variation_id, wel.alias_id
  ) per_session
  GROUP BY variation_id, alias_id;
END;
$$;

-- ----------------------------------------------------------------------------
-- wt_get_exercise_history: por sessão passa a projetar também o total de reps;
-- o objeto records expõe o novo recorde. Assinatura inalterada — CREATE OR REPLACE.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION "public"."wt_get_exercise_history"("p_user_id" "uuid", "p_variation_id" "uuid", "p_alias_id" "uuid" DEFAULT NULL) RETURNS "jsonb"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  actor_id uuid;
  v_variation jsonb;
  v_result jsonb;
BEGIN
  actor_id := auth.uid();

  IF actor_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF p_user_id <> actor_id
     AND NOT public.is_active_coach_of(actor_id, p_user_id) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  SELECT jsonb_build_object(
    'exercise_name', e.name,
    'exercise_slug', e.slug,
    'variation_name', v.name,
    'variation_slug', v.slug,
    'equipment_slug', eq.slug,
    'equipment_preposition', eq.preposition,
    'muscle_slug', m.slug,
    'secondary_muscle_slug', sm.slug,
    'measurement_type', v.measurement_type,
    'youtube_url', v.video_url,
    'uploaded_video_object_key', vv.object_key,
    'variation_user_id', v.user_id,
    'variation_deleted_at', v.deleted_at,
    'variation_deleted_by', v.deleted_by,
    'variation_deleted_by_name', p.full_name
  )
  INTO v_variation
  FROM public.variations v
  JOIN public.exercises e ON e.id = v.exercise_id
  JOIN public.equipments eq ON eq.id = v.equipment_id
  JOIN public.muscles m ON m.id = v.muscle_id
  LEFT JOIN public.muscles sm ON sm.id = v.secondary_muscle_id
  LEFT JOIN public.variation_videos vv ON vv.variation_id = v.id
  LEFT JOIN public.profiles p ON p.id = v.deleted_by
  WHERE v.id = p_variation_id;

  IF v_variation IS NULL THEN
    RAISE EXCEPTION 'Variation not found' USING ERRCODE = 'P0002';
  END IF;

  WITH session_stats AS (
    SELECT
      wl.id AS workout_log_id,
      wl.started_at,
      jsonb_build_object(
        'workout_log_id', wl.id,
        'started_at', wl.started_at,
        'max_weight_kg', MAX(wesl.weight_kg) FILTER (WHERE wesl.set_type <> 'warmup'),
        'total_volume_kg', COALESCE(SUM(wesl.weight_kg * wesl.reps) FILTER (WHERE wesl.set_type <> 'warmup'), 0),
        'max_reps', MAX(wesl.reps) FILTER (WHERE wesl.set_type <> 'warmup'),
        'total_sets', COUNT(*) FILTER (WHERE wesl.set_type <> 'warmup')::integer,
        'max_duration_seconds', MAX(wesl.duration_seconds) FILTER (WHERE wesl.set_type <> 'warmup'),
        'max_distance_meters', MAX(wesl.distance_meters) FILTER (WHERE wesl.set_type <> 'warmup'),
        'total_duration_seconds', SUM(wesl.duration_seconds) FILTER (WHERE wesl.set_type <> 'warmup'),
        'total_distance_meters', SUM(wesl.distance_meters) FILTER (WHERE wesl.set_type <> 'warmup'),
        'total_reps', SUM(wesl.reps) FILTER (WHERE wesl.set_type <> 'warmup'),
        'sets', jsonb_agg(
          jsonb_build_object(
            'set_order', wesl.set_order,
            'set_type', wesl.set_type,
            'weight_kg', wesl.weight_kg,
            'reps', wesl.reps,
            'reps_min', wesl.reps_min,
            'reps_max', wesl.reps_max,
            'duration_seconds', wesl.duration_seconds,
            'distance_meters', wesl.distance_meters
          ) ORDER BY wesl.set_order
        )
      ) AS session_obj,
      row_number() OVER (ORDER BY wl.started_at DESC, wl.id DESC) AS rn
    FROM public.workout_logs wl
    JOIN public.workout_exercise_logs wel ON wel.workout_log_id = wl.id
    JOIN public.workout_exercise_set_logs wesl ON wesl.workout_exercise_log_id = wel.id
    WHERE wl.user_id = p_user_id
      AND wel.variation_id = p_variation_id
      AND wl.deleted_at IS NULL
      AND (p_alias_id IS NULL OR wel.alias_id = p_alias_id)
    GROUP BY wl.id, wl.started_at
  )
  SELECT jsonb_build_object(
    'variation_id', p_variation_id,
    'variation', v_variation,
    'sessions', COALESCE(
      (SELECT jsonb_agg(session_obj ORDER BY started_at ASC) FROM session_stats WHERE rn <= 10),
      '[]'::jsonb
    ),
    'last_session', (
      SELECT session_obj FROM session_stats WHERE rn = 1
    ),
    'records', COALESCE(
      (
        SELECT jsonb_build_object(
          'max_weight_kg', wvr.max_weight_kg,
          'max_volume_kg', wvr.max_volume_kg,
          'max_reps', wvr.max_reps,
          'max_sets', wvr.max_sets,
          'max_duration_seconds', wvr.max_duration_seconds,
          'max_distance_meters', wvr.max_distance_meters,
          'max_total_duration_seconds', wvr.max_total_duration_seconds,
          'max_total_distance_meters', wvr.max_total_distance_meters,
          'max_total_reps', wvr.max_total_reps
        )
        FROM public.workout_variation_records wvr
        WHERE wvr.user_id = p_user_id
          AND wvr.variation_id = p_variation_id
          AND wvr.alias_id IS NOT DISTINCT FROM p_alias_id
      ),
      jsonb_build_object(
        'max_weight_kg', NULL,
        'max_volume_kg', NULL,
        'max_reps', NULL,
        'max_sets', NULL,
        'max_duration_seconds', NULL,
        'max_distance_meters', NULL,
        'max_total_duration_seconds', NULL,
        'max_total_distance_meters', NULL,
        'max_total_reps', NULL
      )
    )
  )
  INTO v_result;

  RETURN v_result;
END;
$$;
