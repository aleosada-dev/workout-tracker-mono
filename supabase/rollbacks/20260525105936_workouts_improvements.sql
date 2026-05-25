-- Rollback for 20260525105936_workouts_improvements.sql

DROP INDEX IF EXISTS public.workouts_arquived_by_idx;
DROP INDEX IF EXISTS public.workouts_active_folder_idx;

ALTER TABLE "public"."workouts"
  DROP CONSTRAINT IF EXISTS "workouts_arquived_by_fkey";

ALTER TABLE "public"."workouts"
  DROP COLUMN IF EXISTS "arquived_by";
