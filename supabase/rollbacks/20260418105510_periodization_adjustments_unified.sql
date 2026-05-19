-- Rollback: 20260418105510_periodization_adjustments_unified
-- Drops the unified periodization_adjustments table and the 3 rewritten RPCs,
-- then recreates the 4 prior split tables
-- (periodization_overrides, periodization_notes,
-- periodization_extra_days, periodization_day_swaps) and restores the RPC
-- bodies from 20260417185201_periodization_extras_swaps_and_every.sql.

DROP FUNCTION IF EXISTS public.upsert_periodization(jsonb);
DROP FUNCTION IF EXISTS public.replace_future_occurrences(uuid, date, jsonb);

DROP TABLE IF EXISTS public.periodization_adjustments CASCADE;

-- =============================================================================
-- Table: periodization_overrides
-- Original DDL sourced from:
--   supabase/migrations/20260412182011_periodizations.sql (base table)
--   supabase/migrations/20260414101024_periodization_occurrences.sql (set_index)
--   supabase/migrations/20260417185201_periodization_extras_swaps_and_every.sql (microcycle_repetition_every)
-- =============================================================================

CREATE TABLE public.periodization_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  periodization_id uuid NOT NULL REFERENCES public.periodizations (id) ON DELETE CASCADE,
  microcycle_id uuid NOT NULL REFERENCES public.periodization_microcycles (id) ON DELETE CASCADE,
  microcycle_repetition_start integer NOT NULL,
  microcycle_repetition_end integer,
  workout_exercise_id uuid NOT NULL,
  override_type text NOT NULL,
  delta integer NOT NULL,
  set_index integer NULL,
  microcycle_repetition_every integer NOT NULL DEFAULT 1,
  CONSTRAINT overrides_override_type_valid CHECK (override_type IN ('sets', 'reps_min', 'reps_max', 'load_percent')),
  CONSTRAINT overrides_repetition_range CHECK (
    microcycle_repetition_start >= 1
    AND (microcycle_repetition_end IS NULL OR microcycle_repetition_end >= microcycle_repetition_start)
  ),
  CONSTRAINT overrides_set_index_valid CHECK (set_index IS NULL OR set_index >= 0),
  CONSTRAINT overrides_repetition_every_positive CHECK (microcycle_repetition_every >= 1)
);

CREATE INDEX periodization_overrides_periodization_id_idx
  ON public.periodization_overrides (periodization_id);
CREATE INDEX periodization_overrides_microcycle_id_idx
  ON public.periodization_overrides (microcycle_id);

ALTER TABLE public.periodization_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "overrides_via_periodization" ON public.periodization_overrides
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.periodizations p
      WHERE p.id = periodization_id
      AND (p.created_by = (SELECT auth.uid()) OR p.athlete_id = (SELECT auth.uid()))
    )
  );

-- =============================================================================
-- Table: periodization_notes
-- Original DDL sourced from:
--   supabase/migrations/20260412182011_periodizations.sql
-- =============================================================================

CREATE TABLE public.periodization_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  periodization_id uuid NOT NULL REFERENCES public.periodizations (id) ON DELETE CASCADE,
  microcycle_id uuid NOT NULL REFERENCES public.periodization_microcycles (id) ON DELETE CASCADE,
  repetition integer NOT NULL,
  workout_id uuid REFERENCES public.workouts (id) ON DELETE SET NULL,
  note text NOT NULL,
  CONSTRAINT notes_repetition_positive CHECK (repetition >= 1),
  CONSTRAINT notes_note_nonempty CHECK (LENGTH(TRIM(note)) > 0)
);

CREATE INDEX periodization_notes_periodization_id_idx
  ON public.periodization_notes (periodization_id);
CREATE INDEX periodization_notes_microcycle_id_idx
  ON public.periodization_notes (microcycle_id);

ALTER TABLE public.periodization_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notes_via_periodization" ON public.periodization_notes
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.periodizations p
      WHERE p.id = periodization_id
      AND (p.created_by = (SELECT auth.uid()) OR p.athlete_id = (SELECT auth.uid()))
    )
  );

-- =============================================================================
-- Table: periodization_extra_days
-- Original DDL sourced from:
--   supabase/migrations/20260417185201_periodization_extras_swaps_and_every.sql
-- =============================================================================

