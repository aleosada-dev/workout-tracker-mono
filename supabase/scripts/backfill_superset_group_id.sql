-- =============================================================
-- Backfill: rewrite `superset_group_id` for already-copied supersets
-- whose group id collides with a member's id.
--
-- Context: before migration 20260415212416_fix_copy_workout_superset_group_id.sql,
-- the `copy_workout` RPC reused the first member's new id as the
-- shared `superset_group_id`. That collides with the standalone
-- convention (`superset_group_id = id` means "not in a superset"),
-- so the first leg of every copied superset was rendered as a
-- standalone card in the execution UI.
--
-- This script generates a fresh UUID for every affected group with
-- 2+ members and applies it to all members, breaking the collision.
-- Standalones (groups of size 1) are intentionally left untouched —
-- their collision is the expected invariant.
--
-- Safe to run multiple times: after a successful run, no group
-- will match `leader_collision AND member_count >= 2`, so reruns
-- are no-ops.
--
-- Run against each environment (staging, production) after the
-- migration is applied. Wrap in a transaction if the target has
-- active writers.
-- =============================================================

BEGIN;

WITH group_stats AS (
  SELECT
    superset_group_id AS old_group_id,
    COUNT(*) AS member_count,
    BOOL_OR(id = superset_group_id) AS leader_collision
  FROM public.workout_exercises
  GROUP BY superset_group_id
),
affected_groups AS (
  SELECT old_group_id, gen_random_uuid() AS new_group_id
  FROM group_stats
  WHERE member_count >= 2
    AND leader_collision
)
UPDATE public.workout_exercises we
SET superset_group_id = a.new_group_id
FROM affected_groups a
WHERE we.superset_group_id = a.old_group_id;

COMMIT;
