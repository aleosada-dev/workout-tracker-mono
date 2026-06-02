-- ============================================================================
-- workout_logs_improvements
--
-- Continua a unificação iniciada em 20260531120000 (templates) levando-a para as
-- tabelas de LOG, que tinham ficado de fora (ver NOTA na Parte 1 daquela migração).
--
-- O que muda:
--   1. workout_exercise_logs ganha exercise_type (preparatory | strength).
--      workout_exercise_set_logs ganha measurement_type + duration_seconds, com as
--      mesmas regras de dimensão (peso/reps/tempo) usadas nos templates.
--   2. Os logs preparatórios (workout_preparatory_exercise_logs / _set_logs) são
--      migrados para as tabelas unificadas com exercise_type='preparatory'.
--   3. As 2 tabelas de log preparatório viram VIEWS atualizáveis sobre as tabelas
--      unificadas, com triggers INSTEAD OF — o PWA legado (que lê/grava esses logs
--      direto e via insert_workout_log_with_summary) continua com o mesmo contrato.
--   4. As 7 funções que leem histórico/records a partir de workout_exercise_logs
--      passam a filtrar exercise_type='strength', para que os preparatórios (agora
--      na mesma tabela) não vazem em records, histórico ou "último treino".
--   5. wt_insert_workout_log (mobile) é reescrita para o payload unificado:
--      exercise_type por exercício e measurement_type/duration por set. Continua
--      sendo apenas persistência e retorna só o id do workout_logs.
--
-- is_coached (sessão acompanhada por coach) já existe em workout_logs e segue como
-- está — wt_insert_workout_log continua gravando a partir do payload.
-- ============================================================================

-- ============================================================================
-- PARTE 1 — Schema das tabelas de log unificadas
-- ============================================================================

-- ---- workout_exercise_logs ----
ALTER TABLE public.workout_exercise_logs
  ADD COLUMN exercise_type text NOT NULL DEFAULT 'strength';

ALTER TABLE public.workout_exercise_logs
  ADD CONSTRAINT workout_exercise_logs_exercise_type_check
    CHECK (exercise_type IN ('preparatory', 'strength'));

-- ---- workout_exercise_set_logs ----
-- reps já é nullable; reps_min/reps_max idem. Adicionamos a dimensão de tempo e o
-- measurement_type, espelhando workout_sets. set_type continua NOT NULL ('normal'
-- para preparatórios). A presença de dimensões é garantida (não a exclusividade),
-- para não falhar com linhas legadas que tenham colunas extras.
ALTER TABLE public.workout_exercise_set_logs
  ADD COLUMN duration_seconds integer,
  ADD COLUMN measurement_type text NOT NULL DEFAULT 'weight_reps';

ALTER TABLE public.workout_exercise_set_logs
  ADD CONSTRAINT workout_exercise_set_logs_measurement_type_check
    CHECK (measurement_type IN (
      'weight_reps', 'reps', 'duration', 'duration_reps',
      'weight_duration', 'weight_reps_duration'
    )),
  ADD CONSTRAINT workout_exercise_set_logs_duration_positive
    CHECK (duration_seconds IS NULL OR duration_seconds > 0),
  ADD CONSTRAINT workout_exercise_set_logs_dimensions_present CHECK (
    measurement_type NOT IN ('duration', 'duration_reps', 'weight_duration', 'weight_reps_duration')
      OR duration_seconds IS NOT NULL
  );

-- ============================================================================
-- PARTE 2 — Migração de dados: logs preparatórios -> unificado
-- (roda ANTES de dropar as tabelas preparatory)
--   duration_type 'time' -> measurement_type 'duration'
--   duration_type 'reps' -> measurement_type 'reps'
-- IDs preservados (as tabelas antigas serão dropadas, sem conflito de PK).
-- ============================================================================

INSERT INTO public.workout_exercise_logs (
  id, workout_log_id, variation_id, position, note, rest_seconds,
  superset_group_id, exercise_name, variation_name, exercise_type,
  created_at, updated_at
)
SELECT
  wpel.id, wpel.workout_log_id, wpel.variation_id, wpel.position, wpel.note, NULL,
  NULL, wpel.exercise_name, wpel.variation_name, 'preparatory',
  wpel.created_at, wpel.updated_at
FROM public.workout_preparatory_exercise_logs wpel;

