-- ============================================================================
-- Aliases de equipamento por variação (máquinas) + locais de treino.
--
-- Mesma variação pode render cargas diferentes em máquinas diferentes (roldanas,
-- modelo) — até dentro da mesma academia. O alias é a máquina física, privado do
-- atleta, vinculado a uma variação, com um local opcional. Logs, "última carga" e
-- records passam a ser segmentados por alias. Alias é opcional: sem alias é um
-- bucket próprio que cobre halteres e todo o histórico anterior.
--
-- Naming: tabelas sem prefixo wt_ (só functions usam). CRUD simples de
-- alias/local fica na camada de API via PostgREST + RLS; aqui só vão as
-- alterações de schema e as functions que precisam de atomicidade/agregação.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- training_locations: lista privada do atleta (só nome na v1, sem GPS).
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "public"."training_locations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "deleted_at" timestamp with time zone,
    "deleted_by" "uuid"
);

ALTER TABLE "public"."training_locations" OWNER TO "postgres";

ALTER TABLE ONLY "public"."training_locations"
    ADD CONSTRAINT "training_locations_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."training_locations"
    ADD CONSTRAINT "training_locations_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;

-- Nome único entre os locais ativos do atleta; soft-delete libera o nome de novo.
CREATE UNIQUE INDEX "training_locations_user_name_uidx"
    ON "public"."training_locations" ("user_id", "name")
    WHERE ("deleted_at" IS NULL);

CREATE OR REPLACE TRIGGER "training_locations_set_timestamps"
    BEFORE INSERT OR UPDATE ON "public"."training_locations"
    FOR EACH ROW
    EXECUTE FUNCTION "public"."set_timestamps"();

ALTER TABLE "public"."training_locations" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Athletes manage own training locations"
    ON "public"."training_locations"
    TO "authenticated"
    USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")))
    WITH CHECK (("user_id" = ( SELECT "auth"."uid"() AS "uid")));

CREATE POLICY "Coaches manage athlete training locations"
    ON "public"."training_locations"
    TO "authenticated"
    USING ("public"."is_active_coach_of"(( SELECT "auth"."uid"() AS "uid"), "user_id"))
    WITH CHECK ("public"."is_active_coach_of"(( SELECT "auth"."uid"() AS "uid"), "user_id"));

GRANT ALL ON TABLE "public"."training_locations" TO "anon";
GRANT ALL ON TABLE "public"."training_locations" TO "authenticated";
GRANT ALL ON TABLE "public"."training_locations" TO "service_role";

-- ----------------------------------------------------------------------------
-- variation_aliases: a máquina física. Uma por variação, privada do atleta,
-- com local opcional.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "public"."variation_aliases" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "variation_id" "uuid" NOT NULL,
    "location_id" "uuid",
    "name" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "deleted_at" timestamp with time zone,
    "deleted_by" "uuid"
);

ALTER TABLE "public"."variation_aliases" OWNER TO "postgres";

ALTER TABLE ONLY "public"."variation_aliases"
    ADD CONSTRAINT "variation_aliases_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."variation_aliases"
    ADD CONSTRAINT "variation_aliases_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."variation_aliases"
    ADD CONSTRAINT "variation_aliases_variation_id_fkey"
    FOREIGN KEY ("variation_id") REFERENCES "public"."variations"("id") ON DELETE CASCADE;

-- Local pode ser removido (soft-delete na app); aqui a FK só garante integridade
-- referencial. SET NULL para não derrubar o alias se a linha do local sumir.
ALTER TABLE ONLY "public"."variation_aliases"
    ADD CONSTRAINT "variation_aliases_location_id_fkey"
    FOREIGN KEY ("location_id") REFERENCES "public"."training_locations"("id") ON DELETE SET NULL;

-- Nome único por (atleta, variação) entre os aliases ativos.
CREATE UNIQUE INDEX "variation_aliases_user_variation_name_uidx"
    ON "public"."variation_aliases" ("user_id", "variation_id", "name")
    WHERE ("deleted_at" IS NULL);

-- Acesso quente: aliases ativos de um conjunto de variações do atleta.
CREATE INDEX "variation_aliases_user_variation_idx"
    ON "public"."variation_aliases" ("user_id", "variation_id")
    WHERE ("deleted_at" IS NULL);

CREATE OR REPLACE TRIGGER "variation_aliases_set_timestamps"
    BEFORE INSERT OR UPDATE ON "public"."variation_aliases"
    FOR EACH ROW
    EXECUTE FUNCTION "public"."set_timestamps"();

