-- ============================================================================
-- Unificação dos exercícios de treino em uma tabela só.
--
-- Antes: dois pares de hierarquias paralelas
--   musculação   -> workout_exercises / workout_sets (+ logs)
--   preparatório -> workout_preparatory_exercises / workout_preparatory_sets (+ logs)
--
-- Depois: tudo vive em workout_exercises / workout_sets (+ logs), com dois eixos
-- ortogonais por exercício-no-treino:
--   exercise_type    (preparatory | strength)  -> categoria + espaço de position
--   measurement_type (weight_reps | reps | duration | duration_reps
--                     | weight_duration | weight_reps_duration) -> quais dimensões
--
-- Cada set guarda até 3 dimensões opcionais: reps (reps_min/reps_max),
-- peso (só no log: weight_kg) e tempo (duration_seconds).
--
-- ESCOPO: apenas as tabelas de TEMPLATE (workout_exercises / workout_sets).
-- As tabelas de LOG ficam para uma migração futura (ver NOTA na Parte 1).
--
-- Compatibilidade com o PWA legado: as 2 tabelas de template
-- workout_preparatory_exercises / workout_preparatory_sets são recriadas como
-- VIEWS atualizáveis sobre as tabelas unificadas, com triggers INSTEAD OF.
-- A PWA só toca essas tabelas via RPC (get_workout/upsert_workout/copy_workout),
-- e os RPCs continuam com o mesmo contrato.
-- ============================================================================

-- ============================================================================
-- PARTE 1 — Schema das tabelas unificadas
-- ============================================================================

-- ---- workout_exercises (template) ----
-- Só exercise_type aqui (categoria + espaço de position). measurement_type vive
-- apenas em workout_sets — a regra "um measurement_type por exercício" é
-- garantida na aplicação, mantendo o banco flexível.
ALTER TABLE public.workout_exercises
  ADD COLUMN exercise_type text NOT NULL DEFAULT 'strength';

ALTER TABLE public.workout_exercises
  ADD CONSTRAINT workout_exercises_exercise_type_check
    CHECK (exercise_type IN ('preparatory', 'strength'));

-- position passa a ser único por (workout, categoria): cada bloco tem seu
-- próprio espaço 0..n, então preparatório e musculação não colidem.
DROP INDEX IF EXISTS public.workout_exercises_workout_position_superset_uidx;
CREATE UNIQUE INDEX workout_exercises_workout_type_position_superset_uidx
  ON public.workout_exercises (workout_id, exercise_type, position, superset_order);

-- ---- workout_sets (template) ----
-- reps_min/reps_max ficam nullable (dimensões opcionais por measurement_type).
-- set_type continua NOT NULL: preparatórios não têm warmup/drop/cluster, mas são
-- gravados como 'normal' (nunca NULL) para manter o eixo de tipo coeso.
ALTER TABLE public.workout_sets
  ALTER COLUMN reps_min DROP NOT NULL,
  ALTER COLUMN reps_max DROP NOT NULL;

ALTER TABLE public.workout_sets
  ADD COLUMN duration_seconds integer,
  ADD COLUMN measurement_type text NOT NULL DEFAULT 'weight_reps';

ALTER TABLE public.workout_sets
  ADD CONSTRAINT workout_sets_measurement_type_check
    CHECK (measurement_type IN (
      'weight_reps', 'reps', 'duration', 'duration_reps',
      'weight_duration', 'weight_reps_duration'
    )),
  ADD CONSTRAINT workout_sets_duration_positive
    CHECK (duration_seconds IS NULL OR duration_seconds > 0),
  -- presença (não exclusividade): garante as dimensões exigidas pelo tipo,
  -- sem proibir colunas extras — assim a migração de dados não falha por
  -- linhas legadas que tenham valores adicionais.
  ADD CONSTRAINT workout_sets_dimensions_present CHECK (
    (measurement_type NOT IN ('weight_reps', 'reps', 'duration_reps', 'weight_reps_duration')
       OR (reps_min IS NOT NULL AND reps_max IS NOT NULL))
    AND
    (measurement_type NOT IN ('duration', 'duration_reps', 'weight_duration', 'weight_reps_duration')
       OR duration_seconds IS NOT NULL)
  );

-- NOTA: as tabelas de LOG (workout_exercise_logs / workout_exercise_set_logs e
-- workout_preparatory_*_logs) NÃO são tocadas aqui. A unificação dos logs fica
-- para uma migração futura, separada, porque envolve ~11 funções que leem o
-- histórico/records de variação e que precisariam virar exercise_type-aware.
-- Por ora as tabelas workout_preparatory_*_logs continuam reais e intactas.