INSERT INTO public.workout_exercise_set_logs (
  id, workout_exercise_log_id, set_order, set_type, weight_kg, reps,
  reps_min, reps_max, duration_seconds, measurement_type, created_at, updated_at
)
SELECT
  wpsl.id, wpsl.workout_preparatory_exercise_log_id, wpsl.set_order, 'normal', NULL,
  CASE WHEN wpel.duration_type = 'reps' THEN wpsl.reps END,
  CASE WHEN wpel.duration_type = 'reps' THEN wpsl.reps END,
  CASE WHEN wpel.duration_type = 'reps' THEN wpsl.reps END,
  CASE WHEN wpel.duration_type = 'time' THEN wpsl.duration_seconds END,
  -- 'duration' só quando há de fato um tempo gravado; linhas 'time' legadas sem
  -- duration_seconds caem em 'reps' para respeitar workout_exercise_set_logs_dimensions_present.
  CASE WHEN wpel.duration_type = 'time' AND wpsl.duration_seconds IS NOT NULL
       THEN 'duration' ELSE 'reps' END,
  wpsl.created_at, wpsl.updated_at
FROM public.workout_preparatory_set_logs wpsl
JOIN public.workout_preparatory_exercise_logs wpel
  ON wpel.id = wpsl.workout_preparatory_exercise_log_id;

-- ============================================================================
-- PARTE 3 — Dropar tabelas de log preparatório e recriá-las como VIEWS
-- atualizáveis sobre as tabelas unificadas. CASCADE remove índices, FKs,
-- triggers e policies das tabelas antigas.
-- ============================================================================

DROP TABLE IF EXISTS public.workout_preparatory_set_logs CASCADE;
DROP TABLE IF EXISTS public.workout_preparatory_exercise_logs CASCADE;

-- ---- View: workout_preparatory_exercise_logs ----
CREATE VIEW public.workout_preparatory_exercise_logs
WITH (security_invoker = true) AS
SELECT
  wel.id,
  wel.workout_log_id,
  wel.variation_id,
  wel.position,
  -- duration_type derivado dos sets (todos compartilham o mesmo tipo por regra de
  -- negócio); 'time' como fallback quando o exercício ainda não tem sets.
  COALESCE((
    SELECT CASE WHEN wesl.measurement_type = 'reps' THEN 'reps' ELSE 'time' END
    FROM public.workout_exercise_set_logs wesl
    WHERE wesl.workout_exercise_log_id = wel.id
    ORDER BY wesl.set_order ASC, wesl.id ASC
    LIMIT 1
  ), 'time') AS duration_type,
  wel.note,
  wel.exercise_name,
  wel.variation_name,
  wel.created_at,
  wel.updated_at
FROM public.workout_exercise_logs wel
WHERE wel.exercise_type = 'preparatory';

CREATE OR REPLACE FUNCTION public.wt_prep_exercise_logs_view_insert() RETURNS trigger
  LANGUAGE plpgsql SECURITY INVOKER SET search_path TO 'public' AS $$
DECLARE
  v_id uuid := COALESCE(NEW.id, gen_random_uuid());
BEGIN
  -- duration_type não é persistido no log do exercício; é derivado dos sets.
  INSERT INTO public.workout_exercise_logs (
    id, workout_log_id, variation_id, position, note, rest_seconds,
    superset_group_id, exercise_name, variation_name, exercise_type
  )
  VALUES (
    v_id, NEW.workout_log_id, NEW.variation_id, NEW.position, NEW.note, NULL,
    NULL, NEW.exercise_name, NEW.variation_name, 'preparatory'
  );
  NEW.id := v_id;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.wt_prep_exercise_logs_view_update() RETURNS trigger
  LANGUAGE plpgsql SECURITY INVOKER SET search_path TO 'public' AS $$
BEGIN
  UPDATE public.workout_exercise_logs
  SET workout_log_id = NEW.workout_log_id,
      variation_id   = NEW.variation_id,
      position       = NEW.position,
      note           = NEW.note,
      exercise_name  = NEW.exercise_name,
      variation_name = NEW.variation_name
  WHERE id = OLD.id AND exercise_type = 'preparatory';
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.wt_prep_exercise_logs_view_delete() RETURNS trigger
  LANGUAGE plpgsql SECURITY INVOKER SET search_path TO 'public' AS $$
BEGIN
  DELETE FROM public.workout_exercise_logs
  WHERE id = OLD.id AND exercise_type = 'preparatory';
  RETURN OLD;
END;
$$;

