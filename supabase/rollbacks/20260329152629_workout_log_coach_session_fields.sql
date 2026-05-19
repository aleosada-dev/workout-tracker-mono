-- Rollback: restore insert_workout_log and insert_workout_log_with_summary
-- to versions without coach_session_id/is_coached handling.
-- The original functions are defined in 20260325132852_add_workout_log_note.sql.
-- This rollback recreates them without the coach session fields.

-- Note: This only reverts the function definitions.
-- The coach_session_id and is_coached columns on workout_logs were added in
-- 20260327203510_coach_sessions.sql and are NOT dropped here.
