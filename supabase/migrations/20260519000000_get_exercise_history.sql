-- ================================================
-- variation_videos.uploaded_by passa a aceitar NULL.
-- Vídeos da biblioteca pública não têm dono — a visibilidade já é
-- inferível por variations.user_id, então um uploaded_by artificial é
-- desnecessário. NULL mantém esses vídeos sem dono explícito.
-- ================================================
ALTER TABLE "public"."variation_videos" ALTER COLUMN "uploaded_by" DROP NOT NULL;


-- ================================================
-- Slugs públicos para exercises e variations.
-- A coluna é NULL nas linhas de usuário (privadas) e só é preenchida
-- nas linhas públicas da biblioteca global (user_id IS NULL). O slug
-- usa camelCase para servir de chave direta nos arquivos .ts de
-- tradução, sem necessidade de aspas.
-- ================================================
ALTER TABLE "public"."exercises" ADD COLUMN "slug" "text";
ALTER TABLE "public"."variations" ADD COLUMN "slug" "text";

ALTER TABLE ONLY "public"."exercises"
    ADD CONSTRAINT "exercises_slug_unique" UNIQUE ("slug");
ALTER TABLE ONLY "public"."variations"
    ADD CONSTRAINT "variations_slug_unique" UNIQUE ("slug");

    -- ------------------------------------------------
    -- variations_view: novas colunas anexadas ao final
    -- (CREATE OR REPLACE VIEW só permite adicionar colunas no fim).
    -- ------------------------------------------------
    CREATE OR REPLACE VIEW "public"."variations_view" WITH ("security_invoker"='true') AS
     SELECT "v"."id",
        "v"."name",
        "v"."exercise_id",
        "e"."name" AS "exercise_name",
        "e"."exercise_type",
        "v"."muscle_id",
        "m"."name" AS "muscle_name",
        "m"."slug" AS "muscle_slug",
        COALESCE("m_parent"."name", "m"."name") AS "muscle_level2_name",
        COALESCE("m_parent"."slug", "m"."slug") AS "muscle_level2_slug",
        "v"."secondary_muscle_id",
        "sm"."name" AS "secondary_muscle_name",
        "sm"."slug" AS "secondary_muscle_slug",
        "v"."equipment_id",
        "eq"."name" AS "equipment_name",
        "eq"."slug" AS "equipment_slug",
        "eq"."preposition" AS "equipment_preposition",
        "v"."video_url",
        "v"."image_url",
        "v"."user_id",
        "vv"."object_key" AS "video_object_key",
        "vv"."thumbnail_key" AS "video_thumbnail_key",
        "vv"."duration_seconds" AS "video_duration_seconds",
        "vv"."processing_status" AS "video_processing_status",
        "v"."slug" AS "variation_slug",
        "e"."slug" AS "exercise_slug"
       FROM (((((("public"."variations" "v"
         JOIN "public"."exercises" "e" ON (("e"."id" = "v"."exercise_id")))
         JOIN "public"."muscles" "m" ON (("m"."id" = "v"."muscle_id")))
         LEFT JOIN "public"."muscles" "m_parent" ON ((("m"."level" = 3) AND ("m_parent"."id" = "m"."parent_id"))))
         LEFT JOIN "public"."muscles" "sm" ON (("sm"."id" = "v"."secondary_muscle_id")))
         JOIN "public"."equipments" "eq" ON (("eq"."id" = "v"."equipment_id")))
         LEFT JOIN "public"."variation_videos" "vv" ON (("vv"."variation_id" = "v"."id")));


    -- ------------------------------------------------
    -- list_variation_views_for_mobile: precisa de DROP porque o tipo de
    -- retorno (RETURNS TABLE) muda — CREATE OR REPLACE não altera assinatura.
    -- ------------------------------------------------
    DROP FUNCTION IF EXISTS "public"."list_variation_views_for_mobile"("uuid", "uuid"[], "uuid"[], "text", "text"[]);

    CREATE FUNCTION "public"."list_variation_views_for_mobile"("p_user_id" "uuid", "p_muscle_ids" "uuid"[], "p_equipment_ids" "uuid"[], "p_visibility" "text", "p_exercise_types" "text"[]) RETURNS TABLE("id" "uuid", "name" "text", "exercise_id" "uuid", "exercise_name" "text", "exercise_type" "text", "muscle_id" "uuid", "muscle_name" "text", "muscle_slug" "text", "muscle_level2_name" "text", "muscle_level2_slug" "text", "secondary_muscle_id" "uuid", "secondary_muscle_name" "text", "secondary_muscle_slug" "text", "equipment_id" "uuid", "equipment_name" "text", "equipment_slug" "text", "equipment_preposition" "text", "video_url" "text", "image_url" "text", "user_id" "uuid", "video_object_key" "text", "video_thumbnail_key" "text", "video_duration_seconds" integer, "video_processing_status" "text", "variation_slug" "text", "exercise_slug" "text")
        LANGUAGE "sql" STABLE
        SET "search_path" TO 'public'
        AS $$
      WITH RECURSIVE expanded_muscles AS (
        SELECT m.id FROM public.muscles m WHERE m.id = ANY(p_muscle_ids)
        UNION
        SELECT m.id FROM public.muscles m
        JOIN expanded_muscles em ON m.parent_id = em.id
      )
      SELECT
        vv.id,
        vv.name,
        vv.exercise_id,
        vv.exercise_name,
        vv.exercise_type,
        vv.muscle_id,
        vv.muscle_name,
        vv.muscle_slug,
        vv.muscle_level2_name,
        vv.muscle_level2_slug,
        vv.secondary_muscle_id,
        vv.secondary_muscle_name,
        vv.secondary_muscle_slug,
        vv.equipment_id,
        vv.equipment_name,
        vv.equipment_slug,
        vv.equipment_preposition,
        vv.video_url,
        vv.image_url,
        vv.user_id,
        vv.video_object_key,
        vv.video_thumbnail_key,
        vv.video_duration_seconds,
        vv.video_processing_status,
        vv.variation_slug,
        vv.exercise_slug
      FROM public.variations_view vv
      WHERE
        (p_visibility <> 'public' OR vv.user_id IS NULL)
        AND (
          p_visibility <> 'private'
          OR vv.user_id = p_user_id
          OR EXISTS (
            SELECT 1
            FROM public.shared_variations sv
            WHERE sv.variation_id = vv.id
              AND sv.shared_with_id = p_user_id
          )
        )
        AND (
          COALESCE(array_length(p_muscle_ids, 1), 0) = 0
          OR vv.muscle_id IN (SELECT id FROM expanded_muscles)
        )
        AND (
          COALESCE(array_length(p_equipment_ids, 1), 0) = 0
          OR vv.equipment_id = ANY(p_equipment_ids)
        )
        AND (
          COALESCE(array_length(p_exercise_types, 1), 0) = 0
          OR vv.exercise_type = ANY(p_exercise_types)
        );
    $$;


    ALTER FUNCTION "public"."list_variation_views_for_mobile"("p_user_id" "uuid", "p_muscle_ids" "uuid"[], "p_equipment_ids" "uuid"[], "p_visibility" "text", "p_exercise_types" "text"[]) OWNER TO "postgres";

    GRANT ALL ON FUNCTION "public"."list_variation_views_for_mobile"("p_user_id" "uuid", "p_muscle_ids" "uuid"[], "p_equipment_ids" "uuid"[], "p_visibility" "text", "p_exercise_types" "text"[]) TO "anon";
    GRANT ALL ON FUNCTION "public"."list_variation_views_for_mobile"("p_user_id" "uuid", "p_muscle_ids" "uuid"[], "p_equipment_ids" "uuid"[], "p_visibility" "text", "p_exercise_types" "text"[]) TO "authenticated";
    GRANT ALL ON FUNCTION "public"."list_variation_views_for_mobile"("p_user_id" "uuid", "p_muscle_ids" "uuid"[], "p_equipment_ids" "uuid"[], "p_visibility" "text", "p_exercise_types" "text"[]) TO "service_role";


    -- ------------------------------------------------
    -- get_exercise_history: retorno continua jsonb, então CREATE OR REPLACE
    -- basta. Adiciona exercise_slug e variation_slug ao objeto da variação.
    -- ------------------------------------------------
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
        'exercise_slug', e.slug,
        'variation_name', v.name,
        'variation_slug', v.slug,
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