ALTER TABLE "public"."variation_aliases" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Athletes manage own variation aliases"
    ON "public"."variation_aliases"
    TO "authenticated"
    USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")))
    WITH CHECK (("user_id" = ( SELECT "auth"."uid"() AS "uid")));

CREATE POLICY "Coaches manage athlete variation aliases"
    ON "public"."variation_aliases"
    TO "authenticated"
    USING ("public"."is_active_coach_of"(( SELECT "auth"."uid"() AS "uid"), "user_id"))
    WITH CHECK ("public"."is_active_coach_of"(( SELECT "auth"."uid"() AS "uid"), "user_id"));

GRANT ALL ON TABLE "public"."variation_aliases" TO "anon";
GRANT ALL ON TABLE "public"."variation_aliases" TO "authenticated";
GRANT ALL ON TABLE "public"."variation_aliases" TO "service_role";

-- ----------------------------------------------------------------------------
-- workout_exercise_logs: alias usado naquele exercício (nullable = sem alias).
-- alias_name é snapshot, sobrevive ao soft-delete do alias (mesmo padrão de
-- exercise_name/variation_name). As policies de linha já existentes (atleta +
-- coach) cobrem as colunas novas.
-- ----------------------------------------------------------------------------
ALTER TABLE "public"."workout_exercise_logs"
    ADD COLUMN IF NOT EXISTS "alias_id" "uuid";

ALTER TABLE "public"."workout_exercise_logs"
    ADD COLUMN IF NOT EXISTS "alias_name" "text";

ALTER TABLE ONLY "public"."workout_exercise_logs"
    ADD CONSTRAINT "workout_exercise_logs_alias_id_fkey"
    FOREIGN KEY ("alias_id") REFERENCES "public"."variation_aliases"("id") ON DELETE SET NULL;

CREATE INDEX "workout_exercise_logs_alias_id_idx"
    ON "public"."workout_exercise_logs" ("alias_id")
    WHERE ("alias_id" IS NOT NULL);

-- ----------------------------------------------------------------------------
-- workout_variation_records: alias_id NULL = PR geral (máximo entre todas as
-- máquinas + logs sem alias). Linhas existentes viram o geral (NULL por DEFAULT).
-- A unique vira (user_id, variation_id, alias_id) NULLS NOT DISTINCT para a linha
-- geral conviver com as linhas por alias.
-- ----------------------------------------------------------------------------
ALTER TABLE "public"."workout_variation_records"
    ADD COLUMN IF NOT EXISTS "alias_id" "uuid";

ALTER TABLE ONLY "public"."workout_variation_records"
    ADD CONSTRAINT "workout_variation_records_alias_id_fkey"
    FOREIGN KEY ("alias_id") REFERENCES "public"."variation_aliases"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."workout_variation_records"
    DROP CONSTRAINT IF EXISTS "workout_variation_records_user_variation_uidx";

CREATE UNIQUE INDEX "workout_variation_records_user_variation_alias_uidx"
    ON "public"."workout_variation_records" ("user_id", "variation_id", "alias_id")
    NULLS NOT DISTINCT;

-- ----------------------------------------------------------------------------
-- recalculate_variation_records (legado PWA, sem prefixo, DEFINER): continua viva
-- e chamada pelo PWA enquanto os dois apps coexistem no mesmo banco. Dois ajustes
-- para conviver com a segmentação por alias:
--   1. O DELETE passa a escopar alias_id IS NULL — antes apagava TODAS as linhas
--      da variação (geral + por alias) e reinseria só a geral, destruindo os PRs
--      por máquina que o mobile calcula. Agora só toca na linha geral, que é a
--      única que ela sabe manter (não grava alias_id).
--   2. O ON CONFLICT aponta para (user_id, variation_id, alias_id) para casar com
--      a unique nova (NULLS NOT DISTINCT). Como sempre grava alias_id NULL, segue
--      cuidando apenas do PR geral.
-- Semântica do valor geral diverge da do mobile (normal-only vs todos os tipos +
-- pref) — divergência que já existia entre as duas funções; fora do escopo aqui.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION "public"."recalculate_variation_records"("p_user_id" "uuid", "p_variation_ids" "uuid"[]) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- Só a linha geral (alias NULL); as linhas por alias são mantidas pelo mobile.
  DELETE FROM public.workout_variation_records
  WHERE user_id = p_user_id
    AND variation_id = ANY(p_variation_ids)
    AND alias_id IS NULL;

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
  ON CONFLICT (user_id, variation_id, alias_id) DO UPDATE SET
    max_weight_kg = EXCLUDED.max_weight_kg,
    max_volume_kg = EXCLUDED.max_volume_kg,
    max_reps = EXCLUDED.max_reps,
    max_sets = EXCLUDED.max_sets,
    updated_at = NOW();
