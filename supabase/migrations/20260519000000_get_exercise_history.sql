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


-- ================================================
-- Soft-delete de exercícios/variações próprios do usuário. deleted_at marca a
-- exclusão lógica e deleted_by registra quem excluiu; NULL = ativa. O padrão
-- espelha workout_logs e preserva o histórico — workout logs antigos continuam
-- resolvendo a variação. O exercício é excluído junto quando sua última
-- variação ativa some (cascata em wt_delete_user_exercises). Não é um DELETE
-- real: a FK variations.exercise_id é ON DELETE CASCADE e apagaria as variações
-- soft-deletadas, quebrando o histórico.
-- ================================================
ALTER TABLE "public"."variations" ADD COLUMN "deleted_at" timestamp with time zone;
ALTER TABLE "public"."variations" ADD COLUMN "deleted_by" "uuid";
ALTER TABLE "public"."exercises" ADD COLUMN "deleted_at" timestamp with time zone;
ALTER TABLE "public"."exercises" ADD COLUMN "deleted_by" "uuid";

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
        "e"."slug" AS "exercise_slug",
        "v"."deleted_at"
       FROM (((((("public"."variations" "v"
         JOIN "public"."exercises" "e" ON (("e"."id" = "v"."exercise_id")))
         JOIN "public"."muscles" "m" ON (("m"."id" = "v"."muscle_id")))
         LEFT JOIN "public"."muscles" "m_parent" ON ((("m"."level" = 3) AND ("m_parent"."id" = "m"."parent_id"))))
         LEFT JOIN "public"."muscles" "sm" ON (("sm"."id" = "v"."secondary_muscle_id")))
         JOIN "public"."equipments" "eq" ON (("eq"."id" = "v"."equipment_id")))
         LEFT JOIN "public"."variation_videos" "vv" ON (("vv"."variation_id" = "v"."id")));


    -- ------------------------------------------------
    -- wt_list_exercises_summaries: criada com o prefixo wt_ (separa as
    -- funções do app mobile das do PWA antigo). O DROP da função antiga, sem
    -- prefixo, remove a cópia criada pela baseline; o DROP da nova é necessário
    -- porque o tipo de retorno (RETURNS TABLE) muda e CREATE OR REPLACE não
    -- altera a assinatura.
    -- ------------------------------------------------
    DROP FUNCTION IF EXISTS "public"."list_variation_views_for_mobile"("uuid", "uuid"[], "uuid"[], "text", "text"[]);
    DROP FUNCTION IF EXISTS "public"."wt_list_exercises_summaries"("uuid", "uuid"[], "uuid"[], "text", "text"[]);

    CREATE FUNCTION "public"."wt_list_exercises_summaries"("p_user_id" "uuid", "p_muscle_ids" "uuid"[], "p_equipment_ids" "uuid"[], "p_visibility" "text", "p_exercise_types" "text"[]) RETURNS TABLE("id" "uuid", "name" "text", "exercise_id" "uuid", "exercise_name" "text", "exercise_type" "text", "muscle_id" "uuid", "muscle_name" "text", "muscle_slug" "text", "muscle_level2_name" "text", "muscle_level2_slug" "text", "secondary_muscle_id" "uuid", "secondary_muscle_name" "text", "secondary_muscle_slug" "text", "equipment_id" "uuid", "equipment_name" "text", "equipment_slug" "text", "equipment_preposition" "text", "video_url" "text", "image_url" "text", "user_id" "uuid", "video_object_key" "text", "video_thumbnail_key" "text", "video_duration_seconds" integer, "video_processing_status" "text", "variation_slug" "text", "exercise_slug" "text")
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
        -- p_visibility separa a biblioteca pública (sem dono), as variações
        -- próprias do usuário (owned) e as criadas por outro e compartilhadas
        -- com ele (shared). 'all' devolve a união das três.
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
        AND vv.deleted_at IS NULL;
    $$;


    ALTER FUNCTION "public"."wt_list_exercises_summaries"("p_user_id" "uuid", "p_muscle_ids" "uuid"[], "p_equipment_ids" "uuid"[], "p_visibility" "text", "p_exercise_types" "text"[]) OWNER TO "postgres";

    GRANT ALL ON FUNCTION "public"."wt_list_exercises_summaries"("p_user_id" "uuid", "p_muscle_ids" "uuid"[], "p_equipment_ids" "uuid"[], "p_visibility" "text", "p_exercise_types" "text"[]) TO "anon";
    GRANT ALL ON FUNCTION "public"."wt_list_exercises_summaries"("p_user_id" "uuid", "p_muscle_ids" "uuid"[], "p_equipment_ids" "uuid"[], "p_visibility" "text", "p_exercise_types" "text"[]) TO "authenticated";
    GRANT ALL ON FUNCTION "public"."wt_list_exercises_summaries"("p_user_id" "uuid", "p_muscle_ids" "uuid"[], "p_equipment_ids" "uuid"[], "p_visibility" "text", "p_exercise_types" "text"[]) TO "service_role";


    -- ------------------------------------------------
    -- wt_get_exercise_history: retorno continua jsonb, então CREATE OR REPLACE
    -- basta. Adiciona exercise_slug e variation_slug ao objeto da variação.
    -- ------------------------------------------------
    CREATE OR REPLACE FUNCTION "public"."wt_get_exercise_history"("p_user_id" "uuid", "p_variation_id" "uuid") RETURNS "jsonb"
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


    ALTER FUNCTION "public"."wt_get_exercise_history"("p_user_id" "uuid", "p_variation_id" "uuid") OWNER TO "postgres";

    GRANT ALL ON FUNCTION "public"."wt_get_exercise_history"("p_user_id" "uuid", "p_variation_id" "uuid") TO "anon";
    GRANT ALL ON FUNCTION "public"."wt_get_exercise_history"("p_user_id" "uuid", "p_variation_id" "uuid") TO "authenticated";
    GRANT ALL ON FUNCTION "public"."wt_get_exercise_history"("p_user_id" "uuid", "p_variation_id" "uuid") TO "service_role";


