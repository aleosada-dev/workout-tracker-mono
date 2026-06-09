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

-- ================================================================
-- Remoção de workout_sets.measurement_type (template).
--
-- A medição do set agora é governada pela variação (variations.measurement_type),
-- então a coluna nos templates é redundante. O LOG (workout_exercise_set_logs)
-- MANTÉM measurement_type — é o histórico fiel da execução.
--
-- Tudo que ainda lia ws.measurement_type passa a derivar de v.measurement_type.
-- Ordem: recriar a view/funções dependentes ANTES do DROP (a view bloqueia o
-- drop; os corpos plpgsql quebrariam em runtime). O backfill de
-- variations.measurement_type (acima) já rodou e ainda lê a coluna, por isso o
-- DROP fica por último.
-- ================================================================

-- ----------------------------------------------------------------
-- workout_preparatory_exercises: duration_type passa a vir da variação.
-- ----------------------------------------------------------------
CREATE OR REPLACE VIEW public.workout_preparatory_exercises
WITH (security_invoker = true) AS
SELECT
  we.id,
  we.workout_id,
  we.variation_id,
  we.position,
  -- duration_type derivado da variação (reps -> 'reps'; demais -> 'time').
  CASE WHEN v.measurement_type = 'reps' THEN 'reps' ELSE 'time' END AS duration_type,
  we.note,
  we.created_at,
  we.updated_at
FROM public.workout_exercises we
LEFT JOIN public.variations v ON v.id = we.variation_id
WHERE we.exercise_type = 'preparatory';

-- ----------------------------------------------------------------
-- wt_prep_sets_view_insert: não grava mais measurement_type (coluna some).
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.wt_prep_sets_view_insert() RETURNS trigger
  LANGUAGE plpgsql SECURITY INVOKER SET search_path TO 'public' AS $$
DECLARE
  v_id uuid := COALESCE(NEW.id, gen_random_uuid());
BEGIN
  -- set_type é sempre 'normal' (preparatório não tem warmup/drop/cluster).
  INSERT INTO public.workout_sets (
    id, workout_exercise_id, set_order, set_type, reps_min, reps_max,
    linked_set_id, load_percent_of_previous, duration_seconds
  )
  VALUES (
    v_id, NEW.workout_preparatory_exercise_id,
    NEW.set_order, 'normal', NEW.reps, NEW.reps, NULL, NULL,
    NEW.duration_seconds
  );
  NEW.id := v_id;
  RETURN NEW;
END;
$$;

