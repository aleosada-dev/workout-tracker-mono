-- Rollback: re-create the old 3-parameter overload of get_coach_occupied_slots
CREATE FUNCTION public.get_coach_occupied_slots(
  p_coach_id uuid,
  p_start_date date,
  p_end_date date
)
RETURNS TABLE (scheduled_at timestamptz, duration_minutes smallint)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT cs.scheduled_at, cs.duration_minutes
  FROM public.coach_sessions cs
  WHERE cs.coach_id = p_coach_id
    AND cs.status IN ('scheduled', 'pending_approval')
    AND cs.scheduled_at >= p_start_date::timestamptz
    AND cs.scheduled_at < p_end_date::timestamptz
    AND EXISTS (
      SELECT 1 FROM public.coach_athletes ca
      WHERE ca.coach_id = p_coach_id
        AND ca.athlete_id = (SELECT auth.uid())
        AND ca.status = 'active'
    )
    UNION
      SELECT (d + crs.start_time)::timestamptz, crs.duration_minutes
      FROM public.coach_recurring_schedules crs
      JOIN public.profiles p ON crs.athlete_id = p.id
      CROSS JOIN generate_series(p_start_date::timestamptz, p_end_date::timestamptz - interval '1 day', interval '1 day') d
      WHERE crs.coach_id = p_coach_id
        AND crs.is_active = true
        AND crs.athlete_id IS DISTINCT FROM (SELECT auth.uid())
        AND EXTRACT(DOW FROM d)::int = ANY(crs.days_of_week)
        AND d::date >= crs.effective_from
        AND (crs.effective_until IS NULL OR d::date <= crs.effective_until)
        AND (crs.interval_weeks <= 1 OR ((d::date - crs.effective_from) / 7) % crs.interval_weeks = 0)
        AND (crs.end_type != 'on_date' OR crs.end_date IS NULL OR d::date <= crs.end_date)
        AND NOT EXISTS (
          SELECT 1 FROM public.coach_recurring_schedule_exceptions e
          WHERE e.schedule_id = crs.id AND e.exception_date = d::date
        )
        AND NOT EXISTS (
          SELECT 1 FROM public.coach_sessions cs2
          WHERE cs2.recurring_schedule_id = crs.id
            AND cs2.scheduled_at::date = d::date
    )
$$;
