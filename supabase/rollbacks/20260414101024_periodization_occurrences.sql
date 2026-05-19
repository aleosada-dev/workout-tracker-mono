-- =============================================================================
-- Rollback: periodization_occurrences
-- Reverse order of the migration.
-- =============================================================================

DROP FUNCTION IF EXISTS public.postpone_periodization_occurrence(uuid, date);
DROP FUNCTION IF EXISTS public.swap_periodization_occurrences(uuid, uuid);

-- Restore original upsert_periodization (without set_index persistence).
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
    COALESCE((v_p->>'notification_days_before')::integer, 7)
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
      workout_exercise_id, override_type, delta
    ) VALUES (
      v_periodization_id,
      (v_override->>'microcycle_id')::uuid,
      (v_override->>'microcycle_repetition_start')::integer,
      (v_override->>'microcycle_repetition_end')::integer,
      (v_override->>'workout_exercise_id')::uuid,
      v_override->>'override_type',
      (v_override->>'delta')::integer
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

ALTER TABLE public.periodization_overrides
  DROP CONSTRAINT IF EXISTS overrides_set_index_valid;

ALTER TABLE public.periodization_overrides
  DROP COLUMN IF EXISTS set_index;

-- Restore NOT NULL + DEFAULT 7 on notification_days_before.
UPDATE public.periodizations
SET notification_days_before = 7
WHERE notification_days_before IS NULL;

ALTER TABLE public.periodizations
  ALTER COLUMN notification_days_before SET DEFAULT 7,
  ALTER COLUMN notification_days_before SET NOT NULL;

-- Restore original list_periodizations definition (from
-- 20260412182011_periodizations.sql) without occurrence aggregates.
CREATE OR REPLACE FUNCTION public.list_periodizations(p_created_by uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id uuid := (SELECT auth.uid());
BEGIN
  IF v_actor_id IS NULL OR v_actor_id <> p_created_by THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  RETURN COALESCE(
    (
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', p.id,
          'created_by', p.created_by,
          'athlete_id', p.athlete_id,
          'athlete_full_name', pr.full_name,
          'start_date', p.start_date,
          'end_date', p.end_date,
          'objective', p.objective,
          'status', p.status,
          'notification_days_before', p.notification_days_before,
          'microcycle_count', (
            SELECT COUNT(*) FROM public.periodization_microcycles mc
            WHERE mc.periodization_id = p.id
          ),
          'total_workouts', (
            SELECT COUNT(*) FROM public.periodization_microcycle_days d
            JOIN public.periodization_microcycles mc ON mc.id = d.microcycle_id
            WHERE mc.periodization_id = p.id AND d.day_type = 'workout'
          )
        )
        ORDER BY
          CASE p.status
            WHEN 'active' THEN 0
            WHEN 'draft' THEN 1
            WHEN 'completed' THEN 2
          END,
          p.start_date DESC
      )
      FROM public.periodizations p
      JOIN public.profiles pr ON pr.id = p.athlete_id
      WHERE p.created_by = p_created_by
    ),
    '[]'::jsonb
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.list_periodizations(uuid) TO authenticated;

DROP FUNCTION IF EXISTS public.shrink_periodization(uuid, date);
DROP FUNCTION IF EXISTS public.extend_periodization(uuid, date);
DROP FUNCTION IF EXISTS public.reschedule_periodization(uuid, date);
DROP FUNCTION IF EXISTS public.generate_periodization_occurrences(uuid);
DROP TABLE IF EXISTS public.periodization_occurrences;
