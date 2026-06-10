-- ----------------------------------------------------------------------------
-- wt_last_sets_by_variations: passa a projetar também duration_seconds e
-- distance_meters do último set por slot lógico, para alimentar os placeholders
-- de última execução dos tipos de medição duração e distância na execução do
-- treino (peso/reps já eram cobertos). As colunas de origem já existem em
-- workout_exercise_set_logs. A mudança de colunas de retorno exige DROP antes
-- do CREATE.
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
  duration_seconds integer,
  distance_meters integer,
  finished_at timestamptz,
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
      wesl.duration_seconds,
      wesl.distance_meters,
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
    SELECT k.variation_id, k.alias_id, k.weight_kg, k.reps,
      k.duration_seconds, k.distance_meters, k.finished_at, k.workout_log_id,
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
      variation_id, alias_id, logical_key, weight_kg, reps,
      duration_seconds, distance_meters, finished_at
    FROM with_key
    ORDER BY variation_id, alias_id, logical_key, finished_at DESC, workout_log_id DESC
  )
  SELECT
    ls.variation_id,
    ls.alias_id,
    ls.logical_key,
    ls.weight_kg,
    ls.reps,
    ls.duration_seconds,
    ls.distance_meters,
    ls.finished_at,
    ll.last_used_alias_id
  FROM last_sets ls
  LEFT JOIN last_log ll ON ll.variation_id = ls.variation_id;
$$;

ALTER FUNCTION public.wt_last_sets_by_variations(uuid, uuid[]) OWNER TO postgres;
GRANT ALL ON FUNCTION public.wt_last_sets_by_variations(uuid, uuid[]) TO anon;
GRANT ALL ON FUNCTION public.wt_last_sets_by_variations(uuid, uuid[]) TO authenticated;
GRANT ALL ON FUNCTION public.wt_last_sets_by_variations(uuid, uuid[]) TO service_role;
