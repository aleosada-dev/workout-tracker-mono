-- Dedupe duplicated recurring coach_sessions rows.
--
-- Background: a bug in the recurring-session generator compared the freshly
-- computed UTC `scheduled_at` against a local-date range, missing existing
-- rows whose `scheduled_at` landed exactly on a UTC-day boundary (e.g., a
-- Brazil Thursday 21:00 slot → 2026-05-15T00:00:00Z, queried as
-- `< "2026-05-15"`). Every time the week view loaded, a new duplicate was
-- inserted with the same (recurring_schedule_id, scheduled_at) pair.
--
-- The code fix is in packages/app/src/coach-recurring-schedules.ts and
-- packages/infra-supabase/src/coach-sessions.ts.
--
-- This script is meant to be reviewed and applied manually. It is split in
-- three sections:
--   1) Diagnostic query — lists every (schedule, scheduled_at) tuple that
--      has more than one row, so you can sanity-check the scope before
--      deleting anything.
--   2) Per-tuple keeper preview — shows which row would be kept and which
--      would be deleted for each duplicated tuple.
--   3) Delete statement — wrapped in a transaction so you can ROLLBACK if
--      the count looks wrong.
--
-- Keeper rule: keep the most "advanced" row per (recurring_schedule_id,
-- scheduled_at), with this priority:
--   completed > scheduled > pending_approval > canceled
-- Ties broken by earliest `created_at` (the original row).

-- =============================================================
-- 1. Diagnostic — every duplicated (schedule, scheduled_at) pair
-- =============================================================
-- Run this first to see the blast radius. Safe to run anytime.

SELECT
  cs.recurring_schedule_id,
  cs.scheduled_at,
  COUNT(*) AS duplicate_count,
  COUNT(*) FILTER (WHERE cs.status = 'completed')         AS completed_count,
  COUNT(*) FILTER (WHERE cs.status = 'scheduled')         AS scheduled_count,
  COUNT(*) FILTER (WHERE cs.status = 'pending_approval')  AS pending_count,
  COUNT(*) FILTER (WHERE cs.status = 'canceled')          AS canceled_count,
  MIN(cs.created_at) AS first_created_at,
  MAX(cs.created_at) AS last_created_at
FROM public.coach_sessions cs
WHERE cs.recurring_schedule_id IS NOT NULL
GROUP BY cs.recurring_schedule_id, cs.scheduled_at
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC, cs.scheduled_at DESC;

-- =============================================================
-- 2. Keeper preview — which row stays, which would be deleted
-- =============================================================
-- Inspect a few groups before running the delete in section 3.

WITH ranked AS (
  SELECT
    cs.id,
    cs.recurring_schedule_id,
    cs.scheduled_at,
    cs.status,
    cs.created_at,
    cs.workout_log_id,
    ROW_NUMBER() OVER (
      PARTITION BY cs.recurring_schedule_id, cs.scheduled_at
      ORDER BY
        CASE cs.status
          WHEN 'completed'        THEN 0
          WHEN 'scheduled'        THEN 1
          WHEN 'pending_approval' THEN 2
          WHEN 'canceled'         THEN 3
          ELSE 4
        END,
        cs.created_at ASC
    ) AS rn
  FROM public.coach_sessions cs
  WHERE cs.recurring_schedule_id IS NOT NULL
)
SELECT
  recurring_schedule_id,
  scheduled_at,
  id,
  status,
  workout_log_id,
  created_at,
  CASE WHEN rn = 1 THEN 'KEEP' ELSE 'DELETE' END AS action
FROM ranked
WHERE (recurring_schedule_id, scheduled_at) IN (
  SELECT recurring_schedule_id, scheduled_at
  FROM public.coach_sessions
  WHERE recurring_schedule_id IS NOT NULL
  GROUP BY recurring_schedule_id, scheduled_at
  HAVING COUNT(*) > 1
)
ORDER BY recurring_schedule_id, scheduled_at, rn;

-- =============================================================
-- 3. Delete duplicates (transactional — review count before COMMIT)
-- =============================================================
-- Safety net: any row referenced by a workout_log is excluded from deletion.
-- If you want to force-delete those too, drop the `AND workout_log_id IS NULL`
-- clause — but be careful, you'd be orphaning a completed workout log.

BEGIN;

WITH ranked AS (
  SELECT
    cs.id,
    cs.workout_log_id,
    ROW_NUMBER() OVER (
      PARTITION BY cs.recurring_schedule_id, cs.scheduled_at
      ORDER BY
        CASE cs.status
          WHEN 'completed'        THEN 0
          WHEN 'scheduled'        THEN 1
          WHEN 'pending_approval' THEN 2
          WHEN 'canceled'         THEN 3
          ELSE 4
        END,
        cs.created_at ASC
    ) AS rn
  FROM public.coach_sessions cs
  WHERE cs.recurring_schedule_id IS NOT NULL
)
DELETE FROM public.coach_sessions cs
USING ranked r
WHERE cs.id = r.id
  AND r.rn > 1
  AND r.workout_log_id IS NULL;

-- Inspect the row count above. If it matches the expected number of
-- duplicates (sum of (duplicate_count - 1) from section 1, minus any rows
-- that were skipped because they had a workout_log_id), then COMMIT;
-- otherwise ROLLBACK.

-- COMMIT;
-- ROLLBACK;