-- ============================================================================
-- PARTE 2 — Migração de dados: preparatory -> unificado
-- (roda ANTES de dropar as tabelas preparatory)
--   duration_type 'time' -> measurement_type 'duration'
--   duration_type 'reps' -> measurement_type 'reps'
-- IDs são preservados (as tabelas antigas serão dropadas, sem conflito de PK).
-- ============================================================================

INSERT INTO public.workout_exercises (
  id, workout_id, variation_id, note, rest_seconds, position,
  superset_group_id, superset_order, exercise_type, created_at, updated_at
)
SELECT
  wpe.id, wpe.workout_id, wpe.variation_id, wpe.note, NULL, wpe.position,
  wpe.id,                       -- standalone: convenção superset_group_id = id
  0,
  'preparatory',
  wpe.created_at, wpe.updated_at
FROM public.workout_preparatory_exercises wpe;

INSERT INTO public.workout_sets (
  id, workout_exercise_id, set_order, set_type, reps_min, reps_max,
  linked_set_id, load_percent_of_previous, duration_seconds, measurement_type,
  created_at, updated_at
)
SELECT
  wps.id, wps.workout_preparatory_exercise_id, wps.set_order, 'normal',
  CASE WHEN wpe.duration_type = 'reps' THEN wps.reps END,
  CASE WHEN wpe.duration_type = 'reps' THEN wps.reps END,
  NULL, NULL,
  CASE WHEN wpe.duration_type = 'time' THEN wps.duration_seconds END,
  CASE wpe.duration_type WHEN 'time' THEN 'duration' ELSE 'reps' END,
  wps.created_at, wps.updated_at
FROM public.workout_preparatory_sets wps
JOIN public.workout_preparatory_exercises wpe
  ON wpe.id = wps.workout_preparatory_exercise_id;

-- ============================================================================
-- PARTE 3 — Dropar tabelas preparatory de TEMPLATE e recriá-las como VIEWS
-- atualizáveis. As tabelas de log preparatório permanecem reais e intactas.
-- ============================================================================

DROP TABLE IF EXISTS public.workout_preparatory_sets CASCADE;
DROP TABLE IF EXISTS public.workout_preparatory_exercises CASCADE;

-- ---- View: workout_preparatory_exercises ----
CREATE VIEW public.workout_preparatory_exercises
WITH (security_invoker = true) AS
SELECT
  we.id,
  we.workout_id,
  we.variation_id,
  we.position,
  -- duration_type derivado dos sets (todos compartilham o mesmo tipo por regra
  -- de negócio); 'time' como fallback quando o exercício ainda não tem sets.
  COALESCE((
    SELECT CASE WHEN ws.measurement_type = 'reps' THEN 'reps' ELSE 'time' END
    FROM public.workout_sets ws
    WHERE ws.workout_exercise_id = we.id
    ORDER BY ws.set_order ASC, ws.id ASC
    LIMIT 1
  ), 'time') AS duration_type,
  we.note,
  we.created_at,
  we.updated_at
FROM public.workout_exercises we
WHERE we.exercise_type = 'preparatory';

CREATE OR REPLACE FUNCTION public.wt_prep_exercises_view_insert() RETURNS trigger
  LANGUAGE plpgsql SECURITY INVOKER SET search_path TO 'public' AS $$
DECLARE
  v_id uuid := COALESCE(NEW.id, gen_random_uuid());
BEGIN
  -- duration_type não é persistido no exercício; ele é derivado dos sets
  -- (cujo measurement_type é definido no trigger de workout_preparatory_sets).
  INSERT INTO public.workout_exercises (
    id, workout_id, variation_id, note, rest_seconds, position,
    superset_group_id, superset_order, exercise_type
  )
  VALUES (
    v_id, NEW.workout_id, NEW.variation_id,
    NEW.note, NULL, NEW.position,
    v_id, 0, 'preparatory'
  );
  NEW.id := v_id;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.wt_prep_exercises_view_update() RETURNS trigger
  LANGUAGE plpgsql SECURITY INVOKER SET search_path TO 'public' AS $$
BEGIN
  -- duration_type vive nos sets; aqui só atualizamos os campos do exercício.
  UPDATE public.workout_exercises
  SET workout_id   = NEW.workout_id,
      variation_id = NEW.variation_id,
      position     = NEW.position,
      note         = NEW.note
  WHERE id = OLD.id AND exercise_type = 'preparatory';
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.wt_prep_exercises_view_delete() RETURNS trigger
  LANGUAGE plpgsql SECURITY INVOKER SET search_path TO 'public' AS $$
BEGIN
  DELETE FROM public.workout_exercises
  WHERE id = OLD.id AND exercise_type = 'preparatory';
  RETURN OLD;
END;
$$;