CREATE TABLE public.periodization_extra_days (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  periodization_id uuid NOT NULL REFERENCES public.periodizations (id) ON DELETE CASCADE,
  microcycle_id uuid NOT NULL REFERENCES public.periodization_microcycles (id) ON DELETE CASCADE,
  microcycle_repetition_start integer NOT NULL,
  microcycle_repetition_end integer NULL,
  microcycle_repetition_every integer NOT NULL DEFAULT 1,
  day_type text NOT NULL,
  workout_id uuid NULL REFERENCES public.workouts (id) ON DELETE RESTRICT,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT extras_repetition_range_valid CHECK (
    microcycle_repetition_start >= 1
    AND (microcycle_repetition_end IS NULL OR microcycle_repetition_end >= microcycle_repetition_start)
  ),
  CONSTRAINT extras_repetition_every_positive CHECK (microcycle_repetition_every >= 1),
  CONSTRAINT extras_day_type_valid CHECK (day_type IN ('workout', 'rest')),
  CONSTRAINT extras_workout_required CHECK (
    (day_type = 'workout' AND workout_id IS NOT NULL)
    OR (day_type = 'rest' AND workout_id IS NULL)
  )
);

CREATE INDEX periodization_extra_days_periodization_id_idx
  ON public.periodization_extra_days (periodization_id);
CREATE INDEX periodization_extra_days_microcycle_id_idx
  ON public.periodization_extra_days (microcycle_id);

ALTER TABLE public.periodization_extra_days ENABLE ROW LEVEL SECURITY;

CREATE POLICY "extras_via_periodization" ON public.periodization_extra_days
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.periodizations p
      WHERE p.id = periodization_id
      AND (p.created_by = (SELECT auth.uid()) OR p.athlete_id = (SELECT auth.uid()))
    )
  );

-- =============================================================================
-- Table: periodization_day_swaps
-- Original DDL sourced from:
--   supabase/migrations/20260417185201_periodization_extras_swaps_and_every.sql
-- =============================================================================

CREATE TABLE public.periodization_day_swaps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  periodization_id uuid NOT NULL REFERENCES public.periodizations (id) ON DELETE CASCADE,
  microcycle_id uuid NOT NULL REFERENCES public.periodization_microcycles (id) ON DELETE CASCADE,
  microcycle_repetition_start integer NOT NULL,
  microcycle_repetition_end integer NULL,
  microcycle_repetition_every integer NOT NULL DEFAULT 1,
  day_a_template_id uuid NULL REFERENCES public.periodization_microcycle_days (id) ON DELETE CASCADE,
  day_a_extra_id uuid NULL REFERENCES public.periodization_extra_days (id) ON DELETE CASCADE,
  day_b_template_id uuid NULL REFERENCES public.periodization_microcycle_days (id) ON DELETE CASCADE,
  day_b_extra_id uuid NULL REFERENCES public.periodization_extra_days (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT swaps_repetition_range_valid CHECK (
    microcycle_repetition_start >= 1
    AND (microcycle_repetition_end IS NULL OR microcycle_repetition_end >= microcycle_repetition_start)
  ),
  CONSTRAINT swaps_repetition_every_positive CHECK (microcycle_repetition_every >= 1),
  CONSTRAINT swaps_day_a_exactly_one CHECK (
    (day_a_template_id IS NOT NULL)::int + (day_a_extra_id IS NOT NULL)::int = 1
  ),
  CONSTRAINT swaps_day_b_exactly_one CHECK (
    (day_b_template_id IS NOT NULL)::int + (day_b_extra_id IS NOT NULL)::int = 1
  ),
  CONSTRAINT swaps_different_sides CHECK (
    day_a_template_id IS DISTINCT FROM day_b_template_id
    OR day_a_extra_id IS DISTINCT FROM day_b_extra_id
  )
);

CREATE INDEX periodization_day_swaps_periodization_id_idx
  ON public.periodization_day_swaps (periodization_id);
CREATE INDEX periodization_day_swaps_microcycle_id_idx
  ON public.periodization_day_swaps (microcycle_id);