-- ================================================
-- variations_user_dedup_uidx: a user cannot own two variations of the same
-- exercise with the same equipment and name. Enforced as a constraint so
-- wt_create_user_exercise can stay a plain INSERT — a collision surfaces as a
-- native unique_violation (SQLSTATE 23505). NULLS NOT DISTINCT treats two
-- unnamed variations as equal. Partial: the public library (user_id IS NULL)
-- and soft-deleted rows (deleted_at IS NOT NULL) are exempt — so a name frees up
-- once its variation is deleted; variations.user_id is set by the
-- variations_sync_scope trigger.
-- ================================================
CREATE UNIQUE INDEX IF NOT EXISTS "variations_user_dedup_uidx"
    ON "public"."variations" ("exercise_id", "equipment_id", "name") NULLS NOT DISTINCT
    WHERE ("deleted_at" IS NULL);


-- ================================================
-- wt_create_user_exercise: cria exercício + variação + (opcionalmente) o vídeo
-- enviado pelo dispositivo, numa única transação atômica.
--
-- A variação usa o p_variation_id gerado no frontend — necessário porque o
-- vídeo é enviado ao R2 ANTES de a variação existir. O dono é sempre
-- auth.uid(). Os dados chegam já tratados pela camada de API/domínio: a
-- função apenas persiste e deixa as constraints rejeitarem entradas inválidas.
-- Retorna o número de linhas inseridas em variations (1 em caso de sucesso);
-- o id já é conhecido pelo cliente, que o gerou.
-- ================================================
DROP FUNCTION IF EXISTS "public"."wt_create_user_exercise"("uuid", "uuid", "text", "text", "text", "uuid", "uuid", "uuid", "text", "text", "text", smallint, integer, "text");