-- ----------------------------------------------------------------
-- get_workout: as 4 leituras de ws.measurement_type passam a v.measurement_type
-- (a variação já está no JOIN dos dois blocos).
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_workout(p_workout_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
    AS $$
DECLARE
  actor_id uuid;
  result jsonb;
BEGIN
  actor_id := auth.uid();

  IF actor_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.workouts w
    WHERE w.id = p_workout_id
      AND (
        w.user_id = actor_id
        OR public.is_active_coach_of(actor_id, w.user_id)
      )
  ) THEN
    RETURN NULL;
  END IF;

  SELECT jsonb_build_object(
    'workout',
    jsonb_build_object(
      'id', w.id,
      'user_id', w.user_id,
      'name', w.name,
      'description', w.description,
      'folder_id', w.folder_id,
      'archived_at', w.archived_at,
      'created_by', w.created_by,
      'updated_by', w.updated_by,
      'created_at', w.created_at,
      'updated_at', w.updated_at
    ),
    'exercises',
    COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', we.id,
            'variation_id', we.variation_id,
            'variation_name', v.name,
            'exercise_id', e.id,
            'name', e.name,
            'equipment_name', eq.name,
            'equipment_preposition', eq.preposition,
            'video_url', v.video_url,
            'video_object_key', vv.object_key,
            'video_thumbnail_key', vv.thumbnail_key,
            'video_duration_seconds', vv.duration_seconds,
            'image_url', v.image_url,
            'muscle_id', v.muscle_id,
            'muscle_name', m.name,
            'secondary_muscle_id', v.secondary_muscle_id,
            'secondary_muscle_name', sm.name,
            'note', we.note,
            'rest_seconds', we.rest_seconds,
            'position', we.position,
            'superset_group_id', we.superset_group_id,
            'superset_order', we.superset_order,
            'measurement_type', v.measurement_type,
            'sets',
            COALESCE(
              (
                SELECT jsonb_agg(
                  jsonb_build_object(
                    'id', ws.id,
                    'linked_set_id', ws.linked_set_id,
                    'reps_min', ws.reps_min,
                    'reps_max', ws.reps_max,
                    'duration_seconds', ws.duration_seconds,
                    'set_order', ws.set_order,
                    'set_type', ws.set_type,
                    'measurement_type', v.measurement_type,
                    'load_percent_of_previous', ws.load_percent_of_previous
                  )
                  ORDER BY ws.set_order ASC, ws.id ASC
                )
                FROM public.workout_sets ws
                WHERE ws.workout_exercise_id = we.id
              ),
              '[]'::jsonb
            )
          )
          ORDER BY we.position ASC, we.superset_order ASC
        )
        FROM public.workout_exercises we
        JOIN public.variations v ON v.id = we.variation_id
        JOIN public.exercises e ON e.id = v.exercise_id
        JOIN public.equipments eq ON eq.id = v.equipment_id
        JOIN public.muscles m ON m.id = v.muscle_id
        LEFT JOIN public.muscles sm ON sm.id = v.secondary_muscle_id
        LEFT JOIN public.variation_videos vv ON vv.variation_id = v.id
        WHERE we.workout_id = w.id
          AND we.exercise_type = 'strength'
      ),
      '[]'::jsonb
    ),
    'preparatory_exercises',
    COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', we.id,
            'variation_id', we.variation_id,
            'variation_name', v.name,
            'exercise_name', e.name,
            'muscle_name', m.name,
            'equipment_name', eq.name,
            'equipment_preposition', eq.preposition,
            'video_url', v.video_url,
            'video_object_key', vv.object_key,
            'video_thumbnail_key', vv.thumbnail_key,
            'video_duration_seconds', vv.duration_seconds,
            'position', we.position,
            'duration_type', CASE WHEN v.measurement_type = 'reps' THEN 'reps' ELSE 'time' END,
            'measurement_type', v.measurement_type,
            'note', we.note,
            'sets',
            COALESCE(
              (
                SELECT jsonb_agg(
                  jsonb_build_object(
                    'id', ws.id,
                    'set_order', ws.set_order,
                    'duration_seconds', ws.duration_seconds,
                    'reps', ws.reps_min
                  )
                  ORDER BY ws.set_order ASC, ws.id ASC
                )
                FROM public.workout_sets ws
                WHERE ws.workout_exercise_id = we.id
              ),
              '[]'::jsonb
            )
          )
          ORDER BY we.position ASC
        )
        FROM public.workout_exercises we
        JOIN public.variations v ON v.id = we.variation_id
        JOIN public.exercises e ON e.id = v.exercise_id
        JOIN public.muscles m ON m.id = v.muscle_id
        JOIN public.equipments eq ON eq.id = v.equipment_id
        LEFT JOIN public.variation_videos vv ON vv.variation_id = v.id
        WHERE we.workout_id = w.id
          AND we.exercise_type = 'preparatory'
      ),
      '[]'::jsonb
    )
  )
  INTO result
  FROM public.workouts w
  WHERE w.id = p_workout_id;

  RETURN result;
END;
$$;

