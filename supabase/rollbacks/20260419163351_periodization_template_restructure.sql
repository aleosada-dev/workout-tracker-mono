-- =============================================================================
-- Rollback: RPCs for new periodization model
-- =============================================================================

DROP FUNCTION IF EXISTS public.upsert_periodization(jsonb);
DROP FUNCTION IF EXISTS public.replace_future_occurrences(uuid, date, jsonb);

-- Recreating old RPCs is not worth it for rollback (they'll come back via fresh
-- db reset). If you truly need the old shape, check git history for
-- 20260418105510_periodization_adjustments_unified.sql and earlier files.

-- =============================================================================
-- Rollback: Periodization Occurrences Per-Activity
-- =============================================================================

DROP INDEX IF EXISTS public.periodization_occurrences_date_idx;

ALTER TABLE public.periodization_occurrences DROP CONSTRAINT IF EXISTS periodization_occurrences_unique_slot;
ALTER TABLE public.periodization_occurrences DROP CONSTRAINT IF EXISTS periodization_occurrences_kind_workout_check;
ALTER TABLE public.periodization_occurrences DROP CONSTRAINT IF EXISTS periodization_occurrences_rest_training_check;
ALTER TABLE public.periodization_occurrences DROP CONSTRAINT IF EXISTS periodization_occurrences_kind_check;
ALTER TABLE public.periodization_occurrences DROP CONSTRAINT IF EXISTS periodization_occurrences_origin_check;
ALTER TABLE public.periodization_occurrences DROP CONSTRAINT IF EXISTS periodization_occurrences_day_type_check;

ALTER TABLE public.periodization_occurrences
  DROP COLUMN IF EXISTS kind,
  DROP COLUMN IF EXISTS source_adjustment_id,
  DROP COLUMN IF EXISTS origin,
  DROP COLUMN IF EXISTS position_in_day,
  DROP COLUMN IF EXISTS template_activity_id,
  DROP COLUMN IF EXISTS template_day_id,
  DROP COLUMN IF EXISTS cycle;

ALTER TABLE public.periodization_occurrences
  ADD COLUMN microcycle_id uuid NULL,
  ADD COLUMN repetition int NOT NULL DEFAULT 1,
  ADD COLUMN position int NOT NULL DEFAULT 0;

-- Restore old day_type check (was 'workout'|'rest')
ALTER TABLE public.periodization_occurrences
  ADD CONSTRAINT periodization_occurrences_day_type_check
  CHECK (day_type IN ('workout', 'rest'));

ALTER TABLE public.periodization_occurrences
  ADD CONSTRAINT periodization_occurrences_unique_slot
  UNIQUE (periodization_id, microcycle_id, repetition, position);

-- =============================================================================
-- Rollback: Periodization Adjustments Realign
-- =============================================================================

ALTER TABLE public.periodization_adjustments DROP CONSTRAINT IF EXISTS periodization_adjustments_type_check;
ALTER TABLE public.periodization_adjustments
  ADD CONSTRAINT periodization_adjustments_type_check
  CHECK (type IN ('override','bulk_override','extra','swap','swap_workout','removed','note','reschedule'));

ALTER TABLE public.periodization_adjustments RENAME COLUMN cycle_every TO microcycle_repetition_every;
ALTER TABLE public.periodization_adjustments RENAME COLUMN cycle_end   TO microcycle_repetition_end;
ALTER TABLE public.periodization_adjustments RENAME COLUMN cycle_start TO microcycle_repetition_start;

ALTER TABLE public.periodization_adjustments
  ADD COLUMN microcycle_id uuid NULL REFERENCES public.periodization_microcycles(id) ON DELETE CASCADE;

-- =============================================================================
-- Rollback: Periodization Template Restructure
-- Drops new template tables + policies + indexes; recreates old microcycle tables
-- No data restoration needed (no production data)
-- =============================================================================

-- Drop new policies (template_activities — 4 policies)
DROP POLICY IF EXISTS "template_activities_select_owner_or_athlete" ON public.periodization_template_activities;
DROP POLICY IF EXISTS "template_activities_insert_owner" ON public.periodization_template_activities;
DROP POLICY IF EXISTS "template_activities_update_owner" ON public.periodization_template_activities;
DROP POLICY IF EXISTS "template_activities_delete_owner" ON public.periodization_template_activities;

-- Drop new policies (template_days — 4 policies)
DROP POLICY IF EXISTS "template_days_select_owner_or_athlete" ON public.periodization_template_days;
DROP POLICY IF EXISTS "template_days_insert_owner" ON public.periodization_template_days;
DROP POLICY IF EXISTS "template_days_update_owner" ON public.periodization_template_days;
DROP POLICY IF EXISTS "template_days_delete_owner" ON public.periodization_template_days;

-- Drop new indexes (dropped implicitly with tables, but listed for clarity)
DROP INDEX IF EXISTS public.periodization_template_activities_day_idx;
DROP INDEX IF EXISTS public.periodization_template_days_periodization_idx;

-- Drop new tables (cascade removes dependent objects)
DROP TABLE IF EXISTS public.periodization_template_activities CASCADE;
DROP TABLE IF EXISTS public.periodization_template_days CASCADE;

-- =============================================================================
-- Recreate old microcycle tables (original shape, no data)
-- =============================================================================

CREATE TABLE public.periodization_microcycles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  periodization_id uuid NOT NULL REFERENCES public.periodizations (id) ON DELETE CASCADE,
  position integer NOT NULL DEFAULT 0,
  repeat_count integer NOT NULL DEFAULT 1,
  CONSTRAINT microcycles_repeat_positive CHECK (repeat_count >= 1),
  CONSTRAINT microcycles_position_unique UNIQUE (periodization_id, position)
);

CREATE INDEX periodization_microcycles_periodization_id_idx
  ON public.periodization_microcycles (periodization_id);

ALTER TABLE public.periodization_microcycles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "microcycles_via_periodization" ON public.periodization_microcycles
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.periodizations p
      WHERE p.id = periodization_id
        AND (p.created_by = (SELECT auth.uid()) OR p.athlete_id = (SELECT auth.uid()))
    )
  );

CREATE TABLE public.periodization_microcycle_days (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  microcycle_id uuid NOT NULL REFERENCES public.periodization_microcycles (id) ON DELETE CASCADE,
  position integer NOT NULL,
  day_type text NOT NULL,
  workout_id uuid REFERENCES public.workouts (id) ON DELETE SET NULL,
  label text,
  CONSTRAINT days_position_unique UNIQUE (microcycle_id, position),
  CONSTRAINT days_day_type_valid CHECK (day_type IN ('workout', 'rest')),
  CONSTRAINT days_workout_required CHECK (
    (day_type = 'workout' AND workout_id IS NOT NULL)
    OR (day_type = 'rest' AND workout_id IS NULL)
  )
);

CREATE INDEX microcycle_days_microcycle_id_idx
  ON public.periodization_microcycle_days (microcycle_id);

ALTER TABLE public.periodization_microcycle_days ENABLE ROW LEVEL SECURITY;

CREATE POLICY "days_via_microcycle" ON public.periodization_microcycle_days
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.periodization_microcycles mc
      JOIN public.periodizations p ON p.id = mc.periodization_id
      WHERE mc.id = microcycle_id
        AND (p.created_by = (SELECT auth.uid()) OR p.athlete_id = (SELECT auth.uid()))
    )
  );
