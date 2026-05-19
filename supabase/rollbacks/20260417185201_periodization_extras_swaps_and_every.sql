-- =============================================================================
-- Rollback: periodization extras, swaps, every
-- Reverse order of the migration.
-- =============================================================================

DROP FUNCTION IF EXISTS public.regenerate_future_occurrences(uuid, date);

-- Restore generate_periodization_occurrences to pre-migration body
-- (no extras/swaps composition).
CREATE OR REPLACE FUNCTION public.generate_periodization_occurrences(
  p_periodization_id uuid
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_periodization record;
  v_mc record;
  v_rep int;
  v_day record;
  v_offset int := 0;
  v_planned date;
BEGIN
  SELECT id, start_date, end_date, created_by
    INTO v_periodization
    FROM public.periodizations
    WHERE id = p_periodization_id
    FOR UPDATE;

  IF v_periodization IS NULL THEN
    RAISE EXCEPTION 'BUSINESS: Periodização não encontrada.';
  END IF;

  IF v_periodization.created_by <> (SELECT auth.uid()) THEN
    RAISE EXCEPTION 'BUSINESS: Sem permissão para modificar esta periodização.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.periodization_occurrences
    WHERE periodization_id = p_periodization_id
    LIMIT 1
  ) THEN
    RAISE EXCEPTION 'BUSINESS: Ocorrências já foram geradas para esta periodização.';
  END IF;

  FOR v_mc IN
    SELECT id, position, repeat_count
      FROM public.periodization_microcycles
      WHERE periodization_id = p_periodization_id
      ORDER BY position
  LOOP
    FOR v_rep IN 1..v_mc.repeat_count LOOP
      FOR v_day IN
        SELECT id, position, day_type, workout_id
          FROM public.periodization_microcycle_days
          WHERE microcycle_id = v_mc.id
          ORDER BY position
      LOOP
        v_planned := v_periodization.start_date + v_offset;
        EXIT WHEN v_planned > v_periodization.end_date;

        INSERT INTO public.periodization_occurrences (
          periodization_id,
          microcycle_id,
          repetition,
          position,
          planned_date,
          day_type,
          workout_id,
          status
        ) VALUES (
          p_periodization_id,
          v_mc.id,
          v_rep,
          v_day.position,
          v_planned,
          v_day.day_type,
          CASE WHEN v_day.day_type = 'workout' THEN v_day.workout_id ELSE NULL END,
          'pending'
        );

        v_offset := v_offset + 1;
      END LOOP;
    END LOOP;
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION public.generate_periodization_occurrences(uuid) TO authenticated;

