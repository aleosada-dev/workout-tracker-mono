-- Rollback: remove reps_min/reps_max columns
ALTER TABLE public.workout_exercise_set_logs
  DROP COLUMN IF EXISTS reps_min,
  DROP COLUMN IF EXISTS reps_max;

-- Revert insert_workout_log to previous version (from 20260329152629)
-- (restore without reps_min/reps_max in temp_sets and INSERT)

-- Revert insert_workout_log_with_summary to previous version (from 20260329152629)
-- (restore without reps_min/reps_max in temp_sets and INSERT)

-- Revert get_variation_history to previous version (from 20260408135244)
-- (restore without reps_min/reps_max in sets JSONB)