CREATE TRIGGER wt_prep_exercises_view_insert_trg INSTEAD OF INSERT
  ON public.workout_preparatory_exercises
  FOR EACH ROW EXECUTE FUNCTION public.wt_prep_exercises_view_insert();
CREATE TRIGGER wt_prep_exercises_view_update_trg INSTEAD OF UPDATE
  ON public.workout_preparatory_exercises
  FOR EACH ROW EXECUTE FUNCTION public.wt_prep_exercises_view_update();
CREATE TRIGGER wt_prep_exercises_view_delete_trg INSTEAD OF DELETE
  ON public.workout_preparatory_exercises
  FOR EACH ROW EXECUTE FUNCTION public.wt_prep_exercises_view_delete();

-- ---- View: workout_preparatory_sets ----
CREATE VIEW public.workout_preparatory_sets
WITH (security_invoker = true) AS
SELECT
  ws.id,
  ws.workout_exercise_id AS workout_preparatory_exercise_id,
  ws.set_order,
  ws.duration_seconds,
  ws.reps_min AS reps,
  ws.created_at,
  ws.updated_at
FROM public.workout_sets ws
JOIN public.workout_exercises we ON we.id = ws.workout_exercise_id
WHERE we.exercise_type = 'preparatory';

CREATE OR REPLACE FUNCTION public.wt_prep_sets_view_insert() RETURNS trigger
  LANGUAGE plpgsql SECURITY INVOKER SET search_path TO 'public' AS $$
DECLARE
  v_id uuid := COALESCE(NEW.id, gen_random_uuid());
BEGIN
  -- Preparatório só tem duration ou reps: inferimos pelo dado presente.
  -- set_type é sempre 'normal' (preparatório não tem warmup/drop/cluster).
  INSERT INTO public.workout_sets (
    id, workout_exercise_id, set_order, set_type, reps_min, reps_max,
    linked_set_id, load_percent_of_previous, duration_seconds, measurement_type
  )
  VALUES (
    v_id, NEW.workout_preparatory_exercise_id,
    NEW.set_order, 'normal', NEW.reps, NEW.reps, NULL, NULL,
    NEW.duration_seconds,
    CASE WHEN NEW.duration_seconds IS NOT NULL THEN 'duration' ELSE 'reps' END
  );
  NEW.id := v_id;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.wt_prep_sets_view_update() RETURNS trigger
  LANGUAGE plpgsql SECURITY INVOKER SET search_path TO 'public' AS $$
BEGIN
  UPDATE public.workout_sets
  SET set_order        = NEW.set_order,
      duration_seconds = NEW.duration_seconds,
      reps_min         = NEW.reps,
      reps_max         = NEW.reps
  WHERE id = OLD.id;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.wt_prep_sets_view_delete() RETURNS trigger
  LANGUAGE plpgsql SECURITY INVOKER SET search_path TO 'public' AS $$
BEGIN
  DELETE FROM public.workout_sets WHERE id = OLD.id;
  RETURN OLD;
END;
$$;

CREATE TRIGGER wt_prep_sets_view_insert_trg INSTEAD OF INSERT
  ON public.workout_preparatory_sets
  FOR EACH ROW EXECUTE FUNCTION public.wt_prep_sets_view_insert();
CREATE TRIGGER wt_prep_sets_view_update_trg INSTEAD OF UPDATE
  ON public.workout_preparatory_sets
  FOR EACH ROW EXECUTE FUNCTION public.wt_prep_sets_view_update();
CREATE TRIGGER wt_prep_sets_view_delete_trg INSTEAD OF DELETE
  ON public.workout_preparatory_sets
  FOR EACH ROW EXECUTE FUNCTION public.wt_prep_sets_view_delete();

-- Grants espelhando os das tabelas de template originais.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workout_preparatory_exercises TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workout_preparatory_sets TO anon, authenticated, service_role;

-- ============================================================================
-- PARTE 4 — Filtrar leitores do bloco de musculação (exercise_type='strength')
-- para que linhas preparatórias (agora na mesma tabela) não vazem.
-- upsert_workout NÃO muda: já faz DELETE geral por workout e cada branch
-- re-insere; o auto-share dedup por ON CONFLICT.
-- ============================================================================

-- ---- get_workout: filtro no bloco exercises + expõe measurement_type/duration_seconds ----
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
            'measurement_type', (
              SELECT ws.measurement_type FROM public.workout_sets ws
              WHERE ws.workout_exercise_id = we.id
              ORDER BY ws.set_order ASC, ws.id ASC LIMIT 1
            ),
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
                    'measurement_type', ws.measurement_type,
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
            'duration_type', COALESCE((
              SELECT CASE WHEN ws.measurement_type = 'reps' THEN 'reps' ELSE 'time' END
              FROM public.workout_sets ws WHERE ws.workout_exercise_id = we.id
              ORDER BY ws.set_order ASC, ws.id ASC LIMIT 1
            ), 'time'),
            'measurement_type', (
              SELECT ws.measurement_type FROM public.workout_sets ws
              WHERE ws.workout_exercise_id = we.id
              ORDER BY ws.set_order ASC, ws.id ASC LIMIT 1
            ),
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