CREATE TRIGGER wt_prep_exercise_logs_view_insert_trg INSTEAD OF INSERT
  ON public.workout_preparatory_exercise_logs
  FOR EACH ROW EXECUTE FUNCTION public.wt_prep_exercise_logs_view_insert();
CREATE TRIGGER wt_prep_exercise_logs_view_update_trg INSTEAD OF UPDATE
  ON public.workout_preparatory_exercise_logs
  FOR EACH ROW EXECUTE FUNCTION public.wt_prep_exercise_logs_view_update();
CREATE TRIGGER wt_prep_exercise_logs_view_delete_trg INSTEAD OF DELETE
  ON public.workout_preparatory_exercise_logs
  FOR EACH ROW EXECUTE FUNCTION public.wt_prep_exercise_logs_view_delete();

-- ---- View: workout_preparatory_set_logs ----
CREATE VIEW public.workout_preparatory_set_logs
WITH (security_invoker = true) AS
SELECT
  wesl.id,
  wesl.workout_exercise_log_id AS workout_preparatory_exercise_log_id,
  wesl.set_order,
  wesl.duration_seconds,
  wesl.reps_min AS reps,
  wesl.created_at,
  wesl.updated_at
FROM public.workout_exercise_set_logs wesl
JOIN public.workout_exercise_logs wel ON wel.id = wesl.workout_exercise_log_id
WHERE wel.exercise_type = 'preparatory';

CREATE OR REPLACE FUNCTION public.wt_prep_set_logs_view_insert() RETURNS trigger
  LANGUAGE plpgsql SECURITY INVOKER SET search_path TO 'public' AS $$
DECLARE
  v_id uuid := COALESCE(NEW.id, gen_random_uuid());
BEGIN
  -- Preparatório só tem duration ou reps: inferimos pelo dado presente.
  -- set_type é sempre 'normal' (preparatório não tem warmup/drop/cluster).
  INSERT INTO public.workout_exercise_set_logs (
    id, workout_exercise_log_id, set_order, set_type, weight_kg, reps,
    reps_min, reps_max, duration_seconds, measurement_type
  )
  VALUES (
    v_id, NEW.workout_preparatory_exercise_log_id, NEW.set_order, 'normal', NULL,
    NEW.reps, NEW.reps, NEW.reps, NEW.duration_seconds,
    CASE WHEN NEW.duration_seconds IS NOT NULL THEN 'duration' ELSE 'reps' END
  );
  NEW.id := v_id;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.wt_prep_set_logs_view_update() RETURNS trigger
  LANGUAGE plpgsql SECURITY INVOKER SET search_path TO 'public' AS $$
BEGIN
  UPDATE public.workout_exercise_set_logs
  SET set_order        = NEW.set_order,
      duration_seconds = NEW.duration_seconds,
      reps             = NEW.reps,
      reps_min         = NEW.reps,
      reps_max         = NEW.reps,
      measurement_type = CASE WHEN NEW.duration_seconds IS NOT NULL THEN 'duration' ELSE 'reps' END
  WHERE id = OLD.id;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.wt_prep_set_logs_view_delete() RETURNS trigger
  LANGUAGE plpgsql SECURITY INVOKER SET search_path TO 'public' AS $$
BEGIN
  DELETE FROM public.workout_exercise_set_logs WHERE id = OLD.id;
  RETURN OLD;
END;
$$;

CREATE TRIGGER wt_prep_set_logs_view_insert_trg INSTEAD OF INSERT
  ON public.workout_preparatory_set_logs
  FOR EACH ROW EXECUTE FUNCTION public.wt_prep_set_logs_view_insert();
CREATE TRIGGER wt_prep_set_logs_view_update_trg INSTEAD OF UPDATE
  ON public.workout_preparatory_set_logs
  FOR EACH ROW EXECUTE FUNCTION public.wt_prep_set_logs_view_update();
CREATE TRIGGER wt_prep_set_logs_view_delete_trg INSTEAD OF DELETE
  ON public.workout_preparatory_set_logs
  FOR EACH ROW EXECUTE FUNCTION public.wt_prep_set_logs_view_delete();

-- Grants espelhando os das tabelas de log originais.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workout_preparatory_exercise_logs TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workout_preparatory_set_logs TO anon, authenticated, service_role;

-- ============================================================================
-- PARTE 4 — Filtrar leitores do bloco de musculação (exercise_type='strength')
-- para que linhas preparatórias (agora na mesma tabela) não vazem em histórico,
-- records ou "último treino".
-- ============================================================================

