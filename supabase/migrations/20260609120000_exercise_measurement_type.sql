-- ================================================================
-- Exercícios: measurement_type por variação + exercise_type fixo na UI.
--
-- O app deixa de expor/editar exercise_type (musculacao/preparatorio). A coluna
-- exercises.exercise_type permanece (contabilidade do PWA legado), mas passa a
-- receber sempre o DEFAULT 'musculacao' nos novos exercícios do app. Variações
-- ganham measurement_type com 4 valores próprios e independentes dos de
-- workout_sets: weight_reps, reps, duration, distance.
--
-- A ordem importa: variations_view depende das funções de listagem, então as
-- funções são derrubadas antes da view.
-- ================================================================

-- Derruba dependentes antes de recriar a view e as funções (mudam assinatura).
DROP FUNCTION IF EXISTS "public"."wt_list_exercises_summaries"("uuid", "uuid"[], "uuid"[], "text", "text"[]);
DROP FUNCTION IF EXISTS "public"."wt_create_user_exercise"("uuid", "text", "text", "text", "uuid", "uuid", "uuid", "text", "text", "text", smallint, integer, "text");
DROP FUNCTION IF EXISTS "public"."wt_update_user_exercise"("uuid", "text", "text", "text", "uuid", "uuid", "uuid", "text", "text", "text", smallint, integer, "text");

-- ----------------------------------------------------------------
-- variations.measurement_type: adicionada nullable para permitir o backfill,
-- depois SET NOT NULL. O CHECK fixa o conjunto de 4 valores do módulo.
-- ----------------------------------------------------------------
ALTER TABLE "public"."variations"
  ADD COLUMN "measurement_type" "text";

ALTER TABLE "public"."variations"
  ADD CONSTRAINT "variations_measurement_type_check"
    CHECK ("measurement_type" IN ('weight_reps', 'reps', 'duration', 'distance'));

-- Backfill por inferência: usa o measurement_type mais frequente entre os
-- workout_sets (templates) da variação, mapeando os 6 valores compostos para os
-- 4 do módulo — contém 'weight' -> weight_reps; senão contém 'duration' ->
-- duration; senão reps. Variações sem sets caem no fallback weight_reps.
-- 'distance' nunca é inferido (não existe em dados legados).
UPDATE public.variations v
SET measurement_type = COALESCE((
  SELECT CASE
    WHEN mode_mt LIKE '%weight%'   THEN 'weight_reps'
    WHEN mode_mt LIKE '%duration%' THEN 'duration'
    ELSE 'reps'
  END
  FROM (
    SELECT ws.measurement_type AS mode_mt
    FROM public.workout_sets ws
    JOIN public.workout_exercises we ON we.id = ws.workout_exercise_id
    WHERE we.variation_id = v.id
    GROUP BY ws.measurement_type
    ORDER BY count(*) DESC, ws.measurement_type ASC
    LIMIT 1
  ) most_frequent
), 'weight_reps');

-- DEFAULT mantém válido o INSERT "cru" de wt_copy_user_exercises (que não lista
-- measurement_type). NOT NULL fecha a invariante do módulo.
ALTER TABLE "public"."variations"
  ALTER COLUMN "measurement_type" SET DEFAULT 'weight_reps',
  ALTER COLUMN "measurement_type" SET NOT NULL;

-- ----------------------------------------------------------------
-- variations_view: recriada por inteiro (DROP + CREATE) para anexar
-- measurement_type ao final. Mantém e.exercise_type (PWA).
-- ----------------------------------------------------------------
DROP VIEW IF EXISTS "public"."variations_view";