-- ----------------------------------------------------------------
-- copy_workout: a cópia de workout_sets deixa de listar measurement_type.
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.copy_workout(p_source_workout_id uuid, p_target_user_id uuid) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
    AS $$
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
    id, user_id, name, description, created_by, updated_by
  )
  VALUES (
    v_new_workout_id, p_target_user_id, v_source_workout.name,
    v_source_workout.description, v_coach_id, v_coach_id
  );

  DROP TABLE IF EXISTS temp_exercise_mapping;
  CREATE TEMP TABLE temp_exercise_mapping (old_id uuid, new_id uuid);

  INSERT INTO public.workout_exercises (
    id, workout_id, variation_id, note, rest_seconds, position,
    superset_group_id, superset_order
  )
  SELECT
    gen_random_uuid(), v_new_workout_id, we.variation_id, we.note,
    we.rest_seconds, we.position, we.superset_group_id, we.superset_order
  FROM public.workout_exercises we
  WHERE we.workout_id = p_source_workout_id
    AND we.exercise_type = 'strength'
  ORDER BY we.position ASC, we.superset_order ASC;

  INSERT INTO temp_exercise_mapping (old_id, new_id)
  SELECT old_we.id, new_we.id
  FROM public.workout_exercises old_we
  JOIN public.workout_exercises new_we
    ON old_we.position = new_we.position
    AND old_we.superset_order = new_we.superset_order
  WHERE old_we.workout_id = p_source_workout_id
    AND old_we.exercise_type = 'strength'
    AND new_we.workout_id = v_new_workout_id
    AND new_we.exercise_type = 'strength';

  WITH distinct_old_groups AS (
    SELECT DISTINCT old_we.superset_group_id AS old_group_id
    FROM public.workout_exercises old_we
    WHERE old_we.workout_id = p_source_workout_id
      AND old_we.exercise_type = 'strength'
  ),
  group_sizes AS (
    SELECT superset_group_id AS old_group_id, COUNT(*) AS member_count
    FROM public.workout_exercises
    WHERE workout_id = p_source_workout_id
      AND exercise_type = 'strength'
    GROUP BY superset_group_id
  ),
  standalone_new_ids AS (
    SELECT old_we.superset_group_id AS old_group_id, tm.new_id AS new_group_id
    FROM public.workout_exercises old_we
    JOIN temp_exercise_mapping tm ON tm.old_id = old_we.id
    JOIN group_sizes gs ON gs.old_group_id = old_we.superset_group_id
    WHERE old_we.workout_id = p_source_workout_id
      AND old_we.exercise_type = 'strength'
      AND gs.member_count = 1
  ),
  group_mapping AS (
    SELECT dog.old_group_id,
           COALESCE(sni.new_group_id, gen_random_uuid()) AS new_group_id
    FROM distinct_old_groups dog
    LEFT JOIN standalone_new_ids sni ON sni.old_group_id = dog.old_group_id
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
    old_id uuid, new_id uuid, exercise_id uuid, set_order int, set_type text
  );

  INSERT INTO public.workout_sets (
    id, workout_exercise_id, set_order, set_type, reps_min, reps_max,
    linked_set_id, load_percent_of_previous, duration_seconds
  )
  SELECT
    gen_random_uuid(), tm.new_id, ws.set_order, ws.set_type, ws.reps_min,
    ws.reps_max, NULL::uuid, ws.load_percent_of_previous, ws.duration_seconds
  FROM public.workout_sets ws
  JOIN temp_exercise_mapping tm ON ws.workout_exercise_id = tm.old_id;

  INSERT INTO temp_set_mapping (old_id, new_id, exercise_id, set_order, set_type)
  SELECT old_ws.id, new_ws.id, new_ws.workout_exercise_id, new_ws.set_order, new_ws.set_type
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

  -- Copy preparatory exercises (via view workout_preparatory_*)
  DROP TABLE IF EXISTS temp_prep_exercise_mapping;
  CREATE TEMP TABLE temp_prep_exercise_mapping (old_id uuid, new_id uuid);

  INSERT INTO public.workout_preparatory_exercises (
    id, workout_id, variation_id, "position", duration_type, note
  )
  SELECT
    gen_random_uuid(), v_new_workout_id, wpe.variation_id, wpe.position,
    wpe.duration_type, wpe.note
  FROM public.workout_preparatory_exercises wpe
  WHERE wpe.workout_id = p_source_workout_id
  ORDER BY wpe.position ASC;

  INSERT INTO temp_prep_exercise_mapping (old_id, new_id)
  SELECT old_wpe.id, new_wpe.id
  FROM public.workout_preparatory_exercises old_wpe
  JOIN public.workout_preparatory_exercises new_wpe
    ON old_wpe.position = new_wpe.position
  WHERE old_wpe.workout_id = p_source_workout_id
    AND new_wpe.workout_id = v_new_workout_id;

  INSERT INTO public.workout_preparatory_sets (
    id, workout_preparatory_exercise_id, set_order, duration_seconds, reps
  )
  SELECT
    gen_random_uuid(), tpm.new_id, wps.set_order, wps.duration_seconds, wps.reps
  FROM public.workout_preparatory_sets wps
  JOIN temp_prep_exercise_mapping tpm ON wps.workout_preparatory_exercise_id = tpm.old_id;

  -- Auto-share coach variations with athlete
  INSERT INTO public.shared_variations (variation_id, owner_id, shared_with_id)
  SELECT DISTINCT v.id, v.user_id, p_target_user_id
  FROM public.workout_exercises we
  JOIN public.variations v ON v.id = we.variation_id
  WHERE we.workout_id = v_new_workout_id
    AND v.user_id IS NOT NULL
    AND v.user_id != p_target_user_id
  ON CONFLICT (variation_id, shared_with_id) DO NOTHING;

  RETURN v_new_workout_id;
END;
$$;

