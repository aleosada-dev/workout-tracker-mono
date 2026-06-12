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
