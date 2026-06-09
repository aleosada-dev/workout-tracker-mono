-- Permite que o criador do log (started_by) o exclua, não só o dono (user_id).
--
-- Antes: a policy de soft-delete liberava o dono OU qualquer coach ATIVO do
-- atleta (is_active_coach_of). Agora a regra do coach é mais estrita e estável:
-- só quem REGISTROU o treino (started_by) pode apagá-lo. started_by é gravado
-- pelo wt_insert_workout_log com o auth.uid() de quem criou o log (o coach,
-- quando ele registra para o aluno; o próprio atleta nos logs dele).
--
-- Dois ajustes em par:
--   1) a policy workout_logs_soft_delete passa a checar started_by;
--   2) wt_delete_workout_log ganha um guard explícito (42501) — sem ele um UPDATE
--      barrado pela RLS casaria 0 linhas e a função retornaria sucesso sem apagar
--      (no-op silencioso), já que o SELECT inicial ainda enxerga o log via a
--      policy de leitura de coach. O guard transforma isso em ForbiddenError.

DROP POLICY IF EXISTS "workout_logs_soft_delete" ON "public"."workout_logs";

CREATE POLICY "workout_logs_soft_delete" ON "public"."workout_logs"
  FOR UPDATE TO "authenticated"
  USING (
    ("user_id" = (SELECT auth.uid()))
    OR ("started_by" = (SELECT auth.uid()))
  )
  WITH CHECK (
    ("user_id" = (SELECT auth.uid()))
    OR ("started_by" = (SELECT auth.uid()))
  );

CREATE OR REPLACE FUNCTION "public"."wt_delete_workout_log"("p_workout_log_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY INVOKER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_actor_id UUID := (SELECT auth.uid());
  v_user_id UUID;
  v_started_by UUID;
  v_variation_ids UUID[];
BEGIN
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'wt_delete_workout_log called without an authenticated user'
      USING ERRCODE = '28000';
  END IF;

  SELECT user_id, started_by INTO v_user_id, v_started_by
  FROM public.workout_logs
  WHERE id = p_workout_log_id
    AND deleted_at IS NULL;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'workout log not found'
      USING ERRCODE = 'P0002';
  END IF;

  IF v_actor_id <> v_user_id AND v_actor_id <> v_started_by THEN
    RAISE EXCEPTION 'actor is neither the owner nor the creator of this workout log'
      USING ERRCODE = '42501';
  END IF;

  v_variation_ids := ARRAY(
    SELECT DISTINCT wel.variation_id
    FROM public.workout_exercise_logs wel
    WHERE wel.workout_log_id = p_workout_log_id
      AND wel.exercise_type = 'strength'
      AND wel.variation_id IS NOT NULL
  );

  UPDATE public.workout_logs
  SET deleted_at = now(),
      deleted_by = v_actor_id
  WHERE id = p_workout_log_id;

  IF array_length(v_variation_ids, 1) > 0 THEN
    PERFORM public.wt_recalculate_variation_records(v_user_id, v_variation_ids);
  END IF;
END;
$$;