CREATE FUNCTION "public"."wt_create_user_exercise"("p_variation_id" "uuid", "p_exercise_name" "text", "p_exercise_type" "text", "p_variation_name" "text", "p_muscle_id" "uuid", "p_equipment_id" "uuid", "p_secondary_muscle_id" "uuid" DEFAULT NULL::"uuid", "p_youtube_video_url" "text" DEFAULT NULL::"text", "p_video_object_key" "text" DEFAULT NULL::"text", "p_video_thumbnail_key" "text" DEFAULT NULL::"text", "p_video_duration_secs" smallint DEFAULT NULL::smallint, "p_video_size_bytes" integer DEFAULT NULL::integer, "p_video_content_type" "text" DEFAULT NULL::"text") RETURNS integer
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
  -- sends only a name, so exercises are deduplicated per user by name.
  SELECT id INTO v_exercise_id
  FROM public.exercises
  WHERE user_id = v_user_id AND name = p_exercise_name AND deleted_at IS NULL;

  IF v_exercise_id IS NULL THEN
    INSERT INTO public.exercises (name, user_id, exercise_type)
    VALUES (p_exercise_name, v_user_id, p_exercise_type)
    RETURNING id INTO v_exercise_id;
  END IF;

  -- Insert the variation with the frontend-supplied id. variations.user_id is
  -- filled by the variations_sync_scope trigger. A repeated p_variation_id or a
  -- duplicate (exercise, equipment, name) raises unique_violation (23505).
  INSERT INTO public.variations (
    id, name, exercise_id, muscle_id, equipment_id, secondary_muscle_id, video_url
  )
  VALUES (
    p_variation_id, p_variation_name, v_exercise_id, p_muscle_id, p_equipment_id,
    p_secondary_muscle_id, p_youtube_video_url
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


ALTER FUNCTION "public"."wt_create_user_exercise"("p_variation_id" "uuid", "p_exercise_name" "text", "p_exercise_type" "text", "p_variation_name" "text", "p_muscle_id" "uuid", "p_equipment_id" "uuid", "p_secondary_muscle_id" "uuid", "p_youtube_video_url" "text", "p_video_object_key" "text", "p_video_thumbnail_key" "text", "p_video_duration_secs" smallint, "p_video_size_bytes" integer, "p_video_content_type" "text") OWNER TO "postgres";

GRANT ALL ON FUNCTION "public"."wt_create_user_exercise"("p_variation_id" "uuid", "p_exercise_name" "text", "p_exercise_type" "text", "p_variation_name" "text", "p_muscle_id" "uuid", "p_equipment_id" "uuid", "p_secondary_muscle_id" "uuid", "p_youtube_video_url" "text", "p_video_object_key" "text", "p_video_thumbnail_key" "text", "p_video_duration_secs" smallint, "p_video_size_bytes" integer, "p_video_content_type" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."wt_create_user_exercise"("p_variation_id" "uuid", "p_exercise_name" "text", "p_exercise_type" "text", "p_variation_name" "text", "p_muscle_id" "uuid", "p_equipment_id" "uuid", "p_secondary_muscle_id" "uuid", "p_youtube_video_url" "text", "p_video_object_key" "text", "p_video_thumbnail_key" "text", "p_video_duration_secs" smallint, "p_video_size_bytes" integer, "p_video_content_type" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."wt_create_user_exercise"("p_variation_id" "uuid", "p_exercise_name" "text", "p_exercise_type" "text", "p_variation_name" "text", "p_muscle_id" "uuid", "p_equipment_id" "uuid", "p_secondary_muscle_id" "uuid", "p_youtube_video_url" "text", "p_video_object_key" "text", "p_video_thumbnail_key" "text", "p_video_duration_secs" smallint, "p_video_size_bytes" integer, "p_video_content_type" "text") TO "service_role";


-- ================================================
-- wt_update_user_exercise: atualiza um exercício/variação já existente do
-- usuário. Espelha wt_create_user_exercise, mas opera sobre a variação que o
-- cliente já possui (p_variation_id). O dono é sempre auth.uid() e só o dono
-- edita — caso contrário P0002 (a API traduz para 404). Find-or-create do
-- exercício pelo (novo) nome, re-apontando a variação. O vídeo do dispositivo
-- só é trocado quando o object_key muda, para não re-disparar o transcode à
-- toa. Colisões de (exercise_id, equipment_id, name) surgem como 23505.
-- Retorna o número de linhas atualizadas em variations (1 em caso de sucesso).
-- ================================================
DROP FUNCTION IF EXISTS "public"."wt_update_user_exercise"("uuid", "text", "text", "text", "uuid", "uuid", "uuid", "text", "text", "text", smallint, integer, "text");

CREATE FUNCTION "public"."wt_update_user_exercise"("p_variation_id" "uuid", "p_exercise_name" "text", "p_exercise_type" "text", "p_variation_name" "text", "p_muscle_id" "uuid", "p_equipment_id" "uuid", "p_secondary_muscle_id" "uuid" DEFAULT NULL::"uuid", "p_youtube_video_url" "text" DEFAULT NULL::"text", "p_video_object_key" "text" DEFAULT NULL::"text", "p_video_thumbnail_key" "text" DEFAULT NULL::"text", "p_video_duration_secs" smallint DEFAULT NULL::smallint, "p_video_size_bytes" integer DEFAULT NULL::integer, "p_video_content_type" "text" DEFAULT NULL::"text") RETURNS integer
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

  -- Find-or-create do exercício pelo (novo) nome, deduplicado por usuário.
  SELECT id INTO v_exercise_id
  FROM public.exercises
  WHERE user_id = v_user_id AND name = p_exercise_name AND deleted_at IS NULL;

  IF v_exercise_id IS NULL THEN
    INSERT INTO public.exercises (name, user_id, exercise_type)
    VALUES (p_exercise_name, v_user_id, p_exercise_type)
    RETURNING id INTO v_exercise_id;
  ELSE
    UPDATE public.exercises
    SET exercise_type = p_exercise_type
    WHERE id = v_exercise_id;
  END IF;

  -- Re-aponta e atualiza a variação. Uma colisão de (exercise_id, equipment_id,
  -- name) raises unique_violation (23505).
  UPDATE public.variations
  SET exercise_id = v_exercise_id,
      name = p_variation_name,
      muscle_id = p_muscle_id,
      equipment_id = p_equipment_id,
      secondary_muscle_id = p_secondary_muscle_id,
      video_url = p_youtube_video_url
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


ALTER FUNCTION "public"."wt_update_user_exercise"("p_variation_id" "uuid", "p_exercise_name" "text", "p_exercise_type" "text", "p_variation_name" "text", "p_muscle_id" "uuid", "p_equipment_id" "uuid", "p_secondary_muscle_id" "uuid", "p_youtube_video_url" "text", "p_video_object_key" "text", "p_video_thumbnail_key" "text", "p_video_duration_secs" smallint, "p_video_size_bytes" integer, "p_video_content_type" "text") OWNER TO "postgres";

GRANT ALL ON FUNCTION "public"."wt_update_user_exercise"("p_variation_id" "uuid", "p_exercise_name" "text", "p_exercise_type" "text", "p_variation_name" "text", "p_muscle_id" "uuid", "p_equipment_id" "uuid", "p_secondary_muscle_id" "uuid", "p_youtube_video_url" "text", "p_video_object_key" "text", "p_video_thumbnail_key" "text", "p_video_duration_secs" smallint, "p_video_size_bytes" integer, "p_video_content_type" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."wt_update_user_exercise"("p_variation_id" "uuid", "p_exercise_name" "text", "p_exercise_type" "text", "p_variation_name" "text", "p_muscle_id" "uuid", "p_equipment_id" "uuid", "p_secondary_muscle_id" "uuid", "p_youtube_video_url" "text", "p_video_object_key" "text", "p_video_thumbnail_key" "text", "p_video_duration_secs" smallint, "p_video_size_bytes" integer, "p_video_content_type" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."wt_update_user_exercise"("p_variation_id" "uuid", "p_exercise_name" "text", "p_exercise_type" "text", "p_variation_name" "text", "p_muscle_id" "uuid", "p_equipment_id" "uuid", "p_secondary_muscle_id" "uuid", "p_youtube_video_url" "text", "p_video_object_key" "text", "p_video_thumbnail_key" "text", "p_video_duration_secs" smallint, "p_video_size_bytes" integer, "p_video_content_type" "text") TO "service_role";


-- ================================================
-- wt_delete_user_exercises: exclui logicamente (soft-delete) as variações
-- próprias do usuário e, em cascata, o exercício pai que ficar sem nenhuma
-- variação ativa. Atômica: as duas etapas rodam na mesma transação, e a
-- segunda enxerga o efeito da primeira — CTEs de um único comando não
-- enxergariam (compartilham o mesmo snapshot). Só o dono exclui: variações de
-- outro usuário ou da biblioteca pública, e as já excluídas, são ignoradas.
-- Retorna o número de variações efetivamente excluídas.
-- ================================================
CREATE OR REPLACE FUNCTION "public"."wt_delete_user_exercises"("p_variation_ids" "uuid"[]) RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_deleted_count integer;
  v_exercise_ids uuid[];
BEGIN
  -- Sem identidade não há como confirmar a posse das variações. 28000 = not authenticated.
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'wt_delete_user_exercises called without an authenticated user'
      USING ERRCODE = '28000';
  END IF;

  -- Etapa 1: soft-delete das variações próprias ainda ativas, guardando os
  -- exercícios pais afetados.
  WITH deleted AS (
    UPDATE public.variations
    SET deleted_at = now(), deleted_by = v_user_id
    WHERE id = ANY(p_variation_ids)
      AND user_id = v_user_id
      AND deleted_at IS NULL
    RETURNING exercise_id
  )
  SELECT count(*), array_agg(DISTINCT exercise_id)
  INTO v_deleted_count, v_exercise_ids
  FROM deleted;

  -- Etapa 2 (comando separado, enxerga o efeito da etapa 1): soft-delete dos
  -- exercícios pais que ficaram sem nenhuma variação ativa.
  IF v_exercise_ids IS NOT NULL THEN
    UPDATE public.exercises e
    SET deleted_at = now(), deleted_by = v_user_id
    WHERE e.id = ANY(v_exercise_ids)
      AND e.deleted_at IS NULL
      AND NOT EXISTS (
        SELECT 1 FROM public.variations v
        WHERE v.exercise_id = e.id AND v.deleted_at IS NULL
      );
  END IF;

  RETURN v_deleted_count;
END;
$$;


ALTER FUNCTION "public"."wt_delete_user_exercises"("p_variation_ids" "uuid"[]) OWNER TO "postgres";

GRANT ALL ON FUNCTION "public"."wt_delete_user_exercises"("p_variation_ids" "uuid"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."wt_delete_user_exercises"("p_variation_ids" "uuid"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."wt_delete_user_exercises"("p_variation_ids" "uuid"[]) TO "service_role";
