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