ALTER TABLE public.periodization_day_swaps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "swaps_via_periodization" ON public.periodization_day_swaps
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.periodizations p
      WHERE p.id = periodization_id
      AND (p.created_by = (SELECT auth.uid()) OR p.athlete_id = (SELECT auth.uid()))
    )
  );

-- =============================================================================
-- RPCs: restore pre-unified bodies
-- Copied verbatim from 20260417185201_periodization_extras_swaps_and_every.sql.
-- =============================================================================

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
  v_extra jsonb;
  v_extra_pos integer;
  v_swap jsonb;
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

  DELETE FROM public.periodization_day_swaps WHERE periodization_id = v_periodization_id;
  DELETE FROM public.periodization_extra_days WHERE periodization_id = v_periodization_id;
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
        id, microcycle_id, position, day_type, workout_id, label
      ) VALUES (
        COALESCE((v_day->>'id')::uuid, gen_random_uuid()),
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
      microcycle_repetition_start, microcycle_repetition_end, microcycle_repetition_every,
      workout_exercise_id, override_type, delta, set_index
    ) VALUES (
      v_periodization_id,
      (v_override->>'microcycle_id')::uuid,
      (v_override->>'microcycle_repetition_start')::integer,
      (v_override->>'microcycle_repetition_end')::integer,
      COALESCE((v_override->>'microcycle_repetition_every')::integer, 1),
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

  v_extra_pos := 0;
  FOR v_extra IN SELECT * FROM jsonb_array_elements(COALESCE(payload->'extra_days', '[]'::jsonb))
  LOOP
    INSERT INTO public.periodization_extra_days (
      id, periodization_id, microcycle_id,
      microcycle_repetition_start, microcycle_repetition_end, microcycle_repetition_every,
      day_type, workout_id, position
    ) VALUES (
      COALESCE((v_extra->>'id')::uuid, gen_random_uuid()),
      v_periodization_id,
      (v_extra->>'microcycle_id')::uuid,
      (v_extra->>'microcycle_repetition_start')::integer,
      NULLIF(v_extra->>'microcycle_repetition_end', '')::integer,
      COALESCE((v_extra->>'microcycle_repetition_every')::integer, 1),
      v_extra->>'day_type',
      NULLIF(v_extra->>'workout_id', '')::uuid,
      COALESCE((v_extra->>'position')::integer, v_extra_pos)
    );
    v_extra_pos := v_extra_pos + 1;
  END LOOP;

  FOR v_swap IN SELECT * FROM jsonb_array_elements(COALESCE(payload->'day_swaps', '[]'::jsonb))
  LOOP
    INSERT INTO public.periodization_day_swaps (
      periodization_id, microcycle_id,
      microcycle_repetition_start, microcycle_repetition_end, microcycle_repetition_every,
      day_a_template_id, day_a_extra_id,
      day_b_template_id, day_b_extra_id
    ) VALUES (
      v_periodization_id,
      (v_swap->>'microcycle_id')::uuid,
      (v_swap->>'microcycle_repetition_start')::integer,
      NULLIF(v_swap->>'microcycle_repetition_end', '')::integer,
      COALESCE((v_swap->>'microcycle_repetition_every')::integer, 1),
      NULLIF(v_swap->>'day_a_template_id', '')::uuid,
      NULLIF(v_swap->>'day_a_extra_id', '')::uuid,
      NULLIF(v_swap->>'day_b_template_id', '')::uuid,
      NULLIF(v_swap->>'day_b_extra_id', '')::uuid
    );
  END LOOP;

  RETURN v_periodization_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.upsert_periodization(jsonb) TO authenticated;

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
  v_t record;
  v_e record;
  v_s record;
  v_offset int := 0;
  v_planned date;
  v_slots jsonb;
  v_slot jsonb;
  v_i int;
  v_a_idx int;
  v_b_idx int;
  v_tmp jsonb;
  v_done boolean := false;
BEGIN
  SELECT id, start_date, end_date, created_by
    INTO v_periodization
    FROM public.periodizations
    WHERE id = p_periodization_id
    FOR UPDATE;

  IF v_periodization.id IS NULL THEN
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
      v_slots := '[]'::jsonb;

      FOR v_t IN
        SELECT id, day_type, workout_id
          FROM public.periodization_microcycle_days
          WHERE microcycle_id = v_mc.id
          ORDER BY position
      LOOP
        v_slots := v_slots || jsonb_build_array(jsonb_build_object(
          'kind', 'template',
          'id', v_t.id,
          'day_type', v_t.day_type,
          'workout_id', v_t.workout_id
        ));
      END LOOP;

      FOR v_e IN
        SELECT id, day_type, workout_id
          FROM public.periodization_extra_days
          WHERE microcycle_id = v_mc.id
            AND public.periodization_propagation_matches(
              v_rep,
              microcycle_repetition_start,
              microcycle_repetition_end,
              microcycle_repetition_every
            )
          ORDER BY position, created_at
      LOOP
        v_slots := v_slots || jsonb_build_array(jsonb_build_object(
          'kind', 'extra',
          'id', v_e.id,
          'day_type', v_e.day_type,
          'workout_id', v_e.workout_id
        ));
      END LOOP;

      FOR v_s IN
        SELECT day_a_template_id, day_a_extra_id, day_b_template_id, day_b_extra_id
          FROM public.periodization_day_swaps
          WHERE microcycle_id = v_mc.id
            AND public.periodization_propagation_matches(
              v_rep,
              microcycle_repetition_start,
              microcycle_repetition_end,
              microcycle_repetition_every
            )
          ORDER BY created_at
      LOOP
        v_a_idx := NULL;
        v_b_idx := NULL;
        FOR v_i IN 0..jsonb_array_length(v_slots) - 1 LOOP
          v_slot := v_slots->v_i;
          IF v_s.day_a_template_id IS NOT NULL
             AND v_slot->>'kind' = 'template'
             AND (v_slot->>'id')::uuid = v_s.day_a_template_id THEN
            v_a_idx := v_i;
          ELSIF v_s.day_a_extra_id IS NOT NULL
             AND v_slot->>'kind' = 'extra'
             AND (v_slot->>'id')::uuid = v_s.day_a_extra_id THEN
            v_a_idx := v_i;
          END IF;
          IF v_s.day_b_template_id IS NOT NULL
             AND v_slot->>'kind' = 'template'
             AND (v_slot->>'id')::uuid = v_s.day_b_template_id THEN
            v_b_idx := v_i;
          ELSIF v_s.day_b_extra_id IS NOT NULL
             AND v_slot->>'kind' = 'extra'
             AND (v_slot->>'id')::uuid = v_s.day_b_extra_id THEN
            v_b_idx := v_i;
          END IF;
        END LOOP;

        IF v_a_idx IS NOT NULL AND v_b_idx IS NOT NULL AND v_a_idx <> v_b_idx THEN
          v_tmp := v_slots->v_a_idx;
          v_slots := jsonb_set(v_slots, ARRAY[v_a_idx::text], v_slots->v_b_idx);
          v_slots := jsonb_set(v_slots, ARRAY[v_b_idx::text], v_tmp);
        END IF;
      END LOOP;

      FOR v_i IN 0..jsonb_array_length(v_slots) - 1 LOOP
        v_slot := v_slots->v_i;
        v_planned := v_periodization.start_date + v_offset;
        IF v_planned > v_periodization.end_date THEN
          v_done := true;
          EXIT;
        END IF;

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
          v_i,
          v_planned,
          v_slot->>'day_type',
          CASE WHEN v_slot->>'day_type' = 'workout' THEN (v_slot->>'workout_id')::uuid ELSE NULL END,
          'pending'
        );

        v_offset := v_offset + 1;
      END LOOP;

      EXIT WHEN v_done;
    END LOOP;
    EXIT WHEN v_done;
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION public.generate_periodization_occurrences(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.regenerate_future_occurrences(
  p_periodization_id uuid,
  p_from_date date
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_periodization record;
  v_mc record;
  v_rep int;
  v_t record;
  v_e record;
  v_s record;
  v_offset int := 0;
  v_planned date;
  v_slots jsonb;
  v_slot jsonb;
  v_i int;
  v_a_idx int;
  v_b_idx int;
  v_tmp jsonb;
  v_done boolean := false;
BEGIN
  SELECT id, start_date, end_date, created_by, status
    INTO v_periodization
    FROM public.periodizations
    WHERE id = p_periodization_id
    FOR UPDATE;

  IF v_periodization.id IS NULL THEN
    RAISE EXCEPTION 'BUSINESS: Periodização não encontrada.';
  END IF;

  IF v_periodization.created_by <> (SELECT auth.uid()) THEN
    RAISE EXCEPTION 'BUSINESS: Sem permissão para modificar esta periodização.';
  END IF;

  IF v_periodization.status NOT IN ('draft', 'active') THEN
    RAISE EXCEPTION 'BUSINESS: Periodização não pode ser editada.';
  END IF;

  DELETE FROM public.periodization_occurrences
    WHERE periodization_id = p_periodization_id
      AND status = 'pending'
      AND planned_date >= p_from_date;

  FOR v_mc IN
    SELECT id, position, repeat_count
      FROM public.periodization_microcycles
      WHERE periodization_id = p_periodization_id
      ORDER BY position
  LOOP
    FOR v_rep IN 1..v_mc.repeat_count LOOP
      v_slots := '[]'::jsonb;

      FOR v_t IN
        SELECT id, day_type, workout_id
          FROM public.periodization_microcycle_days
          WHERE microcycle_id = v_mc.id
          ORDER BY position
      LOOP
        v_slots := v_slots || jsonb_build_array(jsonb_build_object(
          'kind', 'template',
          'id', v_t.id,
          'day_type', v_t.day_type,
          'workout_id', v_t.workout_id
        ));
      END LOOP;

      FOR v_e IN
        SELECT id, day_type, workout_id
          FROM public.periodization_extra_days
          WHERE microcycle_id = v_mc.id
            AND public.periodization_propagation_matches(
              v_rep,
              microcycle_repetition_start,
              microcycle_repetition_end,
              microcycle_repetition_every
            )
          ORDER BY position, created_at
      LOOP
        v_slots := v_slots || jsonb_build_array(jsonb_build_object(
          'kind', 'extra',
          'id', v_e.id,
          'day_type', v_e.day_type,
          'workout_id', v_e.workout_id
        ));
      END LOOP;

      FOR v_s IN
        SELECT day_a_template_id, day_a_extra_id, day_b_template_id, day_b_extra_id
          FROM public.periodization_day_swaps
          WHERE microcycle_id = v_mc.id
            AND public.periodization_propagation_matches(
              v_rep,
              microcycle_repetition_start,
              microcycle_repetition_end,
              microcycle_repetition_every
            )
          ORDER BY created_at
      LOOP
        v_a_idx := NULL;
        v_b_idx := NULL;
        FOR v_i IN 0..jsonb_array_length(v_slots) - 1 LOOP
          v_slot := v_slots->v_i;
          IF v_s.day_a_template_id IS NOT NULL
             AND v_slot->>'kind' = 'template'
             AND (v_slot->>'id')::uuid = v_s.day_a_template_id THEN
            v_a_idx := v_i;
          ELSIF v_s.day_a_extra_id IS NOT NULL
             AND v_slot->>'kind' = 'extra'
             AND (v_slot->>'id')::uuid = v_s.day_a_extra_id THEN
            v_a_idx := v_i;
          END IF;
          IF v_s.day_b_template_id IS NOT NULL
             AND v_slot->>'kind' = 'template'
             AND (v_slot->>'id')::uuid = v_s.day_b_template_id THEN
            v_b_idx := v_i;
          ELSIF v_s.day_b_extra_id IS NOT NULL
             AND v_slot->>'kind' = 'extra'
             AND (v_slot->>'id')::uuid = v_s.day_b_extra_id THEN
            v_b_idx := v_i;
          END IF;
        END LOOP;

        IF v_a_idx IS NOT NULL AND v_b_idx IS NOT NULL AND v_a_idx <> v_b_idx THEN
          v_tmp := v_slots->v_a_idx;
          v_slots := jsonb_set(v_slots, ARRAY[v_a_idx::text], v_slots->v_b_idx);
          v_slots := jsonb_set(v_slots, ARRAY[v_b_idx::text], v_tmp);
        END IF;
      END LOOP;

      FOR v_i IN 0..jsonb_array_length(v_slots) - 1 LOOP
        v_slot := v_slots->v_i;
        v_planned := v_periodization.start_date + v_offset;
        IF v_planned > v_periodization.end_date THEN
          v_done := true;
          EXIT;
        END IF;

        IF v_planned >= p_from_date
           AND NOT EXISTS (
             SELECT 1 FROM public.periodization_occurrences
             WHERE periodization_id = p_periodization_id
               AND planned_date = v_planned
               AND position = v_i
           ) THEN
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
            v_i,
            v_planned,
            v_slot->>'day_type',
            CASE WHEN v_slot->>'day_type' = 'workout' THEN (v_slot->>'workout_id')::uuid ELSE NULL END,
            'pending'
          );
        END IF;

        v_offset := v_offset + 1;
      END LOOP;

      EXIT WHEN v_done;
    END LOOP;
    EXIT WHEN v_done;
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION public.regenerate_future_occurrences(uuid, date) TO authenticated;

-- =============================================================================
-- RPC: postpone_periodization_occurrence
-- Restored from 20260414101024_periodization_occurrences.sql.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.postpone_periodization_occurrence(
  p_occurrence_id uuid,
  p_new_date date
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_occ record;
  v_periodization record;
  v_delta int;
  v_collision int;
BEGIN
  SELECT id, periodization_id, planned_date, status
    INTO v_occ
    FROM public.periodization_occurrences
    WHERE id = p_occurrence_id
    FOR UPDATE;

  IF v_occ.id IS NULL THEN
    RAISE EXCEPTION 'BUSINESS: Ocorrência não encontrada.';
  END IF;

  IF v_occ.status <> 'pending' THEN
    RAISE EXCEPTION 'BUSINESS: Apenas ocorrências pendentes podem ser reagendadas.';
  END IF;

  IF p_new_date <= v_occ.planned_date THEN
    RAISE EXCEPTION 'BUSINESS: A nova data precisa ser posterior à data planejada.';
  END IF;

  IF p_new_date < CURRENT_DATE THEN
    RAISE EXCEPTION 'BUSINESS: A nova data não pode estar no passado.';
  END IF;

  SELECT id, start_date, end_date, status, created_by
    INTO v_periodization
    FROM public.periodizations
    WHERE id = v_occ.periodization_id
    FOR UPDATE;

  IF v_periodization.created_by <> (SELECT auth.uid()) THEN
    RAISE EXCEPTION 'BUSINESS: Sem permissão para modificar esta periodização.';
  END IF;

  IF v_periodization.status NOT IN ('draft', 'active') THEN
    RAISE EXCEPTION 'BUSINESS: Periodização não pode ser editada.';
  END IF;

  IF p_new_date > v_periodization.end_date THEN
    RAISE EXCEPTION 'BUSINESS: A nova data não pode ser posterior ao fim da periodização.';
  END IF;

  v_delta := p_new_date - v_occ.planned_date;

  SELECT COUNT(*) INTO v_collision
    FROM public.periodization_occurrences src
    JOIN public.periodization_occurrences dst
      ON dst.periodization_id = src.periodization_id
     AND dst.planned_date = src.planned_date + v_delta
     AND dst.position = src.position
     AND dst.id <> src.id
    WHERE src.periodization_id = v_occ.periodization_id
      AND src.planned_date >= v_occ.planned_date
      AND src.status = 'pending'
      AND src.planned_date + v_delta <= v_periodization.end_date
      AND dst.status IN ('done', 'skipped');

  IF v_collision > 0 THEN
    RAISE EXCEPTION 'BUSINESS: Conflito com treinos já executados ou pulados na nova data.';
  END IF;

  DELETE FROM public.periodization_occurrences
    WHERE periodization_id = v_occ.periodization_id
      AND status = 'pending'
      AND planned_date >= v_occ.planned_date
      AND planned_date + v_delta > v_periodization.end_date;

  UPDATE public.periodization_occurrences
    SET planned_date = planned_date + 1000000,
        updated_at = now()
    WHERE periodization_id = v_occ.periodization_id
      AND planned_date >= v_occ.planned_date
      AND status = 'pending';

  UPDATE public.periodization_occurrences
    SET planned_date = planned_date - 1000000 + v_delta
    WHERE periodization_id = v_occ.periodization_id
      AND planned_date >= v_occ.planned_date + 1000000
      AND status = 'pending';
END;
$$;

GRANT EXECUTE ON FUNCTION public.postpone_periodization_occurrence(uuid, date) TO authenticated;