END;
$$;

-- ----------------------------------------------------------------------------
-- wt_recalculate_variation_records: recalcula o PR geral (alias NULL) e um PR
-- por alias presente. DELETE limpa todas as linhas da variação (geral + por
-- alias) antes de reinserir.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION "public"."wt_recalculate_variation_records"("p_user_id" "uuid", "p_variation_ids" "uuid"[]) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY INVOKER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  -- Mesmas métricas/preferência do recálculo anterior: todos os tipos de set,
  -- incluindo warmup só se count_warmup_sets=true. Lido no save (defasa ao trocar
  -- a pref até treinar de novo). A pref é sempre a do atleta (p_user_id).
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
    user_id, variation_id, alias_id, max_weight_kg, max_volume_kg, max_reps, max_sets
  )
  SELECT
    p_user_id,
    variation_id,
    NULL::uuid,
    MAX(session_max_weight_kg),
    MAX(session_max_volume_kg),
    MAX(session_max_reps),
    MAX(session_sets_count)
  FROM (
    SELECT
      wel.variation_id,
      MAX(wesl.weight_kg) AS session_max_weight_kg,
      COALESCE(SUM(wesl.weight_kg * wesl.reps), 0) AS session_max_volume_kg,
      MAX(wesl.reps) AS session_max_reps,
      COUNT(*)::INTEGER AS session_sets_count
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
    user_id, variation_id, alias_id, max_weight_kg, max_volume_kg, max_reps, max_sets
  )
  SELECT
    p_user_id,
    variation_id,
    alias_id,
    MAX(session_max_weight_kg),
    MAX(session_max_volume_kg),
    MAX(session_max_reps),
    MAX(session_sets_count)
  FROM (
    SELECT
      wel.variation_id,
      wel.alias_id,
      MAX(wesl.weight_kg) AS session_max_weight_kg,
      COALESCE(SUM(wesl.weight_kg * wesl.reps), 0) AS session_max_volume_kg,
      MAX(wesl.reps) AS session_max_reps,
      COUNT(*)::INTEGER AS session_sets_count
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

ALTER FUNCTION "public"."wt_recalculate_variation_records"("p_user_id" "uuid", "p_variation_ids" "uuid"[]) OWNER TO "postgres";
GRANT ALL ON FUNCTION "public"."wt_recalculate_variation_records"("p_user_id" "uuid", "p_variation_ids" "uuid"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."wt_recalculate_variation_records"("p_user_id" "uuid", "p_variation_ids" "uuid"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."wt_recalculate_variation_records"("p_user_id" "uuid", "p_variation_ids" "uuid"[]) TO "service_role";

-- ----------------------------------------------------------------------------
-- wt_last_sets_by_variations: agora segmenta a última carga por (variação, alias)
-- — incluindo o bucket alias NULL — e carrega o last_used_alias_id da variação
-- (alias do log mais recente) para a pré-seleção na execução, num só round-trip.
-- A mudança de colunas exige DROP antes do CREATE.
-- ----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS "public"."wt_last_sets_by_variations"("uuid", "uuid"[]);

CREATE OR REPLACE FUNCTION public.wt_last_sets_by_variations(
  p_user_id uuid,
  p_variation_ids uuid[]
)
RETURNS TABLE (
  variation_id uuid,
  alias_id uuid,
  logical_key text,
  weight_kg numeric,
  reps integer,
  last_used_alias_id uuid
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path TO 'public'
AS $$
  WITH base AS (
    SELECT
      wel.variation_id,
      wel.alias_id,
      wel.id           AS exercise_log_id,
      wesl.id          AS set_log_id,
      wl.finished_at,
      wl.id            AS workout_log_id,
      wesl.set_type,
      wesl.set_order,
      wesl.weight_kg,
      wesl.reps,
      (CASE WHEN wesl.set_type = 'warmup' THEN 0 ELSE 1 END) AS type_rank
    FROM public.workout_exercise_set_logs wesl
    JOIN public.workout_exercise_logs wel ON wel.id = wesl.workout_exercise_log_id
    JOIN public.workout_logs wl           ON wl.id  = wel.workout_log_id
    WHERE wel.variation_id = ANY(p_variation_ids)
      AND wl.user_id = p_user_id
      AND wl.deleted_at IS NULL
  ),
  counted AS (
    SELECT b.*,
      SUM((b.set_type = 'normal')::int) OVER w AS normal_running,
      SUM((b.set_type = 'warmup')::int) OVER w AS warmup_running
    FROM base b
    WINDOW w AS (PARTITION BY b.exercise_log_id
                 ORDER BY b.type_rank, b.set_order, b.set_log_id
                 ROWS UNBOUNDED PRECEDING)
  ),
  keyed AS (
    SELECT c.*,
      ROW_NUMBER() OVER (PARTITION BY c.exercise_log_id, c.set_type, c.normal_running
                         ORDER BY c.set_order, c.set_log_id) AS intra_idx
    FROM counted c
  ),
  with_key AS (
    SELECT k.variation_id, k.alias_id, k.weight_kg, k.reps, k.finished_at, k.workout_log_id,
      CASE k.set_type
        WHEN 'warmup'  THEN 'warmup-'  || k.warmup_running
        WHEN 'normal'  THEN 'normal-'  || k.normal_running
        WHEN 'drop'    THEN 'n' || k.normal_running || '-drop-'    || k.intra_idx
        WHEN 'cluster' THEN 'n' || k.normal_running || '-cluster-' || k.intra_idx
      END AS logical_key
    FROM keyed k
  ),
  -- alias do log mais recente por variação (pré-seleção "último usado")
  last_log AS (
    SELECT DISTINCT ON (wel.variation_id)
      wel.variation_id,
      wel.alias_id AS last_used_alias_id
    FROM public.workout_exercise_logs wel
    JOIN public.workout_logs wl ON wl.id = wel.workout_log_id
    WHERE wel.variation_id = ANY(p_variation_ids)
      AND wl.user_id = p_user_id
      AND wl.deleted_at IS NULL
    ORDER BY wel.variation_id, wl.finished_at DESC, wl.id DESC
  ),
  last_sets AS (
    SELECT DISTINCT ON (variation_id, alias_id, logical_key)
      variation_id, alias_id, logical_key, weight_kg, reps
    FROM with_key
    ORDER BY variation_id, alias_id, logical_key, finished_at DESC, workout_log_id DESC
  )
  SELECT
    ls.variation_id,
    ls.alias_id,
    ls.logical_key,
    ls.weight_kg,
    ls.reps,
    ll.last_used_alias_id
  FROM last_sets ls
  LEFT JOIN last_log ll ON ll.variation_id = ls.variation_id;
$$;

ALTER FUNCTION public.wt_last_sets_by_variations(uuid, uuid[]) OWNER TO postgres;
GRANT ALL ON FUNCTION public.wt_last_sets_by_variations(uuid, uuid[]) TO anon;
GRANT ALL ON FUNCTION public.wt_last_sets_by_variations(uuid, uuid[]) TO authenticated;
GRANT ALL ON FUNCTION public.wt_last_sets_by_variations(uuid, uuid[]) TO service_role;

-- ----------------------------------------------------------------------------
-- wt_insert_workout_log: captura aliasId por exercício, valida que o alias é do
-- atleta e da variação, e grava alias_id + snapshot alias_name. O recálculo de
-- records (geral + por alias) já está em wt_recalculate_variation_records.
-- ----------------------------------------------------------------------------
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
    NULLIF(ex.value->>'aliasId', '')::uuid AS alias_id,
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

  -- Alias (quando informado) precisa ser do atleta, da mesma variação e ativo.
  IF EXISTS (
    SELECT 1 FROM temp_exercises te
    WHERE te.alias_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM public.variation_aliases va
        WHERE va.id = te.alias_id
          AND va.user_id = v_user_id
          AND va.variation_id = te.variation_id
          AND va.deleted_at IS NULL
      )
  ) THEN
    RAISE EXCEPTION 'invalid alias_id for variation' USING ERRCODE = '22023';
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
    workout_log_id, variation_id, alias_id, exercise_type, position, note, rest_seconds,
    superset_group_id, exercise_name, variation_name, alias_name
  )
  SELECT
    v_log_id, te.variation_id, te.alias_id, te.exercise_type, te.position, te.note,
    te.rest_seconds, te.superset_group_id, e.name, v.name, va.name
  FROM temp_exercises te
  JOIN public.variations v ON v.id = te.variation_id
  JOIN public.exercises e ON e.id = v.exercise_id
  LEFT JOIN public.variation_aliases va ON va.id = te.alias_id
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
