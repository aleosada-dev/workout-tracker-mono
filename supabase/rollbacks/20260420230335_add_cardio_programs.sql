-- Restore previous replace_future_occurrences definition (without cardio_program_id)
CREATE OR REPLACE FUNCTION public.replace_future_occurrences(
  p_periodization_id uuid,
  p_from_date date,
  p_rows jsonb
) RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_row jsonb;
BEGIN
  DELETE FROM public.periodization_occurrences
  WHERE periodization_id = p_periodization_id
    AND planned_date >= p_from_date
    AND status = 'pending';

  FOR v_row IN SELECT * FROM jsonb_array_elements(p_rows)
  LOOP
    IF EXISTS (
      SELECT 1 FROM public.periodization_occurrences
      WHERE periodization_id = p_periodization_id
        AND planned_date = (v_row->>'planned_date')::date
        AND position_in_day = (v_row->>'position_in_day')::int
    ) THEN
      CONTINUE;
    END IF;

    INSERT INTO public.periodization_occurrences (
      periodization_id, planned_date, cycle,
      template_day_id, template_activity_id, position_in_day,
      origin, source_adjustment_id,
      day_type, kind, workout_id,
      status
    ) VALUES (
      p_periodization_id,
      (v_row->>'planned_date')::date,
      (v_row->>'cycle')::int,
      NULLIF(v_row->>'template_day_id', '')::uuid,
      NULLIF(v_row->>'template_activity_id', '')::uuid,
      (v_row->>'position_in_day')::int,
      (v_row->>'origin'),
      NULLIF(v_row->>'source_adjustment_id', '')::uuid,
      (v_row->>'day_type'),
      NULLIF(v_row->>'kind', ''),
      NULLIF(v_row->>'workout_id', '')::uuid,
      'pending'
    );
  END LOOP;
END;
$$;

-- Rollback for add_cardio_programs

ALTER TABLE public.profiles
  DROP COLUMN IF EXISTS sex,
  DROP COLUMN IF EXISTS birth_date;

DROP INDEX IF EXISTS public.periodization_occurrences_cardio_program_idx;
DROP INDEX IF EXISTS public.periodization_template_activities_cardio_program_idx;

ALTER TABLE public.periodization_occurrences
  DROP COLUMN IF EXISTS cardio_program_id;

ALTER TABLE public.periodization_template_activities
  DROP COLUMN IF EXISTS cardio_program_id;

DROP TRIGGER IF EXISTS cardio_programs_set_updated_at ON public.cardio_programs;

DROP TABLE IF EXISTS public.cardio_programs;