-- ---- list_workouts_with_summary: contar só musculação no resumo ----
CREATE OR REPLACE FUNCTION public.list_workouts_with_summary(p_user_id uuid, p_folder_id uuid DEFAULT NULL::uuid) RETURNS jsonb
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

  IF actor_id <> p_user_id AND NOT public.is_active_coach_of(actor_id, p_user_id) THEN
    RAISE EXCEPTION 'Not authorized to list workouts for this user';
  END IF;

  SELECT COALESCE(
    jsonb_agg(
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
        'updated_at', w.updated_at,
        'exercise_count', COALESCE(summary.exercise_count, 0),
        'muscle_names', COALESCE(summary.muscle_names, '[]'::jsonb),
        'folder_name', f.name,
        'folder_color', f.color
      )
      ORDER BY w.name, w.id
    ),
    '[]'::jsonb
  )
  INTO result
  FROM public.workouts w
  LEFT JOIN public.workout_folders f ON f.id = w.folder_id
  LEFT JOIN LATERAL (
    SELECT
      COUNT(DISTINCT we.id)::int AS exercise_count,
      jsonb_agg(DISTINCT m.name ORDER BY m.name)
        FILTER (WHERE m.name IS NOT NULL) AS muscle_names
    FROM public.workout_exercises we
    JOIN public.variations v ON v.id = we.variation_id
    JOIN public.muscles m ON m.id = v.muscle_id
    WHERE we.workout_id = w.id
      AND we.exercise_type = 'strength'
  ) summary ON true
  WHERE w.user_id = p_user_id
    AND (
      (p_folder_id IS NULL AND w.folder_id IS NULL)
      OR (p_folder_id IS NOT NULL AND w.folder_id = p_folder_id)
    );

  RETURN result;
END;
$$;

-- ---- search_workouts: contar só musculação no resumo ----
CREATE OR REPLACE FUNCTION public.search_workouts(p_user_id uuid, p_query text) RETURNS jsonb
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

  IF actor_id <> p_user_id AND NOT public.is_active_coach_of(actor_id, p_user_id) THEN
    RAISE EXCEPTION 'Not authorized to search workouts for this user';
  END IF;

  SELECT COALESCE(
    jsonb_agg(
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
        'updated_at', w.updated_at,
        'exercise_count', COALESCE(summary.exercise_count, 0),
        'muscle_names', COALESCE(summary.muscle_names, '[]'::jsonb),
        'folder_name', f.name,
        'folder_color', f.color
      )
      ORDER BY w.name, w.id
    ),
    '[]'::jsonb
  )
  INTO result
  FROM public.workouts w
  LEFT JOIN public.workout_folders f ON f.id = w.folder_id
  LEFT JOIN LATERAL (
    SELECT
      COUNT(DISTINCT we.id)::int AS exercise_count,
      jsonb_agg(DISTINCT m.name ORDER BY m.name)
        FILTER (WHERE m.name IS NOT NULL) AS muscle_names
    FROM public.workout_exercises we
    JOIN public.variations v ON v.id = we.variation_id
    JOIN public.muscles m ON m.id = v.muscle_id
    WHERE we.workout_id = w.id
      AND we.exercise_type = 'strength'
  ) summary ON true
  WHERE w.user_id = p_user_id
    AND w.name ILIKE '%' || p_query || '%';

  RETURN result;
END;
$$;

-- ---- copy_workout: filtrar leituras do bloco strength para strength ----
-- (o bloco preparatório continua lendo/gravando via view workout_preparatory_*)
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
    linked_set_id, load_percent_of_previous, duration_seconds, measurement_type
  )
  SELECT
    gen_random_uuid(), tm.new_id, ws.set_order, ws.set_type, ws.reps_min,
    ws.reps_max, NULL::uuid, ws.load_percent_of_previous, ws.duration_seconds,
    ws.measurement_type
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

-- ---- wt_copy_workouts: filtrar o mapping inicial do bloco strength ----
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
      duration_seconds, measurement_type
    )
    SELECT
      gen_random_uuid(), em.new_id, ws.set_order, ws.set_type,
      ws.reps_min, ws.reps_max, NULL::uuid, ws.load_percent_of_previous,
      ws.duration_seconds, ws.measurement_type
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
