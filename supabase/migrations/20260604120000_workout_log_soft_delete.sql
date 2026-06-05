-- Soft-delete de workout log + recálculo dos records das variations envolvidas.
--
-- Espelha o wt_insert_workout_log: um único RPC atômico que persiste (marca
-- deleted_at/deleted_by) e recalcula os records das variations strength do log
-- via wt_recalculate_variation_records. O recálculo filtra workout_logs.deleted_at
-- IS NULL, então o log precisa estar marcado ANTES da chamada para sair do
-- cálculo. SECURITY INVOKER: a policy de soft-delete (dono ou coach ativo) e o
-- trigger guard_workout_log_soft_delete (só deleted_at/deleted_by podem mudar)
-- continuam valendo. Logs já apagados não são reapagados (deleted_at IS NULL no
-- lookup), e um id inexistente/sem acesso cai em P0002 (NotFound no adapter).

CREATE OR REPLACE FUNCTION "public"."wt_delete_workout_log"("p_workout_log_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY INVOKER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_actor_id UUID := (SELECT auth.uid());
  v_user_id UUID;
  v_variation_ids UUID[];
BEGIN
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'wt_delete_workout_log called without an authenticated user'
      USING ERRCODE = '28000';
  END IF;

  SELECT user_id INTO v_user_id
  FROM public.workout_logs
  WHERE id = p_workout_log_id
    AND deleted_at IS NULL;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'workout log not found'
      USING ERRCODE = 'P0002';
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

ALTER FUNCTION "public"."wt_delete_workout_log"("p_workout_log_id" "uuid") OWNER TO "postgres";

GRANT ALL ON FUNCTION "public"."wt_delete_workout_log"("p_workout_log_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."wt_delete_workout_log"("p_workout_log_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."wt_delete_workout_log"("p_workout_log_id" "uuid") TO "service_role";