-- Restore upsert_periodization to pre-migration body (no extras/swaps/every).
CREATE OR REPLACE FUNCTION public.upsert_periodization(payload jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id uuid := (SELECT auth.uid());
  v_p jsonb := payload->'periodization';
  v_periodization_id uuid;
  v_athlete_id uuid;
  v_status text;
  v_mic jsonb;
  v_mic_id uuid;
  v_day jsonb;
  v_day_pos integer;
  v_override jsonb;
  v_note jsonb;
BEGIN
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  v_periodization_id := (v_p->>'id')::uuid;
  v_athlete_id := (v_p->>'athlete_id')::uuid;
  v_status := COALESCE(v_p->>'status', 'draft');

  IF v_actor_id <> v_athlete_id AND NOT public.is_active_coach_of(v_actor_id, v_athlete_id) THEN
    RAISE EXCEPTION 'BUSINESS: Você não é coach ativo deste atleta.';
  END IF;

  IF v_status = 'active' THEN
    UPDATE public.periodizations
    SET status = 'completed', updated_at = now()
    WHERE athlete_id = v_athlete_id
      AND status = 'active'
      AND (v_periodization_id IS NULL OR id <> v_periodization_id);
  END IF;

  IF v_periodization_id IS NULL THEN
    v_periodization_id := gen_random_uuid();
  END IF;

  INSERT INTO public.periodizations (
    id, created_by, athlete_id, start_date, end_date,
    objective, status, notification_days_before
  ) VALUES (
    v_periodization_id,
    v_actor_id,
    v_athlete_id,
    (v_p->>'start_date')::date,
    (v_p->>'end_date')::date,
    NULLIF(TRIM(v_p->>'objective'), ''),
    v_status,
    NULLIF(v_p->>'notification_days_before', '')::integer
  )
  ON CONFLICT (id) DO UPDATE SET
    start_date = EXCLUDED.start_date,
    end_date = EXCLUDED.end_date,
    objective = EXCLUDED.objective,
    status = EXCLUDED.status,
    notification_days_before = EXCLUDED.notification_days_before,
    updated_at = now()
  WHERE public.periodizations.created_by = v_actor_id;

  DELETE FROM public.periodization_microcycles WHERE periodization_id = v_periodization_id;

  FOR v_mic IN SELECT * FROM jsonb_array_elements(payload->'microcycles')
  LOOP
    v_mic_id := COALESCE((v_mic->>'id')::uuid, gen_random_uuid());

    INSERT INTO public.periodization_microcycles (
      id, periodization_id, position, repeat_count
    ) VALUES (
      v_mic_id,
      v_periodization_id,
      (v_mic->>'position')::integer,
      COALESCE((v_mic->>'repeat_count')::integer, 1)
    );

    v_day_pos := 0;
    FOR v_day IN SELECT * FROM jsonb_array_elements(v_mic->'days')
    LOOP
      INSERT INTO public.periodization_microcycle_days (
        microcycle_id, position, day_type, workout_id, label
      ) VALUES (
        v_mic_id,
        v_day_pos,
        v_day->>'day_type',
        (v_day->>'workout_id')::uuid,
        v_day->>'label'
      );
      v_day_pos := v_day_pos + 1;
    END LOOP;
  END LOOP;

  DELETE FROM public.periodization_overrides WHERE periodization_id = v_periodization_id;
  FOR v_override IN SELECT * FROM jsonb_array_elements(COALESCE(payload->'overrides', '[]'::jsonb))
  LOOP
    INSERT INTO public.periodization_overrides (
      periodization_id, microcycle_id,
      microcycle_repetition_start, microcycle_repetition_end,
      workout_exercise_id, override_type, delta, set_index
    ) VALUES (
      v_periodization_id,
      (v_override->>'microcycle_id')::uuid,
      (v_override->>'microcycle_repetition_start')::integer,
      (v_override->>'microcycle_repetition_end')::integer,
      (v_override->>'workout_exercise_id')::uuid,
      v_override->>'override_type',
      (v_override->>'delta')::integer,
      NULLIF(v_override->>'set_index', '')::integer
    );
  END LOOP;

  DELETE FROM public.periodization_notes WHERE periodization_id = v_periodization_id;
  FOR v_note IN SELECT * FROM jsonb_array_elements(COALESCE(payload->'notes', '[]'::jsonb))
  LOOP
    INSERT INTO public.periodization_notes (
      periodization_id, microcycle_id, repetition, workout_id, note
    ) VALUES (
      v_periodization_id,
      (v_note->>'microcycle_id')::uuid,
      (v_note->>'repetition')::integer,
      (v_note->>'workout_id')::uuid,
      TRIM(v_note->>'note')
    );
  END LOOP;

  RETURN v_periodization_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.upsert_periodization(jsonb) TO authenticated;

DROP FUNCTION IF EXISTS public.periodization_propagation_matches(integer, integer, integer, integer);

DROP TABLE IF EXISTS public.periodization_day_swaps;
DROP TABLE IF EXISTS public.periodization_extra_days;

ALTER TABLE public.periodization_overrides
  DROP CONSTRAINT IF EXISTS overrides_repetition_every_positive;

ALTER TABLE public.periodization_overrides
  DROP COLUMN IF EXISTS microcycle_repetition_every;