-- ----------------------------------------------------------------
-- wt_copy_workouts: a cópia de workout_sets deixa de listar measurement_type.
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.wt_copy_workouts(
  p_source_workout_ids uuid[],
  p_target_user_id uuid,
  p_target_folder_id uuid DEFAULT NULL
) RETURNS uuid[]
    LANGUAGE plpgsql SECURITY INVOKER SET search_path TO 'public'
    AS $$
DECLARE
  v_actor_id uuid := auth.uid();
  v_input_count int;
  v_inserted_count int;
  v_result uuid[];
BEGIN
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'wt_copy_workouts called without an authenticated user'
      USING ERRCODE = '28000';
  END IF;

  IF p_source_workout_ids IS NULL OR array_length(p_source_workout_ids, 1) IS NULL THEN
    RAISE EXCEPTION 'p_source_workout_ids must contain at least one id'
      USING ERRCODE = '22023';
  END IF;

  v_input_count := array_length(p_source_workout_ids, 1);

  IF p_target_folder_id IS NOT NULL THEN
    PERFORM 1 FROM public.workout_folders
     WHERE id = p_target_folder_id AND user_id = p_target_user_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'target folder not found for target user'
        USING ERRCODE = 'P0002';
    END IF;
  END IF;

  CREATE TEMP TABLE temp_workout_mapping (
    source_id uuid NOT NULL,
    new_id uuid NOT NULL DEFAULT gen_random_uuid(),
    ord int NOT NULL
  ) ON COMMIT DROP;

  INSERT INTO temp_workout_mapping (source_id, ord)
  SELECT t.id, t.ord
  FROM unnest(p_source_workout_ids) WITH ORDINALITY AS t(id, ord);

  WITH inserted AS (
    INSERT INTO public.workouts (
      id, user_id, name, description, folder_id, created_by, updated_by
    )
    SELECT
      m.new_id, p_target_user_id, w.name, w.description, p_target_folder_id,
      v_actor_id, v_actor_id
    FROM temp_workout_mapping m
    JOIN public.workouts w ON w.id = m.source_id
    RETURNING id
  )
  SELECT count(*) INTO v_inserted_count FROM inserted;

  IF v_inserted_count <> v_input_count THEN
    RAISE EXCEPTION 'one or more source workouts not found or inaccessible'
      USING ERRCODE = 'P0002';
  END IF;

  -- Copiar workout_exercises (bloco musculação). O bloco preparatório é
  -- copiado adiante via view workout_preparatory_*.
  CREATE TEMP TABLE temp_exercise_mapping (
    source_id uuid NOT NULL,
    new_id uuid NOT NULL DEFAULT gen_random_uuid(),
    source_workout_id uuid NOT NULL,
    new_workout_id uuid NOT NULL
  ) ON COMMIT DROP;

  INSERT INTO temp_exercise_mapping (source_id, source_workout_id, new_workout_id)
  SELECT we.id, we.workout_id, m.new_id
  FROM public.workout_exercises we
  JOIN temp_workout_mapping m ON m.source_id = we.workout_id
  WHERE we.exercise_type = 'strength';

  INSERT INTO public.workout_exercises (
    id, workout_id, variation_id, note, rest_seconds, position,
    superset_group_id, superset_order
  )
  SELECT
    em.new_id, em.new_workout_id, we.variation_id, we.note, we.rest_seconds,
    we.position, we.superset_group_id, we.superset_order
  FROM temp_exercise_mapping em
  JOIN public.workout_exercises we ON we.id = em.source_id;

  WITH groups AS (
    SELECT DISTINCT em.source_workout_id, we.superset_group_id AS old_group_id
    FROM temp_exercise_mapping em
    JOIN public.workout_exercises we ON we.id = em.source_id
  ),
  sizes AS (
    SELECT em.source_workout_id, we.superset_group_id AS old_group_id, count(*) AS member_count
    FROM temp_exercise_mapping em
    JOIN public.workout_exercises we ON we.id = em.source_id
    GROUP BY em.source_workout_id, we.superset_group_id
  ),
  standalone_new AS (
    SELECT em.source_workout_id, we.superset_group_id AS old_group_id, em.new_id AS new_group_id
    FROM temp_exercise_mapping em
    JOIN public.workout_exercises we ON we.id = em.source_id
    JOIN sizes s ON s.source_workout_id = em.source_workout_id
                AND s.old_group_id = we.superset_group_id
    WHERE s.member_count = 1
  ),
  group_map AS (
    SELECT g.source_workout_id, g.old_group_id,
           COALESCE(sn.new_group_id, gen_random_uuid()) AS new_group_id
    FROM groups g
    LEFT JOIN standalone_new sn ON sn.source_workout_id = g.source_workout_id
                               AND sn.old_group_id = g.old_group_id
  )
  UPDATE public.workout_exercises new_we
  SET superset_group_id = gm.new_group_id
  FROM temp_exercise_mapping em
  JOIN public.workout_exercises old_we ON old_we.id = em.source_id
  JOIN group_map gm ON gm.source_workout_id = em.source_workout_id
                   AND gm.old_group_id = old_we.superset_group_id
  WHERE new_we.id = em.new_id;

  CREATE TEMP TABLE temp_set_mapping (
    source_id uuid NOT NULL,
    new_id uuid NOT NULL,
    exercise_id uuid NOT NULL,
    set_order int NOT NULL,
    set_type text
  ) ON COMMIT DROP;

  WITH inserted_sets AS (
    INSERT INTO public.workout_sets (
      id, workout_exercise_id, set_order, set_type,
      reps_min, reps_max, linked_set_id, load_percent_of_previous,
      duration_seconds
    )
    SELECT
      gen_random_uuid(), em.new_id, ws.set_order, ws.set_type,
      ws.reps_min, ws.reps_max, NULL::uuid, ws.load_percent_of_previous,
      ws.duration_seconds
    FROM public.workout_sets ws
    JOIN temp_exercise_mapping em ON em.source_id = ws.workout_exercise_id
    RETURNING id, workout_exercise_id, set_order, set_type
  )
  INSERT INTO temp_set_mapping (source_id, new_id, exercise_id, set_order, set_type)
  SELECT old_ws.id, new_ws.id, new_ws.workout_exercise_id, new_ws.set_order, new_ws.set_type
  FROM inserted_sets new_ws
  JOIN temp_exercise_mapping em ON em.new_id = new_ws.workout_exercise_id
  JOIN public.workout_sets old_ws
    ON old_ws.workout_exercise_id = em.source_id
   AND old_ws.set_order = new_ws.set_order;

  UPDATE public.workout_sets ws
  SET linked_set_id = prev_set.new_id
  FROM temp_set_mapping curr_set
  JOIN temp_set_mapping prev_set
    ON curr_set.exercise_id = prev_set.exercise_id
   AND curr_set.set_order = prev_set.set_order + 1
  WHERE ws.id = curr_set.new_id
    AND curr_set.set_type IN ('drop', 'cluster');

  -- Copiar preparatory exercises + sets (via view).
  CREATE TEMP TABLE temp_prep_exercise_mapping (
    source_id uuid NOT NULL,
    new_id uuid NOT NULL DEFAULT gen_random_uuid(),
    source_workout_id uuid NOT NULL,
    new_workout_id uuid NOT NULL
  ) ON COMMIT DROP;

  INSERT INTO temp_prep_exercise_mapping (source_id, source_workout_id, new_workout_id)
  SELECT wpe.id, wpe.workout_id, m.new_id
  FROM public.workout_preparatory_exercises wpe
  JOIN temp_workout_mapping m ON m.source_id = wpe.workout_id;

  INSERT INTO public.workout_preparatory_exercises (
    id, workout_id, variation_id, "position", duration_type, note
  )
  SELECT
    pem.new_id, pem.new_workout_id, wpe.variation_id, wpe.position,
    wpe.duration_type, wpe.note
  FROM temp_prep_exercise_mapping pem
  JOIN public.workout_preparatory_exercises wpe ON wpe.id = pem.source_id;

  INSERT INTO public.workout_preparatory_sets (
    id, workout_preparatory_exercise_id, set_order, duration_seconds, reps
  )
  SELECT
    gen_random_uuid(), pem.new_id, wps.set_order, wps.duration_seconds, wps.reps
  FROM public.workout_preparatory_sets wps
  JOIN temp_prep_exercise_mapping pem ON pem.source_id = wps.workout_preparatory_exercise_id;

  PERFORM public.wt_share_variations_for_copy(
    p_target_user_id,
    (SELECT array_agg(new_id) FROM temp_workout_mapping)
  );

  SELECT array_agg(new_id ORDER BY ord) INTO v_result
  FROM temp_workout_mapping;

  RETURN v_result;
END;
$$;

-- ----------------------------------------------------------------
-- DROP da coluna. A view já não depende dela; os CHECK
-- (workout_sets_measurement_type_check e workout_sets_dimensions_present, este
-- referenciando também reps/duration) são removidos junto automaticamente.
-- ----------------------------------------------------------------
ALTER TABLE public.workout_sets DROP COLUMN measurement_type;
