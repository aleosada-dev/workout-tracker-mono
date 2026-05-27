-- Keep the existing archived_at contract for now and add who archived it.
-- `archived_at IS NULL` means active.
ALTER TABLE "public"."workouts"
  ADD COLUMN IF NOT EXISTS "arquived_by" "uuid";

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'workouts_arquived_by_fkey'
       AND conrelid = 'public.workouts'::regclass
  ) THEN
    ALTER TABLE ONLY "public"."workouts"
      ADD CONSTRAINT "workouts_arquived_by_fkey"
      FOREIGN KEY ("arquived_by") REFERENCES "auth"."users"("id");
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "workouts_active_folder_idx"
  ON "public"."workouts" USING "btree" ("user_id", "folder_id")
  WHERE ("archived_at" IS NULL);

CREATE INDEX IF NOT EXISTS "workouts_arquived_by_idx"
  ON "public"."workouts" USING "btree" ("arquived_by")
  WHERE ("arquived_by" IS NOT NULL);

-- ================================================
-- wt_delete_workout_folder: remove uma pasta de p_user_id aplicando uma das três
-- estratégias para os treinos contidos. Todas as etapas rodam na mesma
-- transação. O caller (auth.uid()) deve ser o próprio dono ou um coach ativo
-- de p_user_id; demais casos retornam P0002.
--   p_mode = 'delete-folder-only': só apaga a pasta (uso esperado quando não
--     há treinos ativos; treinos arquivados remanescentes ficam com folder_id
--     NULL pela FK ON DELETE SET NULL).
--   p_mode = 'delete-with-workouts': soft-delete (archived_at + arquived_by)
--     dos treinos ativos da pasta antes de apagá-la.
--   p_mode = 'move-workouts': move os treinos ativos para p_target_folder_id
--     (NULL = raiz) antes de apagar a pasta.
-- SQLSTATEs:
--   28000 - sem usuário autenticado
--   22023 - p_mode inválido / target_folder_id == folder_id
--   P0002 - pasta (origem ou destino) não encontrada para o usuário
-- ================================================
CREATE OR REPLACE FUNCTION "public"."wt_delete_workout_folder"(
  "p_folder_id" "uuid",
  "p_mode" "text",
  "p_user_id" "uuid",
  "p_target_folder_id" "uuid" DEFAULT NULL
) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_auth_id uuid := auth.uid();
BEGIN
  IF v_auth_id IS NULL THEN
    RAISE EXCEPTION 'wt_delete_workout_folder called without an authenticated user'
      USING ERRCODE = '28000';
  END IF;

  IF v_auth_id <> p_user_id
     AND NOT public.is_active_coach_of(v_auth_id, p_user_id) THEN
    RAISE EXCEPTION 'workout folder not found' USING ERRCODE = 'P0002';
  END IF;

  IF p_mode NOT IN ('delete-folder-only', 'delete-with-workouts', 'move-workouts') THEN
    RAISE EXCEPTION 'invalid mode: %', p_mode USING ERRCODE = '22023';
  END IF;

  PERFORM 1 FROM public.workout_folders
   WHERE id = p_folder_id AND user_id = p_user_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'workout folder not found' USING ERRCODE = 'P0002';
  END IF;

  IF p_mode = 'delete-with-workouts' THEN
    UPDATE public.workouts
       SET archived_at = now(),
           arquived_by = v_auth_id,
           folder_id   = NULL
     WHERE folder_id = p_folder_id
       AND user_id = p_user_id
       AND archived_at IS NULL;
  ELSIF p_mode = 'move-workouts' THEN
    IF p_target_folder_id IS NOT NULL THEN
      IF p_target_folder_id = p_folder_id THEN
        RAISE EXCEPTION 'target folder must differ from source folder'
          USING ERRCODE = '22023';
      END IF;
      PERFORM 1 FROM public.workout_folders
       WHERE id = p_target_folder_id AND user_id = p_user_id;
      IF NOT FOUND THEN
        RAISE EXCEPTION 'target workout folder not found' USING ERRCODE = 'P0002';
      END IF;
    END IF;

    UPDATE public.workouts
       SET folder_id = p_target_folder_id
     WHERE folder_id = p_folder_id
       AND user_id = p_user_id
       AND archived_at IS NULL;
  END IF;

  DELETE FROM public.workout_folders
   WHERE id = p_folder_id AND user_id = p_user_id;
END;
$$;


ALTER FUNCTION "public"."wt_delete_workout_folder"("p_folder_id" "uuid", "p_mode" "text", "p_user_id" "uuid", "p_target_folder_id" "uuid") OWNER TO "postgres";

