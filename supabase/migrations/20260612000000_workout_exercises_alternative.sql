-- alternative_of_id: o alternativo é outra linha de workout_exercises que aponta
-- para o exercício principal. FK DEFERRABLE para permitir inserir principal e
-- alternativo no mesmo INSERT (wt_upsert_workout) sem depender da ordem das linhas.
ALTER TABLE "public"."workout_exercises"
  ADD COLUMN "alternative_of_id" "uuid";

ALTER TABLE "public"."workout_exercises"
  ADD CONSTRAINT "workout_exercises_alternative_of_id_fkey"
  FOREIGN KEY ("alternative_of_id")
  REFERENCES "public"."workout_exercises"("id")
  ON DELETE CASCADE
  DEFERRABLE INITIALLY DEFERRED;

-- No máximo 1 alternativo por principal.
CREATE UNIQUE INDEX "ux_workout_exercises_one_alternative"
  ON "public"."workout_exercises" ("alternative_of_id")
  WHERE "alternative_of_id" IS NOT NULL;

-- O alternativo herda a position do principal e usa superset_order = 0, o que
-- colidiria com um principal standalone no índice posicional. Recria o índice
-- (renomeado para *_type_* em 20260531120000, agora com exercise_type) como
-- parcial: a unicidade posicional só vale para exercícios "reais"
-- (alternative_of_id IS NULL).
DROP INDEX IF EXISTS "public"."workout_exercises_workout_type_position_superset_uidx";
CREATE UNIQUE INDEX "workout_exercises_workout_type_position_superset_uidx"
  ON "public"."workout_exercises" ("workout_id", "exercise_type", "position", "superset_order")
  WHERE "alternative_of_id" IS NULL;

  CREATE OR REPLACE FUNCTION "public"."wt_upsert_workout"("payload" "jsonb") RETURNS "uuid"
      LANGUAGE "plpgsql" SECURITY INVOKER
      SET "search_path" TO 'public'
      AS $$
  DECLARE
    v_actor_id UUID := (SELECT auth.uid());
    v_user_id UUID;
    v_workout_id UUID;
  BEGIN
    IF v_actor_id IS NULL THEN
      RAISE EXCEPTION 'wt_upsert_workout called without an authenticated user'
        USING ERRCODE = '28000';
    END IF;
  
    v_user_id := (payload->>'userId')::UUID;
    v_workout_id := (payload->>'workoutId')::UUID;
  
    IF v_user_id IS NULL THEN
      RAISE EXCEPTION 'userId required' USING ERRCODE = '22023';
    END IF;
    IF v_workout_id IS NULL THEN
      RAISE EXCEPTION 'workoutId required' USING ERRCODE = '22023';
    END IF;
    IF v_user_id <> v_actor_id
      AND NOT public.is_active_coach_of(v_actor_id, v_user_id) THEN
      RAISE EXCEPTION 'actor is neither the target user nor an active coach of them'
        USING ERRCODE = '42501';
    END IF;
    IF jsonb_typeof(payload->'exercises') IS DISTINCT FROM 'array' THEN
      RAISE EXCEPTION 'exercises must be array' USING ERRCODE = '22023';
    END IF;
  
    -- MUDANÇA 1: alternativo não pode ter alternativo aninhado.
    IF EXISTS (
      SELECT 1 FROM jsonb_array_elements(payload->'exercises') ex
      WHERE jsonb_typeof(ex->'alternative') = 'object'
        AND jsonb_typeof(ex->'alternative'->'alternative') = 'object'
    ) THEN
      RAISE EXCEPTION 'alternative cannot have a nested alternative' USING ERRCODE = '22023';
    END IF;
  
    INSERT INTO public.workouts (
      id, user_id, name, description, folder_id, created_by, updated_by
    )
    VALUES (
      v_workout_id, v_user_id, TRIM(payload->>'name'),
      NULLIF(TRIM(payload->>'description'), ''),
      NULLIF(payload->>'folderId', '')::UUID, v_actor_id, v_actor_id
    )
    ON CONFLICT (id) DO UPDATE SET
      name = excluded.name,
      description = excluded.description,
      folder_id = excluded.folder_id,
      updated_by = excluded.updated_by
    WHERE public.workouts.user_id = v_user_id;
  
    IF NOT FOUND THEN
      RAISE EXCEPTION 'workout not found or access denied' USING ERRCODE = 'P0002';
    END IF;
  
    -- MUDANÇA 2: temp_exercises inclui as linhas dos alternativos via UNION ALL.
    -- O raw_ex de um alternativo é o próprio objeto 'alternative' (que tem 'sets').
    DROP TABLE IF EXISTS temp_exercises;
    CREATE TEMP TABLE temp_exercises AS
    SELECT
      (ex->>'id')::UUID AS id,
      (ex->>'variationId')::UUID AS variation_id,
      COALESCE(NULLIF(ex->>'exerciseType', ''), 'strength') AS exercise_type,
      (ex->>'position')::INTEGER AS position,
      (ex->>'supersetGroupId')::UUID AS superset_group_id,
      (ex->>'supersetOrder')::INTEGER AS superset_order,
      NULLIF(TRIM(ex->>'note'), '') AS note,
      NULLIF(ex->>'restSeconds', '')::INTEGER AS rest_seconds,
      NULL::UUID AS alternative_of_id,
      ex AS raw_ex
    FROM jsonb_array_elements(payload->'exercises') ex
    UNION ALL
    SELECT
      (ex->'alternative'->>'id')::UUID,
      (ex->'alternative'->>'variationId')::UUID,
      COALESCE(NULLIF(ex->>'exerciseType', ''), 'strength'),
      (ex->>'position')::INTEGER,
      (ex->'alternative'->>'id')::UUID,   -- superset_group_id = próprio id (standalone-like)
      0,
      NULLIF(TRIM(ex->'alternative'->>'note'), ''),
      NULLIF(ex->'alternative'->>'restSeconds', '')::INTEGER,
      (ex->>'id')::UUID,                  -- alternative_of_id = id do principal
      ex->'alternative'
    FROM jsonb_array_elements(payload->'exercises') ex
    WHERE jsonb_typeof(ex->'alternative') = 'object';
  
    IF EXISTS (SELECT 1 FROM temp_exercises WHERE id IS NULL) THEN
      RAISE EXCEPTION 'exercise id required' USING ERRCODE = '22023';
    END IF;
    IF EXISTS (SELECT 1 FROM temp_exercises WHERE variation_id IS NULL) THEN
      RAISE EXCEPTION 'exercise variationId required' USING ERRCODE = '22023';
    END IF;
  
    DROP TABLE IF EXISTS temp_sets;
    CREATE TEMP TABLE temp_sets AS
    SELECT
      te.id AS exercise_id,
      (s->>'id')::UUID AS id,
      (s->>'setOrder')::INTEGER AS set_order,
      s->>'setType' AS set_type,
      NULLIF(s->>'repsMin', '')::INTEGER AS reps_min,
      NULLIF(s->>'repsMax', '')::INTEGER AS reps_max,
      NULLIF(s->>'durationSeconds', '')::INTEGER AS duration_seconds,
      NULLIF(s->>'distanceMeters', '')::INTEGER AS distance_meters,
      NULLIF(s->>'linkedSetId', '')::UUID AS linked_set_id,
      NULLIF(s->>'loadPercentOfPrevious', '')::INTEGER AS load_percent_of_previous,
      NULLIF(s->>'roundOrder', '')::INTEGER AS round_order_in
    FROM temp_exercises te
    CROSS JOIN LATERAL jsonb_array_elements(te.raw_ex->'sets') s;
  
    IF EXISTS (SELECT 1 FROM temp_sets WHERE id IS NULL) THEN
      RAISE EXCEPTION 'set id required' USING ERRCODE = '22023';
    END IF;
    IF EXISTS (
      SELECT 1 FROM temp_sets WHERE set_type IN ('drop', 'cluster') AND linked_set_id IS NULL
    ) THEN
      RAISE EXCEPTION 'linked_set_id required for drop/cluster' USING ERRCODE = '22023';
    END IF;
    IF EXISTS (
      SELECT 1 FROM temp_sets ts
      WHERE ts.set_type IN ('drop', 'cluster')
        AND NOT EXISTS (
          SELECT 1 FROM temp_sets prev
          WHERE prev.exercise_id = ts.exercise_id
            AND prev.set_order = ts.set_order - 1
            AND prev.id = ts.linked_set_id
        )
    ) THEN
      RAISE EXCEPTION 'linked_set_id must reference previous set' USING ERRCODE = '22023';
    END IF;
  
    DELETE FROM public.workout_exercises WHERE workout_id = v_workout_id;
  
    -- MUDANÇA 3: inclui alternative_of_id. ORDER BY NULLS FIRST insere principais
    -- antes (a FK é DEFERRABLE, então a ordem não é estritamente necessária, mas
    -- mantém o INSERT determinístico).
    INSERT INTO public.workout_exercises (
      id, workout_id, variation_id, exercise_type, position,
      superset_group_id, superset_order, note, rest_seconds, alternative_of_id
    )
    SELECT
      te.id, v_workout_id, te.variation_id, te.exercise_type, te.position,
      te.superset_group_id, te.superset_order, te.note, te.rest_seconds, te.alternative_of_id
    FROM temp_exercises te
    ORDER BY te.alternative_of_id NULLS FIRST;
  
    INSERT INTO public.workout_sets (
      id, workout_exercise_id, set_order, set_type,
      reps_min, reps_max, duration_seconds, distance_meters,
      linked_set_id, load_percent_of_previous, round_order
    )
    SELECT
      ts.id, ts.exercise_id, ts.set_order, ts.set_type,
      ts.reps_min, ts.reps_max, ts.duration_seconds, ts.distance_meters,
      ts.linked_set_id, ts.load_percent_of_previous,
      COALESCE(
        ts.round_order_in,
        GREATEST(
          (COUNT(*) FILTER (WHERE ts.set_type IN ('normal', 'warmup'))
            OVER (PARTITION BY ts.exercise_id ORDER BY ts.set_order)) - 1,
          0
        )
      )
    FROM temp_sets ts;
  
    IF v_user_id <> v_actor_id THEN
      PERFORM public.wt_share_variations_for_copy(v_user_id, ARRAY[v_workout_id]);
    END IF;
  
    RETURN v_workout_id;
  END;
  $$;
  
  ALTER FUNCTION "public"."wt_upsert_workout"("payload" "jsonb") OWNER TO "postgres";
  GRANT ALL ON FUNCTION "public"."wt_upsert_workout"("payload" "jsonb") TO "anon";
  GRANT ALL ON FUNCTION "public"."wt_upsert_workout"("payload" "jsonb") TO "authenticated";
  GRANT ALL ON FUNCTION "public"."wt_upsert_workout"("payload" "jsonb") TO "service_role";
  
  -- wt_copy_workouts: ao copiar workout_exercises, agora também copia e remapeia
  -- alternative_of_id. Antes, a coluna não entrava no INSERT, então a linha do
  -- alternativo era copiada com alternative_of_id NULL — virava um exercício
  -- standalone órfão no destino (aparecia solto na lista e perdia o vínculo com o
  -- principal). O remap usa temp_exercise_mapping (old principal id -> new id);
  -- a FK é DEFERRABLE, então as duas linhas podem ser inseridas no mesmo INSERT.
  -- Nenhuma outra etapa muda: o remap de superset (3a) já trata a linha do
  -- alternativo como standalone (superset_group_id = próprio id), e a cópia de
  -- sets (4) já cobre os sets do alternativo.
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
    --    será remapeado depois). alternative_of_id é remapeado aqui via
    --    temp_exercise_mapping: NULL para principais, new_id do principal
    --    para as linhas de alternativo.
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
      superset_group_id, superset_order, alternative_of_id
    )
    SELECT
      em.new_id,
      em.new_workout_id,
      we.variation_id,
      we.note,
      we.rest_seconds,
      we.position,
      we.superset_group_id, -- temporário, remapeado a seguir
      we.superset_order,
      alt_em.new_id -- new id do principal apontado; NULL para principais
    FROM temp_exercise_mapping em
    JOIN public.workout_exercises we ON we.id = em.source_id
    LEFT JOIN temp_exercise_mapping alt_em ON alt_em.source_id = we.alternative_of_id;
  
    -- =========================================================
    -- 3a. Remap de superset_group_id, isolado por source workout.
    --     Standalone (grupo de 1 membro) -> recebe o new_id do próprio
    --     exercise (convenção superset_group_id = id). A linha de
    --     alternativo tem superset_group_id = próprio id (1 membro), então
    --     também cai aqui e recebe o seu novo id — standalone-like.
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