-- ---- get_previous_workout_log_for_summary ----
CREATE OR REPLACE FUNCTION "public"."get_previous_workout_log_for_summary"("p_user_id" "uuid", "p_workout_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_result jsonb;
  v_actor_id uuid := (SELECT auth.uid());
BEGIN
  IF p_workout_id IS NULL THEN
    RETURN NULL;
  END IF;

  IF p_user_id <> v_actor_id
    AND NOT public.is_active_coach_of(v_actor_id, p_user_id) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT jsonb_build_object(
    'workoutLogId', wl.id,
    'workoutId', wl.workout_id,
    'startedAt', wl.started_at,
    'finishedAt', wl.finished_at,
    'exercises',
    COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'variationId', wel.variation_id,
            'exerciseName', COALESCE(vv.exercise_name, wel.exercise_name),
            'variationName', COALESCE(vv.name, wel.variation_name),
            'equipmentName', vv.equipment_name,
            'equipmentPreposition', vv.equipment_preposition,
            'position', wel.position,
            'supersetGroupId', wel.superset_group_id,
            'sets',
            COALESCE(
              (
                SELECT jsonb_agg(
                  jsonb_build_object(
                    'setOrder', wesl.set_order,
                    'setType', wesl.set_type,
                    'weightKg', wesl.weight_kg,
                    'reps', wesl.reps
                  )
                  ORDER BY wesl.set_order ASC, wesl.id ASC
                )
                FROM public.workout_exercise_set_logs wesl
                WHERE wesl.workout_exercise_log_id = wel.id
              ),
              '[]'::jsonb
            )
          )
          ORDER BY wel.position ASC, wel.id ASC
        )
        FROM public.workout_exercise_logs wel
        LEFT JOIN public.variations_view vv ON vv.id = wel.variation_id
        WHERE wel.workout_log_id = wl.id
          AND wel.exercise_type = 'strength'
      ),
      '[]'::jsonb
    )
  )
  INTO v_result
  FROM public.workout_logs wl
  WHERE wl.user_id = p_user_id
    AND wl.workout_id = p_workout_id
    AND wl.deleted_at IS NULL
  ORDER BY wl.finished_at DESC
  LIMIT 1;

  RETURN v_result;
END;
$$;

-- ---- get_previous_workout_sets ----
CREATE OR REPLACE FUNCTION "public"."get_previous_workout_sets"("p_user_id" "uuid", "p_variation_ids" "uuid"[]) RETURNS TABLE("variation_id" "uuid", "set_type" "text", "set_order" integer, "reps" integer, "weight_kg" numeric)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF p_user_id <> (SELECT auth.uid()) AND NOT public.is_active_coach_of((SELECT auth.uid()), p_user_id) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  RETURN QUERY
  WITH latest_exec AS (
    SELECT DISTINCT ON (wel.variation_id)
      wel.variation_id,
      wel.id AS exercise_log_id
    FROM workout_logs wl
    JOIN workout_exercise_logs wel ON wel.workout_log_id = wl.id
    WHERE wl.user_id = p_user_id
      AND wl.deleted_at IS NULL
      AND wel.exercise_type = 'strength'
      AND wel.variation_id = ANY(p_variation_ids)
    ORDER BY wel.variation_id, wl.finished_at DESC
  )
  SELECT
    le.variation_id,
    wesl.set_type,
    wesl.set_order,
    wesl.reps,
    wesl.weight_kg
  FROM latest_exec le
  JOIN workout_exercise_set_logs wesl ON wesl.workout_exercise_log_id = le.exercise_log_id
  ORDER BY le.variation_id, wesl.set_order;
END;
$$;