GRANT ALL ON FUNCTION "public"."wt_delete_workout_folder"("p_folder_id" "uuid", "p_mode" "text", "p_user_id" "uuid", "p_target_folder_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."wt_delete_workout_folder"("p_folder_id" "uuid", "p_mode" "text", "p_user_id" "uuid", "p_target_folder_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."wt_delete_workout_folder"("p_folder_id" "uuid", "p_mode" "text", "p_user_id" "uuid", "p_target_folder_id" "uuid") TO "service_role";

-- =============================================================
-- wt_share_variations_for_copy: insere em shared_variations as
-- variações do coach usadas pelos workouts recém-copiados.
--
-- Por que SECURITY DEFINER: a policy shared_variations_insert faz
-- EXISTS … FROM public.variations no WITH CHECK, e
-- variations_select_scoped por sua vez referencia shared_variations
-- no USING. Esse ciclo dispara `42P17 — infinite recursion detected
-- in policy for relation "shared_variations"` se rodarmos em
-- SECURITY INVOKER. Encapsulamos só esse passo num DEFINER que
-- valida explicitamente is_active_coach_of antes de inserir — assim
-- mantemos o wt_copy_workouts em INVOKER (RLS-aware) e só pulamos a
-- policy recursiva onde ela atrapalha.
-- =============================================================

CREATE OR REPLACE FUNCTION "public"."wt_share_variations_for_copy"(
  "p_target_user_id" "uuid",
  "p_new_workout_ids" "uuid"[]
) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_actor_id uuid := auth.uid();
BEGIN
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'wt_share_variations_for_copy called without an authenticated user'
      USING ERRCODE = '28000';
  END IF;

  IF NOT public.is_active_coach_of(v_actor_id, p_target_user_id) THEN
    RAISE EXCEPTION 'not authorized to share variations with this athlete'
      USING ERRCODE = '42501';
  END IF;

  IF p_new_workout_ids IS NULL OR array_length(p_new_workout_ids, 1) IS NULL THEN
    RETURN;
  END IF;

  INSERT INTO public.shared_variations (variation_id, owner_id, shared_with_id)
  SELECT DISTINCT v.id, v.user_id, p_target_user_id
  FROM public.workout_exercises we
  JOIN public.variations v ON v.id = we.variation_id
  WHERE we.workout_id = ANY (p_new_workout_ids)
    AND v.user_id IS NOT NULL
    AND v.user_id <> p_target_user_id
    AND v.user_id = v_actor_id
  ON CONFLICT (variation_id, shared_with_id) DO NOTHING;

  INSERT INTO public.shared_variations (variation_id, owner_id, shared_with_id)
  SELECT DISTINCT v.id, v.user_id, p_target_user_id
  FROM public.workout_preparatory_exercises wpe
  JOIN public.variations v ON v.id = wpe.variation_id
  WHERE wpe.workout_id = ANY (p_new_workout_ids)
    AND v.user_id IS NOT NULL
    AND v.user_id <> p_target_user_id
    AND v.user_id = v_actor_id
  ON CONFLICT (variation_id, shared_with_id) DO NOTHING;
END;
$$;

ALTER FUNCTION "public"."wt_share_variations_for_copy"("p_target_user_id" "uuid", "p_new_workout_ids" "uuid"[]) OWNER TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."wt_share_variations_for_copy"("p_target_user_id" "uuid", "p_new_workout_ids" "uuid"[]) TO "authenticated";

-- =============================================================
-- wt_copy_workouts: batch copy de treinos do coach para um atleta,
-- opcionalmente colocando-os em uma pasta pré-existente do atleta.
--
-- Substitui o antigo public.copy_workout (single, SECURITY DEFINER),
-- que permanece no schema marcado como deprecated até confirmarmos
-- que nada mais o chama.
--
-- Decisões:
--   * SECURITY INVOKER — as RLS já cobrem o caso (coach ativo do
--     atleta pode SELECT/INSERT em workouts, workout_exercises,
--     workout_sets, workout_preparatory_*, workout_folders).
--     Não duplicamos a checagem aqui; se as policies negarem, o
--     INSERT cai com 42501 e o cliente recebe 403. A exceção é o
--     auto-share em shared_variations, delegado a um helper DEFINER
--     (wt_share_variations_for_copy) por causa do ciclo de policies
--     shared_variations_insert <-> variations_select_scoped (42P17).
--   * Valida explicitamente apenas: (a) auth.uid() presente,
--     (b) array de origem não-vazio, (c) pasta destino, se passada,
--     pertence ao p_target_user_id.
--   * Preserva ordem de retorno conforme p_source_workout_ids.
--   * Mantém a lógica de remap de superset_group_id:
--     standalone (grupo de 1 membro) recebe o id do próprio
--     novo exercise (mantém a convenção superset_group_id = id);
--     superset real (>= 2 membros) recebe um UUID novo, isolado
--     por workout de origem.
--
-- SQLSTATEs:
--   28000 — sem usuário autenticado
--   22023 — input inválido (array vazio)
--   P0002 — pasta destino inválida ou origens inacessíveis
-- =============================================================

CREATE OR REPLACE FUNCTION "public"."wt_copy_workouts"(
  "p_source_workout_ids" "uuid"[],
  "p_target_user_id"     "uuid",
  "p_target_folder_id"   "uuid" DEFAULT NULL
) RETURNS "uuid"[]
    LANGUAGE "plpgsql" SECURITY INVOKER
    SET "search_path" TO 'public'
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
     WHERE id = p_target_folder_id
       AND user_id = p_target_user_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'target folder not found for target user'
        USING ERRCODE = 'P0002';
    END IF;
  END IF;

  -- =========================================================
  -- 1. Mapping de workouts: source_id -> new_id, preservando ordem
  -- =========================================================
  CREATE TEMP TABLE temp_workout_mapping (
    source_id uuid NOT NULL,
    new_id    uuid NOT NULL DEFAULT gen_random_uuid(),
    ord       int  NOT NULL
  ) ON COMMIT DROP;

  INSERT INTO temp_workout_mapping (source_id, ord)
  SELECT t.id, t.ord
  FROM unnest(p_source_workout_ids) WITH ORDINALITY AS t(id, ord);

  -- =========================================================
  -- 2. Inserir os novos workouts. RLS de SELECT em workouts
  --    filtra silenciosamente origens que o coach não acessa;
  --    detectamos pelo count vs. input length abaixo.
  -- =========================================================
  WITH inserted AS (
    INSERT INTO public.workouts (
      id, user_id, name, description, folder_id, created_by, updated_by
    )
    SELECT
      m.new_id,
      p_target_user_id,
      w.name,
      w.description,
      p_target_folder_id,
      v_actor_id,
      v_actor_id
    FROM temp_workout_mapping m
    JOIN public.workouts w ON w.id = m.source_id
    RETURNING id
  )
  SELECT count(*) INTO v_inserted_count FROM inserted;

  IF v_inserted_count <> v_input_count THEN
    RAISE EXCEPTION 'one or more source workouts not found or inaccessible'
      USING ERRCODE = 'P0002';
  END IF;

  -- =========================================================
  -- 3. Copiar workout_exercises (com superset_group_id ainda antigo;
  --    será remapeado depois).
  -- =========================================================
  CREATE TEMP TABLE temp_exercise_mapping (
    source_id         uuid NOT NULL,
    new_id            uuid NOT NULL DEFAULT gen_random_uuid(),
    source_workout_id uuid NOT NULL,
    new_workout_id    uuid NOT NULL
  ) ON COMMIT DROP;

  INSERT INTO temp_exercise_mapping (source_id, source_workout_id, new_workout_id)
  SELECT we.id, we.workout_id, m.new_id
  FROM public.workout_exercises we
  JOIN temp_workout_mapping m ON m.source_id = we.workout_id;

  INSERT INTO public.workout_exercises (
    id, workout_id, variation_id, note, rest_seconds, position,
    superset_group_id, superset_order
  )
  SELECT
    em.new_id,
    em.new_workout_id,
    we.variation_id,
    we.note,
    we.rest_seconds,
    we.position,
    we.superset_group_id, -- temporário, remapeado a seguir
    we.superset_order
  FROM temp_exercise_mapping em
  JOIN public.workout_exercises we ON we.id = em.source_id;

  -- =========================================================
  -- 3a. Remap de superset_group_id, isolado por source workout.
  --     Standalone (grupo de 1 membro) -> recebe o new_id do próprio
  --     exercise (convenção superset_group_id = id).
  --     Superset real (>= 2 membros) -> recebe um UUID novo.
  -- =========================================================
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
    JOIN sizes s
      ON s.source_workout_id = em.source_workout_id
     AND s.old_group_id     = we.superset_group_id
    WHERE s.member_count = 1
  ),
  group_map AS (
    SELECT g.source_workout_id,
           g.old_group_id,
           COALESCE(sn.new_group_id, gen_random_uuid()) AS new_group_id
    FROM groups g
    LEFT JOIN standalone_new sn
      ON sn.source_workout_id = g.source_workout_id
     AND sn.old_group_id     = g.old_group_id
  )
  UPDATE public.workout_exercises new_we
  SET superset_group_id = gm.new_group_id
  FROM temp_exercise_mapping em
  JOIN public.workout_exercises old_we ON old_we.id = em.source_id
  JOIN group_map gm
    ON gm.source_workout_id = em.source_workout_id
   AND gm.old_group_id     = old_we.superset_group_id
  WHERE new_we.id = em.new_id;

  -- =========================================================
  -- 4. Copiar workout_sets + remapear linked_set_id para drop/cluster.
  -- =========================================================
  CREATE TEMP TABLE temp_set_mapping (
    source_id   uuid NOT NULL,
    new_id      uuid NOT NULL,
    exercise_id uuid NOT NULL,
    set_order   int  NOT NULL,
    set_type    text NOT NULL
  ) ON COMMIT DROP;

  WITH inserted_sets AS (
    INSERT INTO public.workout_sets (
      id, workout_exercise_id, set_order, set_type,
      reps_min, reps_max, linked_set_id, load_percent_of_previous
    )
    SELECT
      gen_random_uuid(),
      em.new_id,
      ws.set_order,
      ws.set_type,
      ws.reps_min,
      ws.reps_max,
      NULL::uuid,
      ws.load_percent_of_previous
    FROM public.workout_sets ws
    JOIN temp_exercise_mapping em ON em.source_id = ws.workout_exercise_id
    RETURNING id, workout_exercise_id, set_order, set_type
  )
  -- Casamos com os originais por (new_exercise_id, set_order)
  INSERT INTO temp_set_mapping (source_id, new_id, exercise_id, set_order, set_type)
  SELECT old_ws.id, new_ws.id, new_ws.workout_exercise_id, new_ws.set_order, new_ws.set_type
  FROM inserted_sets new_ws
  JOIN temp_exercise_mapping em ON em.new_id = new_ws.workout_exercise_id
  JOIN public.workout_sets old_ws
    ON old_ws.workout_exercise_id = em.source_id
   AND old_ws.set_order            = new_ws.set_order;

  UPDATE public.workout_sets ws
  SET linked_set_id = prev_set.new_id
  FROM temp_set_mapping curr_set
  JOIN temp_set_mapping prev_set
    ON curr_set.exercise_id = prev_set.exercise_id
   AND curr_set.set_order   = prev_set.set_order + 1
  WHERE ws.id = curr_set.new_id
    AND curr_set.set_type IN ('drop', 'cluster');

  -- =========================================================
  -- 5. Copiar preparatory exercises + sets.
  -- =========================================================
  CREATE TEMP TABLE temp_prep_exercise_mapping (
    source_id         uuid NOT NULL,
    new_id            uuid NOT NULL DEFAULT gen_random_uuid(),
    source_workout_id uuid NOT NULL,
    new_workout_id    uuid NOT NULL
  ) ON COMMIT DROP;

  INSERT INTO temp_prep_exercise_mapping (source_id, source_workout_id, new_workout_id)
  SELECT wpe.id, wpe.workout_id, m.new_id
  FROM public.workout_preparatory_exercises wpe
  JOIN temp_workout_mapping m ON m.source_id = wpe.workout_id;

  INSERT INTO public.workout_preparatory_exercises (
    id, workout_id, variation_id, "position", duration_type, note
  )
  SELECT
    pem.new_id,
    pem.new_workout_id,
    wpe.variation_id,
    wpe.position,
    wpe.duration_type,
    wpe.note
  FROM temp_prep_exercise_mapping pem
  JOIN public.workout_preparatory_exercises wpe ON wpe.id = pem.source_id;

  INSERT INTO public.workout_preparatory_sets (
    id, workout_preparatory_exercise_id, set_order, duration_seconds, reps
  )
  SELECT
    gen_random_uuid(),
    pem.new_id,
    wps.set_order,
    wps.duration_seconds,
    wps.reps
  FROM public.workout_preparatory_sets wps
  JOIN temp_prep_exercise_mapping pem ON pem.source_id = wps.workout_preparatory_exercise_id;

  -- =========================================================
  -- 6. Auto-share via helper DEFINER. Veja
  --    wt_share_variations_for_copy acima — o helper valida
  --    is_active_coach_of antes de inserir, então a autorização
  --    permanece equivalente à da policy.
  -- =========================================================
  PERFORM public.wt_share_variations_for_copy(
    p_target_user_id,
    (SELECT array_agg(new_id) FROM temp_workout_mapping)
  );

  -- =========================================================
  -- 7. Retornar os novos ids na ordem da entrada.
  -- =========================================================
  SELECT array_agg(new_id ORDER BY ord) INTO v_result
  FROM temp_workout_mapping;

  RETURN v_result;
END;
$$;

ALTER FUNCTION "public"."wt_copy_workouts"("p_source_workout_ids" "uuid"[], "p_target_user_id" "uuid", "p_target_folder_id" "uuid") OWNER TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."wt_copy_workouts"("p_source_workout_ids" "uuid"[], "p_target_user_id" "uuid", "p_target_folder_id" "uuid") TO "authenticated";