-- Keep the existing archived_at contract for now and add who archived it.
-- `archived_at IS NULL` means active.
ALTER TABLE "public"."workouts"
  ADD COLUMN IF NOT EXISTS "arquived_by" "uuid";

ALTER TABLE ONLY "public"."workouts"
  ADD CONSTRAINT "workouts_arquived_by_fkey"
  FOREIGN KEY ("arquived_by") REFERENCES "auth"."users"("id");

CREATE INDEX IF NOT EXISTS "workouts_active_folder_idx"
  ON "public"."workouts" USING "btree" ("user_id", "folder_id")
  WHERE ("archived_at" IS NULL);

CREATE INDEX IF NOT EXISTS "workouts_arquived_by_idx"
  ON "public"."workouts" USING "btree" ("arquived_by")
  WHERE ("arquived_by" IS NOT NULL);

-- ================================================
-- wt_delete_workout_folder: remove uma pasta do usuário aplicando uma das três
-- estratégias para os treinos contidos. Todas as etapas rodam na mesma
-- transação; ownership é verificada via auth.uid().
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
  "p_target_folder_id" "uuid" DEFAULT NULL
) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_user_id uuid := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'wt_delete_workout_folder called without an authenticated user'
      USING ERRCODE = '28000';
  END IF;

  IF p_mode NOT IN ('delete-folder-only', 'delete-with-workouts', 'move-workouts') THEN
    RAISE EXCEPTION 'invalid mode: %', p_mode USING ERRCODE = '22023';
  END IF;

  PERFORM 1 FROM public.workout_folders
   WHERE id = p_folder_id AND user_id = v_user_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'workout folder not found' USING ERRCODE = 'P0002';
  END IF;

  IF p_mode = 'delete-with-workouts' THEN
    UPDATE public.workouts
       SET archived_at = now(),
           arquived_by = v_user_id,
           folder_id   = NULL
     WHERE folder_id = p_folder_id
       AND user_id = v_user_id
       AND archived_at IS NULL;
  ELSIF p_mode = 'move-workouts' THEN
    IF p_target_folder_id IS NOT NULL THEN
      IF p_target_folder_id = p_folder_id THEN
        RAISE EXCEPTION 'target folder must differ from source folder'
          USING ERRCODE = '22023';
      END IF;
      PERFORM 1 FROM public.workout_folders
       WHERE id = p_target_folder_id AND user_id = v_user_id;
      IF NOT FOUND THEN
        RAISE EXCEPTION 'target workout folder not found' USING ERRCODE = 'P0002';
      END IF;
    END IF;

    UPDATE public.workouts
       SET folder_id = p_target_folder_id
     WHERE folder_id = p_folder_id
       AND user_id = v_user_id
       AND archived_at IS NULL;
  END IF;

  DELETE FROM public.workout_folders
   WHERE id = p_folder_id AND user_id = v_user_id;
END;
$$;


ALTER FUNCTION "public"."wt_delete_workout_folder"("p_folder_id" "uuid", "p_mode" "text", "p_target_folder_id" "uuid") OWNER TO "postgres";

GRANT ALL ON FUNCTION "public"."wt_delete_workout_folder"("p_folder_id" "uuid", "p_mode" "text", "p_target_folder_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."wt_delete_workout_folder"("p_folder_id" "uuid", "p_mode" "text", "p_target_folder_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."wt_delete_workout_folder"("p_folder_id" "uuid", "p_mode" "text", "p_target_folder_id" "uuid") TO "service_role";
