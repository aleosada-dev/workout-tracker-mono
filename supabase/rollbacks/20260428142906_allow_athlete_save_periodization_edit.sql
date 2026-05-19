-- Rollback: restore save_periodization_edit to created_by-only authorization.

CREATE OR REPLACE FUNCTION public.save_periodization_edit(
  p_periodization_id uuid,
  p_start_date date,
  p_end_date date,
  p_adjustments_delete uuid[],
  p_adjustments_upsert jsonb,
  p_occurrences_delete uuid[],
  p_occurrences_insert jsonb,
  p_occurrences_update jsonb
) RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_owner uuid;
  v_status text;
  v_current_start_date date;
BEGIN
  SELECT p.created_by, p.status, p.start_date
    INTO v_owner, v_status, v_current_start_date
    FROM public.periodizations p
    WHERE p.id = p_periodization_id;

  IF v_owner IS NULL THEN
    RAISE EXCEPTION 'Periodização não encontrada' USING ERRCODE = 'P0002';
  END IF;
  IF v_owner <> (SELECT auth.uid()) THEN
    RAISE EXCEPTION 'Acesso negado' USING ERRCODE = '42501';
  END IF;
  IF v_status = 'completed' THEN
    RAISE EXCEPTION 'Periodização encerrada não pode ser editada' USING ERRCODE = '22023';
  END IF;
  IF v_status = 'active' AND p_start_date <> v_current_start_date THEN
    RAISE EXCEPTION 'Data de início não pode ser alterada após a ativação' USING ERRCODE = '22023';
  END IF;

  UPDATE public.periodizations
     SET start_date = p_start_date,
         end_date   = p_end_date,
         updated_at = now()
   WHERE id = p_periodization_id;

  IF p_adjustments_delete IS NOT NULL AND array_length(p_adjustments_delete, 1) > 0 THEN
    DELETE FROM public.periodization_adjustments
     WHERE id = ANY(p_adjustments_delete)
       AND periodization_id = p_periodization_id;
  END IF;

  IF p_adjustments_upsert IS NOT NULL AND jsonb_array_length(p_adjustments_upsert) > 0 THEN
    INSERT INTO public.periodization_adjustments (
      id, periodization_id, cycle_start, cycle_end, cycle_every, type, payload, created_at
    )
    SELECT
      COALESCE(NULLIF(r->>'id', '')::uuid, gen_random_uuid()),
      p_periodization_id,
      NULLIF(r->>'cycle_start', '')::int,
      NULLIF(r->>'cycle_end', '')::int,
      NULLIF(r->>'cycle_every', '')::int,
      r->>'type',
      r->'payload',
      COALESCE(NULLIF(r->>'created_at', '')::timestamptz, now())
    FROM jsonb_array_elements(p_adjustments_upsert) AS r
    ON CONFLICT (id) DO UPDATE
      SET cycle_start = EXCLUDED.cycle_start,
          cycle_end   = EXCLUDED.cycle_end,
          cycle_every = EXCLUDED.cycle_every,
          type        = EXCLUDED.type,
          payload     = EXCLUDED.payload,
          updated_at  = now();
  END IF;

  IF p_occurrences_delete IS NOT NULL AND array_length(p_occurrences_delete, 1) > 0 THEN
    DELETE FROM public.periodization_occurrences
     WHERE id = ANY(p_occurrences_delete)
       AND periodization_id = p_periodization_id
       AND status IN ('pending', 'missed');
  END IF;

  IF p_occurrences_insert IS NOT NULL AND jsonb_array_length(p_occurrences_insert) > 0 THEN
    INSERT INTO public.periodization_occurrences (
      periodization_id, cycle, template_day_id, template_activity_id, position_in_day,
      planned_date, day_type, kind, workout_id, cardio_program_id,
      origin, source_adjustment_id, status
    )
    SELECT
      p_periodization_id,
      (r->>'cycle')::int,
      NULLIF(r->>'templateDayId', '')::uuid,
      NULLIF(r->>'templateActivityId', '')::uuid,
      (r->>'positionInDay')::int,
      (r->>'plannedDate')::date,
      r->>'dayType',
      NULLIF(r->>'kind', ''),
      NULLIF(r->>'workoutId', '')::uuid,
      NULLIF(r->>'cardioProgramId', '')::uuid,
      r->>'origin',
      NULLIF(r->>'sourceAdjustmentId', '')::uuid,
      'pending'
    FROM jsonb_array_elements(p_occurrences_insert) AS r;
  END IF;

  IF p_occurrences_update IS NOT NULL AND jsonb_array_length(p_occurrences_update) > 0 THEN
    UPDATE public.periodization_occurrences po
       SET planned_date         = COALESCE((r->'patch'->>'plannedDate')::date, po.planned_date),
           cycle                = COALESCE((r->'patch'->>'cycle')::int, po.cycle),
           position_in_day      = COALESCE((r->'patch'->>'positionInDay')::int, po.position_in_day),
           day_type             = COALESCE(r->'patch'->>'dayType', po.day_type),
           kind                 = COALESCE(NULLIF(r->'patch'->>'kind', ''), po.kind),
           workout_id           = COALESCE(NULLIF(r->'patch'->>'workoutId', '')::uuid, po.workout_id),
           cardio_program_id    = COALESCE(NULLIF(r->'patch'->>'cardioProgramId', '')::uuid, po.cardio_program_id),
           origin               = COALESCE(r->'patch'->>'origin', po.origin),
           source_adjustment_id = COALESCE(NULLIF(r->'patch'->>'sourceAdjustmentId', '')::uuid, po.source_adjustment_id),
           updated_at           = now()
      FROM jsonb_array_elements(p_occurrences_update) AS r
     WHERE po.id = (r->>'id')::uuid
       AND po.periodization_id = p_periodization_id
       AND po.status IN ('pending', 'missed');
  END IF;
END;
$$;