CREATE VIEW "public"."variations_view" WITH ("security_invoker"='true') AS
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
    "e"."slug" AS "exercise_slug",
    "v"."deleted_at",
    "v"."measurement_type"
   FROM (((((("public"."variations" "v"
     JOIN "public"."exercises" "e" ON (("e"."id" = "v"."exercise_id")))
     JOIN "public"."muscles" "m" ON (("m"."id" = "v"."muscle_id")))
     LEFT JOIN "public"."muscles" "m_parent" ON ((("m"."level" = 3) AND ("m_parent"."id" = "m"."parent_id"))))
     LEFT JOIN "public"."muscles" "sm" ON (("sm"."id" = "v"."secondary_muscle_id")))
     JOIN "public"."equipments" "eq" ON (("eq"."id" = "v"."equipment_id")))
     LEFT JOIN "public"."variation_videos" "vv" ON (("vv"."variation_id" = "v"."id")));

-- ----------------------------------------------------------------
-- wt_list_exercises_summaries: recriada para devolver measurement_type. Mantém
-- a assinatura de args (p_exercise_types continua disponível para o PWA).
-- ----------------------------------------------------------------
CREATE FUNCTION "public"."wt_list_exercises_summaries"("p_user_id" "uuid", "p_muscle_ids" "uuid"[], "p_equipment_ids" "uuid"[], "p_visibility" "text", "p_exercise_types" "text"[], "p_measurement_types" "text"[]) RETURNS TABLE("id" "uuid", "name" "text", "exercise_id" "uuid", "exercise_name" "text", "exercise_type" "text", "muscle_id" "uuid", "muscle_name" "text", "muscle_slug" "text", "muscle_level2_name" "text", "muscle_level2_slug" "text", "secondary_muscle_id" "uuid", "secondary_muscle_name" "text", "secondary_muscle_slug" "text", "equipment_id" "uuid", "equipment_name" "text", "equipment_slug" "text", "equipment_preposition" "text", "video_url" "text", "image_url" "text", "user_id" "uuid", "video_object_key" "text", "video_thumbnail_key" "text", "video_duration_seconds" integer, "video_processing_status" "text", "variation_slug" "text", "exercise_slug" "text", "measurement_type" "text")
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
    vv.exercise_slug,
    vv.measurement_type
  FROM public.variations_view vv
  WHERE
    (
      (p_visibility = 'public' AND vv.user_id IS NULL)
      OR (p_visibility = 'owned' AND vv.user_id = p_user_id)
      OR (
        p_visibility = 'shared'
        AND vv.user_id IS NOT NULL
        AND vv.user_id <> p_user_id
        AND EXISTS (
          SELECT 1
          FROM public.shared_variations sv
          WHERE sv.variation_id = vv.id
            AND sv.shared_with_id = p_user_id
        )
      )
      OR (
        p_visibility = 'all'
        AND (
          vv.user_id IS NULL
          OR vv.user_id = p_user_id
          OR EXISTS (
            SELECT 1
            FROM public.shared_variations sv
            WHERE sv.variation_id = vv.id
              AND sv.shared_with_id = p_user_id
          )
        )
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
    )
    AND (
      COALESCE(array_length(p_measurement_types, 1), 0) = 0
      OR vv.measurement_type = ANY(p_measurement_types)
    )
    AND vv.deleted_at IS NULL;
$$;

ALTER FUNCTION "public"."wt_list_exercises_summaries"("p_user_id" "uuid", "p_muscle_ids" "uuid"[], "p_equipment_ids" "uuid"[], "p_visibility" "text", "p_exercise_types" "text"[], "p_measurement_types" "text"[]) OWNER TO "postgres";

GRANT ALL ON FUNCTION "public"."wt_list_exercises_summaries"("p_user_id" "uuid", "p_muscle_ids" "uuid"[], "p_equipment_ids" "uuid"[], "p_visibility" "text", "p_exercise_types" "text"[], "p_measurement_types" "text"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."wt_list_exercises_summaries"("p_user_id" "uuid", "p_muscle_ids" "uuid"[], "p_equipment_ids" "uuid"[], "p_visibility" "text", "p_exercise_types" "text"[], "p_measurement_types" "text"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."wt_list_exercises_summaries"("p_user_id" "uuid", "p_muscle_ids" "uuid"[], "p_equipment_ids" "uuid"[], "p_visibility" "text", "p_exercise_types" "text"[], "p_measurement_types" "text"[]) TO "service_role";

-- ----------------------------------------------------------------
-- wt_create_user_exercise: grava measurement_type na variação e deixa o
-- exercise_type no DEFAULT 'musculacao' (o app não envia mais o tipo).
-- ----------------------------------------------------------------
CREATE FUNCTION "public"."wt_create_user_exercise"("p_variation_id" "uuid", "p_exercise_name" "text", "p_variation_name" "text", "p_measurement_type" "text", "p_muscle_id" "uuid", "p_equipment_id" "uuid", "p_secondary_muscle_id" "uuid" DEFAULT NULL::"uuid", "p_youtube_video_url" "text" DEFAULT NULL::"text", "p_video_object_key" "text" DEFAULT NULL::"text", "p_video_thumbnail_key" "text" DEFAULT NULL::"text", "p_video_duration_secs" smallint DEFAULT NULL::smallint, "p_video_size_bytes" integer DEFAULT NULL::integer, "p_video_content_type" "text" DEFAULT NULL::"text") RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_exercise_id uuid;
  v_inserted integer;
BEGIN
  -- The one invariant no constraint can cover: without an identity the INSERTs
  -- below would silently create public-library rows. 28000 = not authenticated.
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'wt_create_user_exercise called without an authenticated user'
      USING ERRCODE = '28000';
  END IF;

  -- Find-or-create the exercise: the client works at the variation level and
  -- sends only a name, so exercises are deduplicated per user by name. O tipo
  -- fica no DEFAULT 'musculacao' (o app não expõe mais exercise_type).
  SELECT id INTO v_exercise_id
  FROM public.exercises
  WHERE user_id = v_user_id AND name = p_exercise_name AND deleted_at IS NULL;

  IF v_exercise_id IS NULL THEN
    INSERT INTO public.exercises (name, user_id)
    VALUES (p_exercise_name, v_user_id)
    RETURNING id INTO v_exercise_id;
  END IF;

  -- Insert the variation with the frontend-supplied id. variations.user_id is
  -- filled by the variations_sync_scope trigger. A repeated p_variation_id or a
  -- duplicate (exercise, equipment, name) raises unique_violation (23505).
  INSERT INTO public.variations (
    id, name, exercise_id, muscle_id, equipment_id, secondary_muscle_id, video_url, measurement_type
  )
  VALUES (
    p_variation_id, p_variation_name, v_exercise_id, p_muscle_id, p_equipment_id,
    p_secondary_muscle_id, p_youtube_video_url, p_measurement_type
  );
  GET DIAGNOSTICS v_inserted = ROW_COUNT;

  -- Persist the uploaded device video, if any, in the same transaction. The
  -- variation_videos_dispatch_transcode trigger dispatches the transcode.
  IF p_video_object_key IS NOT NULL THEN
    INSERT INTO public.variation_videos (
      variation_id, object_key, thumbnail_key,
      duration_seconds, size_bytes, content_type, uploaded_by
    )
    VALUES (
      p_variation_id, p_video_object_key, p_video_thumbnail_key,
      p_video_duration_secs, p_video_size_bytes, p_video_content_type, v_user_id
    );
  END IF;

  RETURN v_inserted;
END;
$$;

ALTER FUNCTION "public"."wt_create_user_exercise"("p_variation_id" "uuid", "p_exercise_name" "text", "p_variation_name" "text", "p_measurement_type" "text", "p_muscle_id" "uuid", "p_equipment_id" "uuid", "p_secondary_muscle_id" "uuid", "p_youtube_video_url" "text", "p_video_object_key" "text", "p_video_thumbnail_key" "text", "p_video_duration_secs" smallint, "p_video_size_bytes" integer, "p_video_content_type" "text") OWNER TO "postgres";

GRANT ALL ON FUNCTION "public"."wt_create_user_exercise"("p_variation_id" "uuid", "p_exercise_name" "text", "p_variation_name" "text", "p_measurement_type" "text", "p_muscle_id" "uuid", "p_equipment_id" "uuid", "p_secondary_muscle_id" "uuid", "p_youtube_video_url" "text", "p_video_object_key" "text", "p_video_thumbnail_key" "text", "p_video_duration_secs" smallint, "p_video_size_bytes" integer, "p_video_content_type" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."wt_create_user_exercise"("p_variation_id" "uuid", "p_exercise_name" "text", "p_variation_name" "text", "p_measurement_type" "text", "p_muscle_id" "uuid", "p_equipment_id" "uuid", "p_secondary_muscle_id" "uuid", "p_youtube_video_url" "text", "p_video_object_key" "text", "p_video_thumbnail_key" "text", "p_video_duration_secs" smallint, "p_video_size_bytes" integer, "p_video_content_type" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."wt_create_user_exercise"("p_variation_id" "uuid", "p_exercise_name" "text", "p_variation_name" "text", "p_measurement_type" "text", "p_muscle_id" "uuid", "p_equipment_id" "uuid", "p_secondary_muscle_id" "uuid", "p_youtube_video_url" "text", "p_video_object_key" "text", "p_video_thumbnail_key" "text", "p_video_duration_secs" smallint, "p_video_size_bytes" integer, "p_video_content_type" "text") TO "service_role";

-- ----------------------------------------------------------------
-- wt_update_user_exercise: atualiza measurement_type da variação. Não mexe mais
-- em exercise_type (mantém o valor legado da linha; novos exercícios usam o
-- DEFAULT). P0002 quando a variação não é do usuário.
-- ----------------------------------------------------------------
CREATE FUNCTION "public"."wt_update_user_exercise"("p_variation_id" "uuid", "p_exercise_name" "text", "p_variation_name" "text", "p_measurement_type" "text", "p_muscle_id" "uuid", "p_equipment_id" "uuid", "p_secondary_muscle_id" "uuid" DEFAULT NULL::"uuid", "p_youtube_video_url" "text" DEFAULT NULL::"text", "p_video_object_key" "text" DEFAULT NULL::"text", "p_video_thumbnail_key" "text" DEFAULT NULL::"text", "p_video_duration_secs" smallint DEFAULT NULL::smallint, "p_video_size_bytes" integer DEFAULT NULL::integer, "p_video_content_type" "text" DEFAULT NULL::"text") RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_exercise_id uuid;
  v_current_object_key text;
  v_updated integer;
BEGIN
  -- Sem identidade não há como confirmar a posse da variação. 28000 = not authenticated.
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'wt_update_user_exercise called without an authenticated user'
      USING ERRCODE = '28000';
  END IF;

  -- A variação precisa existir e pertencer ao usuário. P0002 = no_data_found,
  -- traduzido para 404 pela API.
  IF NOT EXISTS (
    SELECT 1 FROM public.variations
    WHERE id = p_variation_id AND user_id = v_user_id AND deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Variation not found' USING ERRCODE = 'P0002';
  END IF;

  -- Find-or-create do exercício pelo (novo) nome, deduplicado por usuário. O
  -- exercise_type não é mais tocado aqui (linhas legadas preservam o valor;
  -- novas usam o DEFAULT 'musculacao').
  SELECT id INTO v_exercise_id
  FROM public.exercises
  WHERE user_id = v_user_id AND name = p_exercise_name AND deleted_at IS NULL;

  IF v_exercise_id IS NULL THEN
    INSERT INTO public.exercises (name, user_id)
    VALUES (p_exercise_name, v_user_id)
    RETURNING id INTO v_exercise_id;
  END IF;

  -- Re-aponta e atualiza a variação. Uma colisão de (exercise_id, equipment_id,
  -- name) raises unique_violation (23505).
  UPDATE public.variations
  SET exercise_id = v_exercise_id,
      name = p_variation_name,
      muscle_id = p_muscle_id,
      equipment_id = p_equipment_id,
      secondary_muscle_id = p_secondary_muscle_id,
      video_url = p_youtube_video_url,
      measurement_type = p_measurement_type
  WHERE id = p_variation_id;
  GET DIAGNOSTICS v_updated = ROW_COUNT;

  -- Sincroniza o vídeo do dispositivo. Só mexe em variation_videos quando o
  -- object_key muda, para não re-disparar o trigger de transcode sem motivo.
  SELECT object_key INTO v_current_object_key
  FROM public.variation_videos
  WHERE variation_id = p_variation_id;

  IF p_video_object_key IS DISTINCT FROM v_current_object_key THEN
    DELETE FROM public.variation_videos WHERE variation_id = p_variation_id;

    IF p_video_object_key IS NOT NULL THEN
      INSERT INTO public.variation_videos (
        variation_id, object_key, thumbnail_key,
        duration_seconds, size_bytes, content_type, uploaded_by
      )
      VALUES (
        p_variation_id, p_video_object_key, p_video_thumbnail_key,
        p_video_duration_secs, p_video_size_bytes, p_video_content_type, v_user_id
      );
    END IF;
  END IF;

  RETURN v_updated;
END;
$$;

ALTER FUNCTION "public"."wt_update_user_exercise"("p_variation_id" "uuid", "p_exercise_name" "text", "p_variation_name" "text", "p_measurement_type" "text", "p_muscle_id" "uuid", "p_equipment_id" "uuid", "p_secondary_muscle_id" "uuid", "p_youtube_video_url" "text", "p_video_object_key" "text", "p_video_thumbnail_key" "text", "p_video_duration_secs" smallint, "p_video_size_bytes" integer, "p_video_content_type" "text") OWNER TO "postgres";

GRANT ALL ON FUNCTION "public"."wt_update_user_exercise"("p_variation_id" "uuid", "p_exercise_name" "text", "p_variation_name" "text", "p_measurement_type" "text", "p_muscle_id" "uuid", "p_equipment_id" "uuid", "p_secondary_muscle_id" "uuid", "p_youtube_video_url" "text", "p_video_object_key" "text", "p_video_thumbnail_key" "text", "p_video_duration_secs" smallint, "p_video_size_bytes" integer, "p_video_content_type" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."wt_update_user_exercise"("p_variation_id" "uuid", "p_exercise_name" "text", "p_variation_name" "text", "p_measurement_type" "text", "p_muscle_id" "uuid", "p_equipment_id" "uuid", "p_secondary_muscle_id" "uuid", "p_youtube_video_url" "text", "p_video_object_key" "text", "p_video_thumbnail_key" "text", "p_video_duration_secs" smallint, "p_video_size_bytes" integer, "p_video_content_type" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."wt_update_user_exercise"("p_variation_id" "uuid", "p_exercise_name" "text", "p_variation_name" "text", "p_measurement_type" "text", "p_muscle_id" "uuid", "p_equipment_id" "uuid", "p_secondary_muscle_id" "uuid", "p_youtube_video_url" "text", "p_video_object_key" "text", "p_video_thumbnail_key" "text", "p_video_duration_secs" smallint, "p_video_size_bytes" integer, "p_video_content_type" "text") TO "service_role";

-- ----------------------------------------------------------------
-- wt_get_exercise_history: a tela de detalhes passa a expor measurement_type. A
-- função monta o objeto `variation` direto das tabelas base (não usa a view),
-- então basta um CREATE OR REPLACE (assinatura inalterada) adicionando o campo.
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION "public"."wt_get_exercise_history"("p_user_id" "uuid", "p_variation_id" "uuid", "p_alias_id" "uuid" DEFAULT NULL) RETURNS "jsonb"
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
          'max_sets', wvr.max_sets
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
        'max_sets', NULL
      )
    )
  )
  INTO v_result;

  RETURN v_result;
END;
$$;
