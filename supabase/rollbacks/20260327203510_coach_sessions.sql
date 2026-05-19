-- Rollback: coach_sessions migration
-- Run in reverse order of creation

-- 8. Remove coach session fields from workout_logs
DROP INDEX IF EXISTS idx_workout_logs_coach_session_id;
ALTER TABLE public.workout_logs
  DROP COLUMN IF EXISTS is_coached,
  DROP COLUMN IF EXISTS coach_session_id;

-- 7c. Remove payment fields from coach_sessions
ALTER TABLE public.coach_sessions
  DROP COLUMN IF EXISTS payment_method,
  DROP COLUMN IF EXISTS payment_amount,
  DROP COLUMN IF EXISTS paid_at,
  DROP COLUMN IF EXISTS is_paid;

-- 7b. Restore original view without terms columns
CREATE OR REPLACE VIEW public.coach_athletes_with_profiles
WITH (security_invoker = true) AS
SELECT
  ca.id AS relationship_id,
  ca.coach_id,
  ca.athlete_id,
  ca.status,
  ca.invited_at,
  ca.responded_at,
  ca.ended_at,
  p.full_name AS athlete_full_name,
  p.avatar_url AS athlete_avatar_url
FROM public.coach_athletes ca
LEFT JOIN public.profiles p ON p.id = ca.athlete_id;

-- 7. Remove terms from coach_athletes
ALTER TABLE public.coach_athletes
  DROP COLUMN IF EXISTS manual_approval_deadline_hours,
  DROP COLUMN IF EXISTS cancellation_policy_hours,
  DROP COLUMN IF EXISTS default_session_duration;

-- 6. Drop coach_session_disputes
DROP POLICY IF EXISTS "session_participants_manage_disputes" ON public.coach_session_disputes;
DROP TABLE IF EXISTS public.coach_session_disputes;

-- 5. Drop coach_recurring_schedules
DROP TRIGGER IF EXISTS coach_recurring_schedules_set_timestamps ON public.coach_recurring_schedules;
DROP POLICY IF EXISTS "athlete_view_own_recurring_schedules" ON public.coach_recurring_schedules;
DROP POLICY IF EXISTS "coach_manage_recurring_schedules" ON public.coach_recurring_schedules;
DROP TABLE IF EXISTS public.coach_recurring_schedules;

-- 4. Drop coach_sessions
DROP TRIGGER IF EXISTS coach_sessions_set_timestamps ON public.coach_sessions;
DROP POLICY IF EXISTS "athlete_manage_own_sessions" ON public.coach_sessions;
DROP POLICY IF EXISTS "coach_manage_own_sessions" ON public.coach_sessions;
DROP TABLE IF EXISTS public.coach_sessions;

-- 3. Drop coach_availability_overrides
DROP POLICY IF EXISTS "athlete_view_coach_overrides" ON public.coach_availability_overrides;
DROP POLICY IF EXISTS "coach_manage_own_overrides" ON public.coach_availability_overrides;
DROP TABLE IF EXISTS public.coach_availability_overrides;

-- 2. Drop coach_availability
DROP TRIGGER IF EXISTS coach_availability_set_timestamps ON public.coach_availability;
DROP POLICY IF EXISTS "athlete_view_coach_availability" ON public.coach_availability;
DROP POLICY IF EXISTS "coach_manage_own_availability" ON public.coach_availability;
DROP TABLE IF EXISTS public.coach_availability;

-- Note: set_timestamps function is shared — do not drop

DROP FUNCTION IF EXISTS public.get_coach_occupied_slots(uuid, date, date);