-- ---- get_summary_recalculation_context ----
CREATE OR REPLACE FUNCTION "public"."get_summary_recalculation_context"("p_user_id" "uuid", "p_started_at" timestamp with time zone) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT COALESCE(jsonb_agg(log_data ORDER BY log_data->>'startedAt' ASC), '[]'::jsonb)
  INTO v_result
  FROM (
    SELECT jsonb_build_object(
      'logId', wl.id,
      'workoutId', wl.workout_id,
      'startedAt', wl.started_at,
      'currentSnapshot', wls.summary_snapshot,
      'variationIds', COALESCE(
        (
          SELECT jsonb_agg(DISTINCT wel.variation_id)
          FROM public.workout_exercise_logs wel
          WHERE wel.workout_log_id = wl.id
            AND wel.exercise_type = 'strength'
            AND wel.variation_id IS NOT NULL
        ),
        '[]'::jsonb
      ),
      'previousWorkoutLog', CASE
        WHEN wl.workout_id IS NULL THEN NULL
        ELSE (
          SELECT jsonb_build_object(
            'workoutLogId', prev_wl.id,
            'workoutId', prev_wl.workout_id,
            'startedAt', prev_wl.started_at,
            'finishedAt', prev_wl.finished_at,
            'exercises', COALESCE(
              (
                SELECT jsonb_agg(
                  jsonb_build_object(
                    'variationId', prev_wel.variation_id,
                    'exerciseName', COALESCE(prev_vv.exercise_name, prev_wel.exercise_name),
                    'variationName', COALESCE(prev_vv.name, prev_wel.variation_name),
                    'equipmentName', prev_vv.equipment_name,
                    'equipmentPreposition', prev_vv.equipment_preposition,
                    'position', prev_wel.position,
                    'supersetGroupId', prev_wel.superset_group_id,
                    'sets', COALESCE(
                      (
                        SELECT jsonb_agg(
                          jsonb_build_object(
                            'setOrder', prev_wesl.set_order,
                            'setType', prev_wesl.set_type,
                            'weightKg', prev_wesl.weight_kg,
                            'reps', prev_wesl.reps
                          )
                          ORDER BY prev_wesl.set_order ASC, prev_wesl.id ASC
                        )
                        FROM public.workout_exercise_set_logs prev_wesl
                        WHERE prev_wesl.workout_exercise_log_id = prev_wel.id
                      ),
                      '[]'::jsonb
                    )
                  )
                  ORDER BY prev_wel.position ASC, prev_wel.id ASC
                )
                FROM public.workout_exercise_logs prev_wel
                LEFT JOIN public.variations_view prev_vv ON prev_vv.id = prev_wel.variation_id
                WHERE prev_wel.workout_log_id = prev_wl.id
                  AND prev_wel.exercise_type = 'strength'
              ),
              '[]'::jsonb
            )
          )
          FROM public.workout_logs prev_wl
          WHERE prev_wl.user_id = p_user_id
            AND prev_wl.workout_id = wl.workout_id
            AND prev_wl.deleted_at IS NULL
            AND prev_wl.finished_at < wl.finished_at
          ORDER BY prev_wl.finished_at DESC
          LIMIT 1
        )
      END,
      'variationRecords', COALESCE(
        (
          SELECT jsonb_agg(
            jsonb_build_object(
              'variationId', wvr.variation_id,
              'maxWeightKg', wvr.max_weight_kg,
              'maxVolumeKg', wvr.max_volume_kg,
              'maxReps', wvr.max_reps,
              'maxSets', wvr.max_sets
            )
          )
          FROM public.workout_variation_records wvr
          WHERE wvr.user_id = p_user_id
            AND wvr.variation_id IN (
              SELECT DISTINCT wel2.variation_id
              FROM public.workout_exercise_logs wel2
              WHERE wel2.workout_log_id = wl.id
                AND wel2.exercise_type = 'strength'
                AND wel2.variation_id IS NOT NULL
            )
        ),
        '[]'::jsonb
      )
    ) AS log_data
    FROM public.workout_logs wl
    JOIN public.workout_log_summaries wls ON wls.workout_log_id = wl.id
    WHERE wl.user_id = p_user_id
      AND wl.deleted_at IS NULL
      AND wl.started_at > p_started_at
  ) sub;

  RETURN v_result;
END;
$$;

