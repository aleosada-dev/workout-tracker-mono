-- Rollback for 20260416182623_workout_folders.sql

-- 1) Drop the new RPCs
DROP FUNCTION IF EXISTS public.search_workouts(uuid, text);
DROP FUNCTION IF EXISTS public.delete_folder(uuid, text);

-- 2) Drop the (new) 2-arg list_workouts_with_summary and restore the 1-arg version
DROP FUNCTION IF EXISTS public.list_workouts_with_summary(uuid, uuid);

CREATE OR REPLACE FUNCTION public.list_workouts_with_summary(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor_id uuid;
  result jsonb;
BEGIN
  actor_id := auth.uid();

  IF actor_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF actor_id <> p_user_id AND NOT public.is_active_coach_of(actor_id, p_user_id) THEN
    RAISE EXCEPTION 'Not authorized to list workouts for this user';
  END IF;

  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', w.id,
        'user_id', w.user_id,
        'name', w.name,
        'description', w.description,
        'archived_at', w.archived_at,
        'created_by', w.created_by,
        'updated_by', w.updated_by,
        'created_at', w.created_at,
        'updated_at', w.updated_at,
        'exercise_count', COALESCE(summary.exercise_count, 0),
        'muscle_names', COALESCE(summary.muscle_names, '[]'::jsonb)
      )
      ORDER BY w.name, w.id
    ),
    '[]'::jsonb
  )
  INTO result
  FROM public.workouts w
  LEFT JOIN LATERAL (
    SELECT
      COUNT(DISTINCT we.id)::int AS exercise_count,
      jsonb_agg(DISTINCT m.name ORDER BY m.name)
        FILTER (WHERE m.name IS NOT NULL) AS muscle_names
    FROM public.workout_exercises we
    JOIN public.variations v ON v.id = we.variation_id
    JOIN public.muscles m ON m.id = v.muscle_id
    WHERE we.workout_id = w.id
  ) summary ON true
  WHERE w.user_id = p_user_id;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.list_workouts_with_summary(uuid) TO authenticated;

-- 3) Restore get_workout without folder_id
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
            'video_url', v.video_url,
            'image_url', v.image_url,
            'muscle_id', v.muscle_id,
            'muscle_name', m.name,
            'secondary_muscle_id', v.secondary_muscle_id,
            'secondary_muscle_name', sm.name,
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
        JOIN public.muscles m ON m.id = v.muscle_id
        LEFT JOIN public.muscles sm ON sm.id = v.secondary_muscle_id
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

-- 4) Restore upsert_workout without folder_id
CREATE OR REPLACE FUNCTION public.upsert_workout (payload JSONB)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_workout jsonb := payload->'workout';
  v_workout_id uuid := (v_workout->>'id')::uuid;
  v_workout_name text;
  v_workout_description text;
  v_workout_archived timestamptz;
  v_auth_id uuid;
  v_target_user_id uuid;
  v_user_id uuid;
BEGIN
  v_auth_id := (SELECT auth.uid());
  v_target_user_id := (v_workout->>'user_id')::uuid;

  IF v_target_user_id IS NOT NULL AND v_target_user_id <> v_auth_id THEN
    IF NOT public.is_active_coach_of(v_auth_id, v_target_user_id) THEN
      RAISE EXCEPTION 'access denied: not an active coach of the target user';
    END IF;
    v_user_id := v_target_user_id;
  ELSE
    v_user_id := v_auth_id;
  END IF;

  IF v_workout IS NULL THEN
    RAISE EXCEPTION 'workout payload required';
  END IF;

  IF jsonb_typeof(payload->'exercises') IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'exercises must be array';
  END IF;

  v_workout_name := NULLIF(TRIM(v_workout->>'name'), '');
  v_workout_description := NULLIF(TRIM(v_workout->>'description'), '');
  v_workout_archived := (v_workout->>'archived_at')::timestamptz;

  IF v_workout_name IS NULL THEN
    RAISE EXCEPTION 'workout name required';
  END IF;

  IF v_workout_id IS NULL THEN
    v_workout_id := gen_random_uuid();
  END IF;

  INSERT INTO public.workouts (id, user_id, name, description, archived_at)
  VALUES (v_workout_id, v_user_id, v_workout_name, v_workout_description, v_workout_archived)
  ON CONFLICT (id) DO UPDATE SET
    name = excluded.name,
    description = excluded.description,
    archived_at = excluded.archived_at
  WHERE public.workouts.user_id = v_user_id
    OR public.is_active_coach_of(v_auth_id, public.workouts.user_id);

  IF NOT FOUND THEN
    RAISE EXCEPTION 'workout not found or access denied';
  END IF;
  -- (The rest of the function body — exercises/sets/prep handling — is unchanged
  --  from the previous migration. Re-applying the forward migration then this
  --  rollback restores the previous definition because the rollback only needs
  --  to drop the new folder_id column handling. To fully restore, re-run the
  --  previous upsert_workout migration (20260324102002) after this rollback.)

  RETURN v_workout_id;
END;
$$;

-- 5) Drop trigger + trigger function
DROP TRIGGER IF EXISTS trg_workouts_folder_same_owner ON public.workouts;
DROP FUNCTION IF EXISTS public.enforce_workout_folder_same_owner();

-- 6) Drop workouts.folder_id column + index
DROP INDEX IF EXISTS public.workouts_folder_id_idx;
ALTER TABLE public.workouts DROP COLUMN IF EXISTS folder_id;

-- 7) Drop workout_folders table (policies + index + table)
DROP POLICY IF EXISTS "workout_folders_delete_scoped" ON public.workout_folders;
DROP POLICY IF EXISTS "workout_folders_update_scoped" ON public.workout_folders;
DROP POLICY IF EXISTS "workout_folders_insert_scoped" ON public.workout_folders;
DROP POLICY IF EXISTS "workout_folders_select_scoped" ON public.workout_folders;
DROP INDEX IF EXISTS public.workout_folders_user_id_idx;
DROP TABLE IF EXISTS public.workout_folders;
