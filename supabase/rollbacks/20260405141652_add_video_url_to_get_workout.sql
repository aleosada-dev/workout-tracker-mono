-- Rollback: remove video_url from get_workout RPC response
-- Restores the previous version without video_url in exercises

CREATE OR REPLACE FUNCTION public.get_workout(p_workout_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  actor_id uuid;
  result jsonb;
BEGIN
  actor_id := auth.uid();

  IF actor_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.workouts w
    WHERE w.id = p_workout_id
      AND (
        w.user_id = actor_id
        OR public.is_active_coach_of(actor_id, w.user_id)
      )
  ) THEN
    RETURN NULL;
  END IF;

  SELECT jsonb_build_object(
    'workout',
    jsonb_build_object(
      'id', w.id,
      'user_id', w.user_id,
      'name', w.name,
      'description', w.description,
      'archived_at', w.archived_at,
      'created_by', w.created_by,
      'updated_by', w.updated_by,
      'created_at', w.created_at,
      'updated_at', w.updated_at
    ),
    'exercises',
    COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', we.id,
            'variation_id', we.variation_id,
            'variation_name', v.name,
            'exercise_id', e.id,
            'name', e.name,
            'equipment_name', eq.name,
            'equipment_preposition', eq.preposition,
            'note', we.note,
            'rest_seconds', we.rest_seconds,
            'position', we.position,
            'superset_group_id', we.superset_group_id,
            'superset_order', we.superset_order,
            'sets',
            COALESCE(
              (
                SELECT jsonb_agg(
                  jsonb_build_object(
                    'id', ws.id,
                    'linked_set_id', ws.linked_set_id,
                    'reps_min', ws.reps_min,
                    'reps_max', ws.reps_max,
                    'set_order', ws.set_order,
                    'set_type', ws.set_type,
                    'load_percent_of_previous', ws.load_percent_of_previous
                  )
                  ORDER BY ws.set_order ASC, ws.id ASC
                )
                FROM public.workout_sets ws
                WHERE ws.workout_exercise_id = we.id
              ),
              '[]'::jsonb
            )
          )
          ORDER BY we.position ASC, we.superset_order ASC
        )
        FROM public.workout_exercises we
        JOIN public.variations v ON v.id = we.variation_id
        JOIN public.exercises e ON e.id = v.exercise_id
        JOIN public.equipments eq ON eq.id = v.equipment_id
        WHERE we.workout_id = w.id
      ),
      '[]'::jsonb
    ),
    'preparatory_exercises',
    COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', wpe.id,
            'variation_id', wpe.variation_id,
            'variation_name', v.name,
            'exercise_name', e.name,
            'muscle_name', m.name,
            'equipment_name', eq.name,
            'equipment_preposition', eq.preposition,
            'position', wpe.position,
            'duration_type', wpe.duration_type,
            'note', wpe.note,
            'sets',
            COALESCE(
              (
                SELECT jsonb_agg(
                  jsonb_build_object(
                    'id', wps.id,
                    'set_order', wps.set_order,
                    'duration_seconds', wps.duration_seconds,
                    'reps', wps.reps
                  )
                  ORDER BY wps.set_order ASC, wps.id ASC
                )
                FROM public.workout_preparatory_sets wps
                WHERE wps.workout_preparatory_exercise_id = wpe.id
              ),
              '[]'::jsonb
            )
          )
          ORDER BY wpe.position ASC
        )
        FROM public.workout_preparatory_exercises wpe
        JOIN public.variations v ON v.id = wpe.variation_id
        JOIN public.exercises e ON e.id = v.exercise_id
        JOIN public.muscles m ON m.id = v.muscle_id
        JOIN public.equipments eq ON eq.id = v.equipment_id
        WHERE wpe.workout_id = w.id
      ),
      '[]'::jsonb
    )
  )
  INTO result
  FROM public.workouts w
  WHERE w.id = p_workout_id;

  RETURN result;
END;
$function$;