-- ---- get_variation_history ----
CREATE OR REPLACE FUNCTION "public"."get_variation_history"("p_user_id" "uuid", "p_variation_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  actor_id uuid;
  v_variation jsonb;
  v_sessions jsonb;
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
    'equipment_name', eq.name,
    'equipment_preposition', eq.preposition,
    'muscle_slug', m.slug,
    'secondary_muscle_slug', sm.slug,
    'youtube_url', v.video_url,
    'uploaded_video_object_key', vv.object_key,
    'uploaded_video_user_id', CASE WHEN vv.object_key IS NULL THEN NULL ELSE v.user_id END
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

  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'workout_log_id', s.workout_log_id,
        'started_at', s.started_at,
        'max_weight_kg', s.max_weight_kg,
        'total_volume_kg', s.total_volume_kg,
        'max_reps', s.max_reps,
        'total_sets', s.total_sets,
        'sets', s.sets
      ) ORDER BY s.started_at ASC
    ),
    '[]'::jsonb
  )
  INTO v_sessions
  FROM (
    SELECT
      wl.id AS workout_log_id,
      wl.started_at,
      MAX(wesl.weight_kg) FILTER (WHERE wesl.set_type <> 'warmup') AS max_weight_kg,
      COALESCE(SUM(wesl.weight_kg * wesl.reps) FILTER (WHERE wesl.set_type <> 'warmup'), 0) AS total_volume_kg,
      MAX(wesl.reps) FILTER (WHERE wesl.set_type <> 'warmup') AS max_reps,
      COUNT(*) FILTER (WHERE wesl.set_type <> 'warmup')::integer AS total_sets,
      jsonb_agg(
        jsonb_build_object(
          'set_order', wesl.set_order,
          'set_type', wesl.set_type,
          'weight_kg', wesl.weight_kg,
          'reps', wesl.reps,
          'reps_min', wesl.reps_min,
          'reps_max', wesl.reps_max
        ) ORDER BY wesl.set_order
      ) AS sets
    FROM public.workout_logs wl
    JOIN public.workout_exercise_logs wel ON wel.workout_log_id = wl.id
    JOIN public.workout_exercise_set_logs wesl ON wesl.workout_exercise_log_id = wel.id
    WHERE wl.user_id = p_user_id
      AND wel.variation_id = p_variation_id
      AND wel.exercise_type = 'strength'
      AND wl.deleted_at IS NULL
    GROUP BY wl.id, wl.started_at
    ORDER BY wl.started_at DESC
    LIMIT 10
  ) s;

  RETURN jsonb_build_object(
    'variation', v_variation,
    'sessions', v_sessions
  );
END;
$$;

-- ---- get_variation_last ----
CREATE OR REPLACE FUNCTION "public"."get_variation_last"("p_user_id" "uuid", "p_variation_id" "uuid" DEFAULT NULL::"uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  actor_id uuid;
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

  WITH session_stats AS (
    SELECT
      wel.variation_id AS variation_id,
      wl.id AS workout_log_id,
      wl.started_at,
      MAX(wesl.weight_kg) FILTER (WHERE wesl.set_type <> 'warmup') AS max_weight_kg,
      COALESCE(SUM(wesl.weight_kg * wesl.reps) FILTER (WHERE wesl.set_type <> 'warmup'), 0) AS total_volume_kg,
      MAX(wesl.reps) FILTER (WHERE wesl.set_type <> 'warmup') AS max_reps,
      COUNT(*) FILTER (WHERE wesl.set_type <> 'warmup')::integer AS total_sets,
      jsonb_agg(
        jsonb_build_object(
          'set_order', wesl.set_order,
          'set_type', wesl.set_type,
          'weight_kg', wesl.weight_kg,
          'reps', wesl.reps,
          'reps_min', wesl.reps_min,
          'reps_max', wesl.reps_max
        ) ORDER BY wesl.set_order
      ) AS sets,
      row_number() OVER (
        PARTITION BY wel.variation_id
        ORDER BY wl.started_at DESC, wl.id DESC
      ) AS rn
    FROM public.workout_logs wl
    JOIN public.workout_exercise_logs wel ON wel.workout_log_id = wl.id
    JOIN public.workout_exercise_set_logs wesl ON wesl.workout_exercise_log_id = wel.id
    WHERE wl.user_id = p_user_id
      AND wl.deleted_at IS NULL
      AND wel.exercise_type = 'strength'
      AND (p_variation_id IS NULL OR wel.variation_id = p_variation_id)
    GROUP BY wel.variation_id, wl.id, wl.started_at
  )
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'variation_id', v.id,
        'variation', jsonb_build_object(
          'exercise_name', e.name,
          'variation_name', v.name,
          'equipment_name', eq.name,
          'equipment_preposition', eq.preposition,
          'muscle_slug', m.slug,
          'secondary_muscle_slug', sm.slug,
          'youtube_url', v.video_url,
          'uploaded_video_object_key', vv.object_key,
          'uploaded_video_user_id', CASE WHEN vv.object_key IS NULL THEN NULL ELSE v.user_id END
        ),
        'session', CASE
          WHEN ss.workout_log_id IS NULL THEN NULL
          ELSE jsonb_build_object(
            'workout_log_id', ss.workout_log_id,
            'started_at', ss.started_at,
            'max_weight_kg', ss.max_weight_kg,
            'total_volume_kg', ss.total_volume_kg,
            'max_reps', ss.max_reps,
            'total_sets', ss.total_sets,
            'sets', ss.sets
          )
        END
      ) ORDER BY e.name, v.name NULLS FIRST
    ),
    '[]'::jsonb
  )
  INTO v_result
  FROM public.variations v
  JOIN public.exercises e ON e.id = v.exercise_id
  JOIN public.equipments eq ON eq.id = v.equipment_id
  JOIN public.muscles m ON m.id = v.muscle_id
  LEFT JOIN public.muscles sm ON sm.id = v.secondary_muscle_id
  LEFT JOIN public.variation_videos vv ON vv.variation_id = v.id
  LEFT JOIN session_stats ss ON ss.variation_id = v.id AND ss.rn = 1
  WHERE (p_variation_id IS NULL AND ss.workout_log_id IS NOT NULL)
     OR (p_variation_id IS NOT NULL AND v.id = p_variation_id);

  RETURN v_result;
