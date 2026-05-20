CREATE OR REPLACE FUNCTION "public"."get_exercise_history"("p_user_id" "uuid", "p_variation_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
-- NOTE: "exercise" in the API is the user-facing term; internally we operate at the
-- variation level. p_variation_id is the id sent by the client and matches public.variations.id.
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
    'variation_name', v.name,
    'equipment_slug', eq.slug,
    'equipment_preposition', eq.preposition,
    'muscle_slug', m.slug,
    'secondary_muscle_slug', sm.slug,
    'youtube_url', v.video_url,
    'uploaded_video_object_key', vv.object_key,
    -- NULL for global library variations, the owner's id for user-created ones.
    -- The API uses this to decide between a public URL and a presigned one.
    'variation_user_id', v.user_id
  )
  INTO v_variation
  FROM public.variations v
  JOIN public.exercises e ON e.id = v.exercise_id
  JOIN public.equipments eq ON eq.id = v.equipment_id
  JOIN public.muscles m ON m.id = v.muscle_id
  LEFT JOIN public.muscles sm ON sm.id = v.secondary_muscle_id
  LEFT JOIN public.variation_videos vv ON vv.variation_id = v.id
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
        'sets', jsonb_agg(
          jsonb_build_object(
            'set_order', wesl.set_order,
            'set_type', wesl.set_type,
            'weight_kg', wesl.weight_kg,
            'reps', wesl.reps,
            'reps_min', wesl.reps_min,
            'reps_max', wesl.reps_max
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
          'max_sets', wvr.max_sets
        )
        FROM public.workout_variation_records wvr
        WHERE wvr.user_id = p_user_id AND wvr.variation_id = p_variation_id
      ),
      jsonb_build_object(
        'max_weight_kg', NULL,
        'max_volume_kg', NULL,
        'max_reps', NULL,
        'max_sets', NULL
      )
    )
  )
  INTO v_result;

  RETURN v_result;
END;
$$;


ALTER FUNCTION "public"."get_exercise_history"("p_user_id" "uuid", "p_variation_id" "uuid") OWNER TO "postgres";


GRANT ALL ON FUNCTION "public"."get_exercise_history"("p_user_id" "uuid", "p_variation_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_exercise_history"("p_user_id" "uuid", "p_variation_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_exercise_history"("p_user_id" "uuid", "p_variation_id" "uuid") TO "service_role";