END;
$$;

-- ---- get_variation_progress ----
CREATE OR REPLACE FUNCTION "public"."get_variation_progress"("p_user_id" "uuid", "p_variation_id" "uuid" DEFAULT NULL::"uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  actor_id uuid;
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

  WITH session_stats AS (
    SELECT
      wel.variation_id AS variation_id,
      wl.id AS workout_log_id,
      wl.started_at,
      MAX(wesl.weight_kg) FILTER (WHERE wesl.set_type <> 'warmup') AS max_weight_kg,
      COALESCE(SUM(wesl.weight_kg * wesl.reps) FILTER (WHERE wesl.set_type <> 'warmup'), 0) AS total_volume_kg,
      MAX(wesl.reps) FILTER (WHERE wesl.set_type <> 'warmup') AS max_reps,
      COUNT(*) FILTER (WHERE wesl.set_type <> 'warmup')::integer AS total_sets,
      jsonb_agg(
        jsonb_build_object(
          'set_order', wesl.set_order,
          'set_type', wesl.set_type,
          'weight_kg', wesl.weight_kg,
          'reps', wesl.reps,
          'reps_min', wesl.reps_min,
          'reps_max', wesl.reps_max
        ) ORDER BY wesl.set_order
      ) AS sets,
      row_number() OVER (
        PARTITION BY wel.variation_id
        ORDER BY wl.started_at DESC, wl.id DESC
      ) AS rn
    FROM public.workout_logs wl
    JOIN public.workout_exercise_logs wel ON wel.workout_log_id = wl.id
    JOIN public.workout_exercise_set_logs wesl ON wesl.workout_exercise_log_id = wel.id
    WHERE wl.user_id = p_user_id
      AND wl.deleted_at IS NULL
      AND wel.exercise_type = 'strength'
      AND (p_variation_id IS NULL OR wel.variation_id = p_variation_id)
    GROUP BY wel.variation_id, wl.id, wl.started_at
  ),
  per_variation AS (
    SELECT
      ss.variation_id,
      jsonb_agg(
        jsonb_build_object(
          'workout_log_id', ss.workout_log_id,
          'started_at', ss.started_at,
          'max_weight_kg', ss.max_weight_kg,
          'total_volume_kg', ss.total_volume_kg,
          'max_reps', ss.max_reps,
          'total_sets', ss.total_sets,
          'sets', ss.sets
        ) ORDER BY ss.started_at ASC
      ) AS sessions
    FROM session_stats ss
    WHERE ss.rn <= 10
    GROUP BY ss.variation_id
  )
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'variation_id', v.id,
        'variation', jsonb_build_object(
          'exercise_name', e.name,
          'variation_name', v.name,
          'equipment_name', eq.name,
          'equipment_preposition', eq.preposition,
          'muscle_slug', m.slug,
          'secondary_muscle_slug', sm.slug,
          'youtube_url', v.video_url,
          'uploaded_video_object_key', vv.object_key,
          'uploaded_video_user_id', CASE WHEN vv.object_key IS NULL THEN NULL ELSE v.user_id END
        ),
        'sessions', COALESCE(pv.sessions, '[]'::jsonb)
      ) ORDER BY e.name, v.name NULLS FIRST
    ),
    '[]'::jsonb
  )
  INTO v_result
  FROM public.variations v
  JOIN public.exercises e ON e.id = v.exercise_id
  JOIN public.equipments eq ON eq.id = v.equipment_id
  JOIN public.muscles m ON m.id = v.muscle_id
  LEFT JOIN public.muscles sm ON sm.id = v.secondary_muscle_id
  LEFT JOIN public.variation_videos vv ON vv.variation_id = v.id
  LEFT JOIN per_variation pv ON pv.variation_id = v.id
  WHERE (p_variation_id IS NULL AND pv.variation_id IS NOT NULL)
     OR (p_variation_id IS NOT NULL AND v.id = p_variation_id);

  RETURN v_result;
END;
$$;

-- ---- recalculate_variation_records ----
CREATE OR REPLACE FUNCTION "public"."recalculate_variation_records"("p_user_id" "uuid", "p_variation_ids" "uuid"[]) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  DELETE FROM public.workout_variation_records
  WHERE user_id = p_user_id
    AND variation_id = ANY(p_variation_ids);

  INSERT INTO public.workout_variation_records (
    user_id, variation_id, max_weight_kg, max_volume_kg, max_reps, max_sets
  )
  SELECT
    p_user_id,
    variation_id,
    MAX(session_max_weight_kg),
    MAX(session_max_volume_kg),
    MAX(session_max_reps),
    MAX(session_sets_count)
  FROM (
    SELECT
      wel.variation_id,
      MAX(wesl.weight_kg) AS session_max_weight_kg,
      MAX(wesl.weight_kg * wesl.reps) AS session_max_volume_kg,
      MAX(wesl.reps) AS session_max_reps,
      COUNT(*)::INTEGER AS session_sets_count
    FROM workout_logs wl
    JOIN workout_exercise_logs wel ON wel.workout_log_id = wl.id
    JOIN workout_exercise_set_logs wesl ON wesl.workout_exercise_log_id = wel.id
    WHERE wl.user_id = p_user_id
      AND wl.deleted_at IS NULL
      AND wel.exercise_type = 'strength'
      AND wel.variation_id = ANY(p_variation_ids)
      AND wesl.set_type = 'normal'
    GROUP BY wl.id, wel.variation_id
  ) per_session
  GROUP BY variation_id
  ON CONFLICT (user_id, variation_id) DO UPDATE SET
    max_weight_kg = EXCLUDED.max_weight_kg,
    max_volume_kg = EXCLUDED.max_volume_kg,
    max_reps = EXCLUDED.max_reps,
    max_sets = EXCLUDED.max_sets,
    updated_at = NOW();
END;
$$;

-- ============================================================================
-- PARTE 5 — wt_insert_workout_log (mobile): payload unificado.
-- Persiste o log + exercise logs (com exercise_type e nomes denormalizados) +
-- set logs (com measurement_type/duration), tanto strength quanto preparatory,
-- numa única chamada. Apenas persistência; retorna só o id do workout_logs.
-- SQLSTATEs:
--   28000 - sem usuário autenticado
--   42501 - actor não é o próprio usuário nem coach ativo dele
--   P0002 - variation_id referenciada não existe
--   22023 - payload inválido (variationId/exercise_type/set_type/measurement_type,
--           reps/duration_seconds fora de faixa ou faltando)
-- ============================================================================

CREATE OR REPLACE FUNCTION "public"."wt_insert_workout_log"("payload" "jsonb") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY INVOKER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_log_id UUID;
  v_user_id UUID;
  v_actor_id UUID := (SELECT auth.uid());
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
    NULLIF(s->>'durationSeconds', '')::INTEGER AS duration_seconds
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
    weight_kg, reps, reps_min, reps_max, duration_seconds
  )
  SELECT
    wel.id, ts.set_order, ts.set_type, ts.measurement_type,
    ts.weight_kg, ts.reps, ts.reps_min, ts.reps_max, ts.duration_seconds
  FROM temp_sets ts
  JOIN public.workout_exercise_logs wel
    ON wel.workout_log_id = v_log_id
   AND wel.variation_id = ts.variation_id
   AND wel.exercise_type = ts.exercise_type
   AND wel.position = ts.position
  ORDER BY ts.exercise_idx, ts.set_order;

  RETURN v_log_id;
END;
$$;

ALTER FUNCTION "public"."wt_insert_workout_log"("payload" "jsonb") OWNER TO "postgres";

GRANT ALL ON FUNCTION "public"."wt_insert_workout_log"("payload" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."wt_insert_workout_log"("payload" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."wt_insert_workout_log"("payload" "jsonb") TO "service_role";
