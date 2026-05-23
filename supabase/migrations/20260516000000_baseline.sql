


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE EXTENSION IF NOT EXISTS "pg_cron" WITH SCHEMA "pg_catalog";






CREATE EXTENSION IF NOT EXISTS "pg_net" WITH SCHEMA "extensions";






COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "hypopg" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "index_advisor" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgmq";


-- Fila PGMQ "r2_deletions": o trigger enqueue_variation_video_deletion e a
-- edge function reap-r2-deletions a usam para apagar vídeos órfãos no R2.
-- As tabelas da fila vivem no schema pgmq e não foram capturadas pelo
-- pg_dump deste baseline; sem elas o trigger falha com 42P01. Guardado por
-- pgmq.meta para ser idempotente onde a fila já exista.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pgmq.meta WHERE queue_name = 'r2_deletions') THEN
    PERFORM pgmq.create('r2_deletions');
  END IF;
END;
$$;






CREATE EXTENSION IF NOT EXISTS "postgis" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."user_role" AS ENUM (
    'coach',
    'athlete'
);


ALTER TYPE "public"."user_role" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."accept_coach_invite_with_side_effects"("p_invite_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  actor_id uuid;
  athlete_name text;
  target_invite public.coach_athletes%rowtype;
  active_relationship public.coach_athletes%rowtype;
  accepted_coach_full_name text;
  replaced_active_coach_full_name text;
  canceled_pending_invites jsonb := '[]'::jsonb;
  result jsonb;
begin
  actor_id := auth.uid();

  if actor_id is null then
    raise exception 'Authentication required';
  end if;

  perform set_config(
    'app.coach_athlete_transition_context',
    'accept_invite_swap',
    true
  );

  select *
  into target_invite
  from public.coach_athletes
  where id = p_invite_id
    and athlete_id = actor_id
    and status = 'pending'
  for update;

  if not found then
    raise exception 'Pending invite not found for current athlete';
  end if;

  select full_name
  into athlete_name
  from public.profiles
  where id = actor_id;

  if athlete_name is null then
    raise exception 'Athlete profile not found';
  end if;

  select *
  into active_relationship
  from public.coach_athletes
  where athlete_id = actor_id
    and status = 'active'
  for update;

  if found then
    update public.coach_athletes
    set status = 'ended',
        ended_at = coalesce(ended_at, now())
    where id = active_relationship.id;

    select full_name
    into replaced_active_coach_full_name
    from public.profiles
    where id = active_relationship.coach_id;
  end if;

  with canceled as (
    update public.coach_athletes
    set status = 'canceled',
        responded_at = coalesce(responded_at, now())
    where athlete_id = actor_id
      and status = 'pending'
      and id <> p_invite_id
    returning id, coach_id
  )
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'relationship_id',
        canceled.id,
        'coach_id',
        canceled.coach_id,
        'coach_full_name',
        profiles.full_name
      )
    ),
    '[]'::jsonb
  )
  into canceled_pending_invites
  from canceled
  join public.profiles on profiles.id = canceled.coach_id;

  update public.coach_athletes
  set status = 'active',
      responded_at = coalesce(responded_at, now())
  where id = target_invite.id
    and athlete_id = actor_id
    and status = 'pending'
  returning *
  into target_invite;

  if not found then
    raise exception 'Invite could not be activated';
  end if;

  select full_name
  into accepted_coach_full_name
  from public.profiles
  where id = target_invite.coach_id;

  result := jsonb_build_object(
    'invite_id',
    target_invite.id,
    'athlete_id',
    actor_id,
    'athlete_full_name',
    athlete_name,
    'accepted_coach',
    jsonb_build_object(
      'relationship_id',
      target_invite.id,
      'coach_id',
      target_invite.coach_id,
      'coach_full_name',
      accepted_coach_full_name
    ),
    'replaced_active_coach',
    case
      when active_relationship.id is null then null
      else jsonb_build_object(
        'relationship_id',
        active_relationship.id,
        'coach_id',
        active_relationship.coach_id,
        'coach_full_name',
        replaced_active_coach_full_name
      )
    end,
    'canceled_pending_invites',
    canceled_pending_invites
  );

  return result;
end;
$$;


ALTER FUNCTION "public"."accept_coach_invite_with_side_effects"("p_invite_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."batch_update_summary_snapshots"("p_updates" "jsonb") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_item JSONB;
BEGIN
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_updates)
  LOOP
    UPDATE public.workout_log_summaries
    SET summary_snapshot = v_item->'summarySnapshot',
        updated_at = NOW()
    WHERE workout_log_id = (v_item->>'workoutLogId')::UUID;
  END LOOP;
END;
$$;


ALTER FUNCTION "public"."batch_update_summary_snapshots"("p_updates" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."broadcast_notification_insert"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  perform
realtime.broadcast_changes(
    'user:' || new.recipient_user_id::text || ':notifications',
    'notification_created',
    tg_op,
    tg_table_name,
    tg_table_schema,
    new,
    old
  );

return new;
end;
$$;


ALTER FUNCTION "public"."broadcast_notification_insert"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_email_exists"("p_email" "text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM auth.users WHERE email = p_email
  );
END;
$$;


ALTER FUNCTION "public"."check_email_exists"("p_email" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."claim_video_transcode"("p_variation_id" "uuid", "p_max_attempts" integer) RETURNS TABLE("variation_id" "uuid", "object_key" "text", "content_type" "text", "processing_attempts" smallint)
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  UPDATE public.variation_videos vv
  SET processing_status = 'processing',
      processing_attempts = vv.processing_attempts + 1,
      processing_started_at = now()
  WHERE vv.variation_id = p_variation_id
    AND vv.processing_status = 'pending'
    AND vv.processing_attempts < p_max_attempts
  RETURNING
    vv.variation_id,
    vv.object_key,
    vv.content_type,
    vv.processing_attempts;
$$;


ALTER FUNCTION "public"."claim_video_transcode"("p_variation_id" "uuid", "p_max_attempts" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."copy_workout"("p_source_workout_id" "uuid", "p_target_user_id" "uuid") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_coach_id uuid := (SELECT auth.uid());
  v_new_workout_id uuid;
  v_source_workout RECORD;
BEGIN
  IF NOT public.is_active_coach_of(v_coach_id, p_target_user_id) THEN
    RAISE EXCEPTION 'Not authorized to copy workouts for this athlete';
  END IF;

  SELECT * INTO v_source_workout
  FROM public.workouts w
  WHERE w.id = p_source_workout_id
    AND (
      w.user_id = v_coach_id
      OR public.is_active_coach_of(v_coach_id, w.user_id)
    );

  IF v_source_workout IS NULL THEN
    RAISE EXCEPTION 'Source workout not found or access denied';
  END IF;

  v_new_workout_id := gen_random_uuid();

  INSERT INTO public.workouts (
    id,
    user_id,
    name,
    description,
    created_by,
    updated_by
  )
  VALUES (
    v_new_workout_id,
    p_target_user_id,
    v_source_workout.name,
    v_source_workout.description,
    v_coach_id,
    v_coach_id
  );

  DROP TABLE IF EXISTS temp_exercise_mapping;
  CREATE TEMP TABLE temp_exercise_mapping (
    old_id uuid,
    new_id uuid
  );

  INSERT INTO public.workout_exercises (
    id,
    workout_id,
    variation_id,
    note,
    rest_seconds,
    position,
    superset_group_id,
    superset_order
  )
  SELECT
    gen_random_uuid(),
    v_new_workout_id,
    we.variation_id,
    we.note,
    we.rest_seconds,
    we.position,
    we.superset_group_id,  -- temporary: old group id, will be remapped below
    we.superset_order
  FROM public.workout_exercises we
  WHERE we.workout_id = p_source_workout_id
  ORDER BY we.position ASC, we.superset_order ASC;

  INSERT INTO temp_exercise_mapping (old_id, new_id)
  SELECT
    old_we.id,
    new_we.id
  FROM public.workout_exercises old_we
  JOIN public.workout_exercises new_we
    ON old_we.position = new_we.position
    AND old_we.superset_order = new_we.superset_order
  WHERE old_we.workout_id = p_source_workout_id
    AND new_we.workout_id = v_new_workout_id;

  -- Remap superset_group_id: exercises that shared a group in the source
  -- should share a new group in the copy. Standalone exercises (groups of
  -- size 1) remap to their own new id to preserve the convention
  -- `superset_group_id = id`. Real supersets (>= 2 members) receive a
  -- freshly generated UUID that cannot collide with any exercise id, so
  -- the mapper heuristic `id === superset_group_id ? standalone` stays
  -- correct.
  WITH distinct_old_groups AS (
    SELECT DISTINCT old_we.superset_group_id AS old_group_id
    FROM public.workout_exercises old_we
    WHERE old_we.workout_id = p_source_workout_id
  ),
  group_sizes AS (
    SELECT superset_group_id AS old_group_id, COUNT(*) AS member_count
    FROM public.workout_exercises
    WHERE workout_id = p_source_workout_id
    GROUP BY superset_group_id
  ),
  standalone_new_ids AS (
    SELECT
      old_we.superset_group_id AS old_group_id,
      tm.new_id AS new_group_id
    FROM public.workout_exercises old_we
    JOIN temp_exercise_mapping tm ON tm.old_id = old_we.id
    JOIN group_sizes gs ON gs.old_group_id = old_we.superset_group_id
    WHERE old_we.workout_id = p_source_workout_id
      AND gs.member_count = 1
  ),
  group_mapping AS (
    SELECT
      dog.old_group_id,
      COALESCE(sni.new_group_id, gen_random_uuid()) AS new_group_id
    FROM distinct_old_groups dog
    LEFT JOIN standalone_new_ids sni ON sni.old_group_id = dog.old_group_id
  )
  UPDATE public.workout_exercises new_we
  SET superset_group_id = gm.new_group_id
  FROM public.workout_exercises old_we
  JOIN temp_exercise_mapping tm ON tm.old_id = old_we.id
  JOIN group_mapping gm ON gm.old_group_id = old_we.superset_group_id
  WHERE new_we.id = tm.new_id
    AND new_we.workout_id = v_new_workout_id;

  DROP TABLE IF EXISTS temp_set_mapping;
  CREATE TEMP TABLE temp_set_mapping (
    old_id uuid,
    new_id uuid,
    exercise_id uuid,
    set_order int,
    set_type text
  );

  INSERT INTO public.workout_sets (
    id,
    workout_exercise_id,
    set_order,
    set_type,
    reps_min,
    reps_max,
    linked_set_id,
    load_percent_of_previous
  )
  SELECT
    gen_random_uuid(),
    tm.new_id,
    ws.set_order,
    ws.set_type,
    ws.reps_min,
    ws.reps_max,
    NULL::uuid,
    ws.load_percent_of_previous
  FROM public.workout_sets ws
  JOIN temp_exercise_mapping tm ON ws.workout_exercise_id = tm.old_id;

  INSERT INTO temp_set_mapping (old_id, new_id, exercise_id, set_order, set_type)
  SELECT
    old_ws.id,
    new_ws.id,
    new_ws.workout_exercise_id,
    new_ws.set_order,
    new_ws.set_type
  FROM public.workout_sets old_ws
  JOIN temp_exercise_mapping tm ON old_ws.workout_exercise_id = tm.old_id
  JOIN public.workout_sets new_ws
    ON new_ws.workout_exercise_id = tm.new_id
    AND new_ws.set_order = old_ws.set_order;

  UPDATE public.workout_sets ws
  SET linked_set_id = prev_set.new_id
  FROM temp_set_mapping curr_set
  JOIN temp_set_mapping prev_set
    ON curr_set.exercise_id = prev_set.exercise_id
    AND curr_set.set_order = prev_set.set_order + 1
  WHERE ws.id = curr_set.new_id
    AND curr_set.set_type IN ('drop', 'cluster');

  -- Copy preparatory exercises
  DROP TABLE IF EXISTS temp_prep_exercise_mapping;
  CREATE TEMP TABLE temp_prep_exercise_mapping (
    old_id uuid,
    new_id uuid
  );

  INSERT INTO public.workout_preparatory_exercises (
    id,
    workout_id,
    variation_id,
    "position",
    duration_type,
    note
  )
  SELECT
    gen_random_uuid(),
    v_new_workout_id,
    wpe.variation_id,
    wpe.position,
    wpe.duration_type,
    wpe.note
  FROM public.workout_preparatory_exercises wpe
  WHERE wpe.workout_id = p_source_workout_id
  ORDER BY wpe.position ASC;

  INSERT INTO temp_prep_exercise_mapping (old_id, new_id)
  SELECT
    old_wpe.id,
    new_wpe.id
  FROM public.workout_preparatory_exercises old_wpe
  JOIN public.workout_preparatory_exercises new_wpe
    ON old_wpe.position = new_wpe.position
  WHERE old_wpe.workout_id = p_source_workout_id
    AND new_wpe.workout_id = v_new_workout_id;

  INSERT INTO public.workout_preparatory_sets (
    id,
    workout_preparatory_exercise_id,
    set_order,
    duration_seconds,
    reps
  )
  SELECT
    gen_random_uuid(),
    tpm.new_id,
    wps.set_order,
    wps.duration_seconds,
    wps.reps
  FROM public.workout_preparatory_sets wps
  JOIN temp_prep_exercise_mapping tpm ON wps.workout_preparatory_exercise_id = tpm.old_id;

  -- =========================================================
  -- Auto-share coach variations with athlete
  -- =========================================================
  INSERT INTO public.shared_variations (variation_id, owner_id, shared_with_id)
  SELECT DISTINCT v.id, v.user_id, p_target_user_id
  FROM public.workout_exercises we
  JOIN public.variations v ON v.id = we.variation_id
  WHERE we.workout_id = v_new_workout_id
    AND v.user_id IS NOT NULL
    AND v.user_id != p_target_user_id
  ON CONFLICT (variation_id, shared_with_id) DO NOTHING;

  INSERT INTO public.shared_variations (variation_id, owner_id, shared_with_id)
  SELECT DISTINCT v.id, v.user_id, p_target_user_id
  FROM public.workout_preparatory_exercises wpe
  JOIN public.variations v ON v.id = wpe.variation_id
  WHERE wpe.workout_id = v_new_workout_id
    AND v.user_id IS NOT NULL
    AND v.user_id != p_target_user_id
  ON CONFLICT (variation_id, shared_with_id) DO NOTHING;

  RETURN v_new_workout_id;
END;
$$;


ALTER FUNCTION "public"."copy_workout"("p_source_workout_id" "uuid", "p_target_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_email_invite_relationship"("p_coach_id" "uuid", "p_athlete_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
  PERFORM set_config('app.coach_athlete_transition_context', 'email_invite', true);

  INSERT INTO public.coach_athletes (
    coach_id,
    athlete_id,
    invited_by,
    status,
    invited_at,
    responded_at
  ) VALUES (
    p_coach_id,
    p_athlete_id,
    p_coach_id,
    'active',
    now(),
    now()
  );
END;
$$;


ALTER FUNCTION "public"."create_email_invite_relationship"("p_coach_id" "uuid", "p_athlete_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."delete_exercise_variation"("p_variation_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  actor_id uuid;
  target_variation public.variations%rowtype;
  target_user_id uuid;
  superset_rec RECORD;
BEGIN
  actor_id := auth.uid();

  IF actor_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF p_variation_id IS NULL THEN
    RAISE EXCEPTION 'variation_id is required';
  END IF;

  SELECT *
  INTO target_variation
  FROM public.variations v
  WHERE v.id = p_variation_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Variation not found';
  END IF;

  target_user_id := target_variation.user_id;

  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'Variation does not belong to a target user';
  END IF;

  if actor_id != target_user_id then
    raise exception 'Not authorized to manage records for this user';
  end if;

  -- === Clean up workout_exercises ===

  -- For supersets (count > 1 in group): delete entire superset group
  FOR superset_rec IN
    SELECT DISTINCT we.workout_id, we.superset_group_id
    FROM public.workout_exercises we
    WHERE we.variation_id = p_variation_id
      AND (
        SELECT COUNT(*)
        FROM public.workout_exercises we2
        WHERE we2.workout_id = we.workout_id
          AND we2.superset_group_id = we.superset_group_id
      ) > 1
  LOOP
    DELETE FROM public.workout_exercises
    WHERE workout_id = superset_rec.workout_id
      AND superset_group_id = superset_rec.superset_group_id;
  END LOOP;

  -- For standalone exercises: delete just the row
  DELETE FROM public.workout_exercises
  WHERE variation_id = p_variation_id;

  -- === Clean up workout_preparatory_exercises ===
  DELETE FROM public.workout_preparatory_exercises
  WHERE variation_id = p_variation_id;

  -- === Delete the variation ===
  -- ON DELETE SET NULL on workout_exercise_logs and workout_preparatory_exercise_logs
  -- ON DELETE CASCADE on workout_variation_records
  DELETE FROM public.variations
  WHERE id = target_variation.id;

  -- === Clean up orphan exercise ===
  IF NOT EXISTS (
    SELECT 1
    FROM public.variations v
    WHERE v.exercise_id = target_variation.exercise_id
      AND v.user_id = target_user_id
  ) THEN
    DELETE FROM public.exercises e
    WHERE e.id = target_variation.exercise_id
      AND e.user_id = target_user_id;
  END IF;
END;
$$;


ALTER FUNCTION "public"."delete_exercise_variation"("p_variation_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."delete_exercise_variation"("p_user_id" "uuid", "p_variation_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  actor_id uuid;
  target_variation public.variations%rowtype;
begin
  actor_id := auth.uid();

  if actor_id is null then
    raise exception 'Authentication required';
  end if;

  if p_user_id is null then
    raise exception 'user_id is required';
  end if;

  if p_variation_id is null then
    raise exception 'variation_id is required';
  end if;

  if not (
    actor_id = p_user_id
    or public.is_active_coach_of(actor_id, p_user_id)
  ) then
    raise exception 'Not authorized to manage records for this user';
  end if;

  select *
  into target_variation
  from public.variations v
  where v.id = p_variation_id
    and v.user_id = p_user_id
  for update;

  if not found then
    raise exception 'Variation not found for target user';
  end if;

  delete from public.variations
  where id = target_variation.id;

  if not exists (
    select 1
    from public.variations v
    where v.exercise_id = target_variation.exercise_id
      and v.user_id = p_user_id
  ) then
    delete from public.exercises e
    where e.id = target_variation.exercise_id
      and e.user_id = p_user_id;
  end if;
end;
$$;


ALTER FUNCTION "public"."delete_exercise_variation"("p_user_id" "uuid", "p_variation_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."delete_folder"("p_folder_id" "uuid", "p_mode" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  actor_id uuid;
  folder_owner uuid;
BEGIN
  actor_id := auth.uid();

  IF actor_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF p_mode NOT IN ('move_to_root', 'delete_contents') THEN
    RAISE EXCEPTION 'BUSINESS: Modo de exclusão inválido';
  END IF;

  SELECT user_id INTO folder_owner
  FROM public.workout_folders
  WHERE id = p_folder_id;

  IF folder_owner IS NULL THEN
    RAISE EXCEPTION 'BUSINESS: Pasta não encontrada';
  END IF;

  IF NOT (
    actor_id = folder_owner
    OR public.is_active_coach_of(actor_id, folder_owner)
  ) THEN
    RAISE EXCEPTION 'Not authorized to delete this folder';
  END IF;

  IF p_mode = 'move_to_root' THEN
    UPDATE public.workouts SET folder_id = NULL WHERE folder_id = p_folder_id;
  ELSE
    DELETE FROM public.workouts WHERE folder_id = p_folder_id;
  END IF;

  DELETE FROM public.workout_folders WHERE id = p_folder_id;
END;
$$;


ALTER FUNCTION "public"."delete_folder"("p_folder_id" "uuid", "p_mode" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."dispatch_variation_video_transcode"("p_variation_id" "uuid") RETURNS bigint
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'extensions', 'vault'
    AS $$
DECLARE
  v_url text;
  v_secret text;
  v_request_id bigint;
BEGIN
  SELECT decrypted_secret INTO v_url
    FROM vault.decrypted_secrets WHERE name = 'transcode_webhook_url';
  SELECT decrypted_secret INTO v_secret
    FROM vault.decrypted_secrets WHERE name = 'transcode_webhook_secret';

  IF v_url IS NULL OR v_secret IS NULL THEN
    RAISE WARNING 'transcode webhook vault secrets missing — dispatch skipped (variation_id=%)', p_variation_id;
    RETURN NULL;
  END IF;

  SELECT net.http_post(
    url := v_url,
    headers := jsonb_build_object(
      'content-type', 'application/json',
      'x-internal-secret', v_secret
    ),
    body := jsonb_build_object('variation_id', p_variation_id),
    timeout_milliseconds := 5000
  ) INTO v_request_id;

  UPDATE public.variation_videos
    SET last_dispatched_at = now()
    WHERE variation_id = p_variation_id;

  RETURN v_request_id;
END $$;


ALTER FUNCTION "public"."dispatch_variation_video_transcode"("p_variation_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."enforce_workout_folder_same_owner"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF NEW.folder_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.workout_folders f
      WHERE f.id = NEW.folder_id AND f.user_id = NEW.user_id
    ) THEN
      RAISE EXCEPTION 'BUSINESS: Pasta pertence a outro usuário';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."enforce_workout_folder_same_owner"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."enqueue_variation_video_deletion"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pgmq'
    AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM pgmq.send('r2_deletions', jsonb_build_object(
      'object_key', OLD.object_key,
      'thumbnail_key', OLD.thumbnail_key
    ));
    RETURN OLD;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF OLD.object_key IS DISTINCT FROM NEW.object_key THEN
      PERFORM pgmq.send('r2_deletions', jsonb_build_object(
        'object_key', OLD.object_key,
        'thumbnail_key', NULL
      ));
    END IF;
    IF OLD.thumbnail_key IS DISTINCT FROM NEW.thumbnail_key
       AND OLD.thumbnail_key IS NOT NULL THEN
      PERFORM pgmq.send('r2_deletions', jsonb_build_object(
        'object_key', OLD.thumbnail_key,
        'thumbnail_key', NULL
      ));
    END IF;
  END IF;

  RETURN NEW;
END $$;


ALTER FUNCTION "public"."enqueue_variation_video_deletion"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."expand_muscle_ids"("p_muscle_ids" "uuid"[]) RETURNS TABLE("id" "uuid")
    LANGUAGE "sql" STABLE
    SET "search_path" TO 'public'
    AS $$
  WITH RECURSIVE descendants AS (
    SELECT m.id FROM muscles m WHERE m.id = ANY(p_muscle_ids)
    UNION
    SELECT m.id FROM muscles m JOIN descendants d ON m.parent_id = d.id
  )
  SELECT d.id FROM descendants d;
$$;


ALTER FUNCTION "public"."expand_muscle_ids"("p_muscle_ids" "uuid"[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_coach_athlete_metrics"("p_coach_id" "uuid", "p_days" integer DEFAULT 30) RETURNS TABLE("user_id" "uuid", "session_count" integer, "avg_duration_seconds" numeric, "session_dates" timestamp with time zone[])
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  SELECT
    wl.user_id,
    COUNT(*)::integer AS session_count,
    AVG(EXTRACT(EPOCH FROM (wl.finished_at - wl.started_at)))::numeric AS avg_duration_seconds,
    array_agg(wl.started_at ORDER BY wl.started_at) AS session_dates
  FROM public.workout_logs wl
  WHERE wl.user_id IN (
    SELECT ca.athlete_id
    FROM public.coach_athletes ca
    WHERE ca.coach_id = p_coach_id
      AND ca.status = 'active'
  )
    AND wl.started_at >= (now() - (p_days || ' days')::interval)
    AND wl.deleted_at IS NULL
  GROUP BY wl.user_id;
$$;


ALTER FUNCTION "public"."get_coach_athlete_metrics"("p_coach_id" "uuid", "p_days" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_coach_occupied_slots"("p_coach_id" "uuid", "p_start_date" "date", "p_end_date" "date", "p_timezone" "text" DEFAULT 'America/Sao_Paulo'::"text") RETURNS TABLE("scheduled_at" timestamp with time zone, "duration_minutes" smallint)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    AS $$
  -- Materialized sessions (already have correct timestamptz)
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
  -- Virtual recurring projections (not yet materialized)
    SELECT ((d::date + crs.start_time) AT TIME ZONE p_timezone),
           crs.duration_minutes
    FROM public.coach_recurring_schedules crs
    JOIN public.profiles p ON crs.athlete_id = p.id
    CROSS JOIN generate_series(p_start_date, p_end_date - 1, interval '1 day') d
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


ALTER FUNCTION "public"."get_coach_occupied_slots"("p_coach_id" "uuid", "p_start_date" "date", "p_end_date" "date", "p_timezone" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_coach_testimonial_stats"("p_coach_id" "uuid") RETURNS TABLE("testimonial_count" bigint, "average_rating" numeric)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT
    count(*)::bigint AS testimonial_count,
    avg(rating)::numeric AS average_rating
  FROM public.coach_testimonials
  WHERE coach_id = p_coach_id;
$$;


ALTER FUNCTION "public"."get_coach_testimonial_stats"("p_coach_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_previous_workout_log_for_summary"("p_user_id" "uuid", "p_workout_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_result jsonb;
  v_actor_id uuid := (SELECT auth.uid());
BEGIN
  IF p_workout_id IS NULL THEN
    RETURN NULL;
  END IF;

  IF p_user_id <> v_actor_id
    AND NOT public.is_active_coach_of(v_actor_id, p_user_id) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT jsonb_build_object(
    'workoutLogId', wl.id,
    'workoutId', wl.workout_id,
    'startedAt', wl.started_at,
    'finishedAt', wl.finished_at,
    'exercises',
    COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'variationId', wel.variation_id,
            'exerciseName', COALESCE(vv.exercise_name, wel.exercise_name),
            'variationName', COALESCE(vv.name, wel.variation_name),
            'equipmentName', vv.equipment_name,
            'equipmentPreposition', vv.equipment_preposition,
            'position', wel.position,
            'supersetGroupId', wel.superset_group_id,
            'sets',
            COALESCE(
              (
                SELECT jsonb_agg(
                  jsonb_build_object(
                    'setOrder', wesl.set_order,
                    'setType', wesl.set_type,
                    'weightKg', wesl.weight_kg,
                    'reps', wesl.reps
                  )
                  ORDER BY wesl.set_order ASC, wesl.id ASC
                )
                FROM public.workout_exercise_set_logs wesl
                WHERE wesl.workout_exercise_log_id = wel.id
              ),
              '[]'::jsonb
            )
          )
          ORDER BY wel.position ASC, wel.id ASC
        )
        FROM public.workout_exercise_logs wel
        LEFT JOIN public.variations_view vv ON vv.id = wel.variation_id
        WHERE wel.workout_log_id = wl.id
      ),
      '[]'::jsonb
    )
  )
  INTO v_result
  FROM public.workout_logs wl
  WHERE wl.user_id = p_user_id
    AND wl.workout_id = p_workout_id
    AND wl.deleted_at IS NULL
  ORDER BY wl.finished_at DESC
  LIMIT 1;

  RETURN v_result;
END;
$$;


ALTER FUNCTION "public"."get_previous_workout_log_for_summary"("p_user_id" "uuid", "p_workout_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_previous_workout_sets"("p_user_id" "uuid", "p_variation_ids" "uuid"[]) RETURNS TABLE("variation_id" "uuid", "set_type" "text", "set_order" integer, "reps" integer, "weight_kg" numeric)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF p_user_id <> (SELECT auth.uid()) AND NOT public.is_active_coach_of((SELECT auth.uid()), p_user_id) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  RETURN QUERY
  WITH latest_exec AS (
    SELECT DISTINCT ON (wel.variation_id)
      wel.variation_id,
      wel.id AS exercise_log_id
    FROM workout_logs wl
    JOIN workout_exercise_logs wel ON wel.workout_log_id = wl.id
    WHERE wl.user_id = p_user_id
      AND wl.deleted_at IS NULL
      AND wel.variation_id = ANY(p_variation_ids)
    ORDER BY wel.variation_id, wl.finished_at DESC
  )
  SELECT
    le.variation_id,
    wesl.set_type,
    wesl.set_order,
    wesl.reps,
    wesl.weight_kg
  FROM latest_exec le
  JOIN workout_exercise_set_logs wesl ON wesl.workout_exercise_log_id = le.exercise_log_id
  ORDER BY le.variation_id, wesl.set_order;
END;
$$;


ALTER FUNCTION "public"."get_previous_workout_sets"("p_user_id" "uuid", "p_variation_ids" "uuid"[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_summary_recalculation_context"("p_user_id" "uuid", "p_started_at" timestamp with time zone) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT COALESCE(jsonb_agg(log_data ORDER BY log_data->>'startedAt' ASC), '[]'::jsonb)
  INTO v_result
  FROM (
    SELECT jsonb_build_object(
      'logId', wl.id,
      'workoutId', wl.workout_id,
      'startedAt', wl.started_at,
      'currentSnapshot', wls.summary_snapshot,
      'variationIds', COALESCE(
        (
          SELECT jsonb_agg(DISTINCT wel.variation_id)
          FROM public.workout_exercise_logs wel
          WHERE wel.workout_log_id = wl.id
            AND wel.variation_id IS NOT NULL
        ),
        '[]'::jsonb
      ),
      'previousWorkoutLog', CASE
        WHEN wl.workout_id IS NULL THEN NULL
        ELSE (
          SELECT jsonb_build_object(
            'workoutLogId', prev_wl.id,
            'workoutId', prev_wl.workout_id,
            'startedAt', prev_wl.started_at,
            'finishedAt', prev_wl.finished_at,
            'exercises', COALESCE(
              (
                SELECT jsonb_agg(
                  jsonb_build_object(
                    'variationId', prev_wel.variation_id,
                    'exerciseName', COALESCE(prev_vv.exercise_name, prev_wel.exercise_name),
                    'variationName', COALESCE(prev_vv.name, prev_wel.variation_name),
                    'equipmentName', prev_vv.equipment_name,
                    'equipmentPreposition', prev_vv.equipment_preposition,
                    'position', prev_wel.position,
                    'supersetGroupId', prev_wel.superset_group_id,
                    'sets', COALESCE(
                      (
                        SELECT jsonb_agg(
                          jsonb_build_object(
                            'setOrder', prev_wesl.set_order,
                            'setType', prev_wesl.set_type,
                            'weightKg', prev_wesl.weight_kg,
                            'reps', prev_wesl.reps
                          )
                          ORDER BY prev_wesl.set_order ASC, prev_wesl.id ASC
                        )
                        FROM public.workout_exercise_set_logs prev_wesl
                        WHERE prev_wesl.workout_exercise_log_id = prev_wel.id
                      ),
                      '[]'::jsonb
                    )
                  )
                  ORDER BY prev_wel.position ASC, prev_wel.id ASC
                )
                FROM public.workout_exercise_logs prev_wel
                LEFT JOIN public.variations_view prev_vv ON prev_vv.id = prev_wel.variation_id
                WHERE prev_wel.workout_log_id = prev_wl.id
              ),
              '[]'::jsonb
            )
          )
          FROM public.workout_logs prev_wl
          WHERE prev_wl.user_id = p_user_id
            AND prev_wl.workout_id = wl.workout_id
            AND prev_wl.deleted_at IS NULL
            AND prev_wl.finished_at < wl.finished_at
          ORDER BY prev_wl.finished_at DESC
          LIMIT 1
        )
      END,
      'variationRecords', COALESCE(
        (
          SELECT jsonb_agg(
            jsonb_build_object(
              'variationId', wvr.variation_id,
              'maxWeightKg', wvr.max_weight_kg,
              'maxVolumeKg', wvr.max_volume_kg,
              'maxReps', wvr.max_reps,
              'maxSets', wvr.max_sets
            )
          )
          FROM public.workout_variation_records wvr
          WHERE wvr.user_id = p_user_id
            AND wvr.variation_id IN (
              SELECT DISTINCT wel2.variation_id
              FROM public.workout_exercise_logs wel2
              WHERE wel2.workout_log_id = wl.id
                AND wel2.variation_id IS NOT NULL
            )
        ),
        '[]'::jsonb
      )
    ) AS log_data
    FROM public.workout_logs wl
    JOIN public.workout_log_summaries wls ON wls.workout_log_id = wl.id
    WHERE wl.user_id = p_user_id
      AND wl.deleted_at IS NULL
      AND wl.started_at > p_started_at
  ) sub;

  RETURN v_result;
END;
$$;


ALTER FUNCTION "public"."get_summary_recalculation_context"("p_user_id" "uuid", "p_started_at" timestamp with time zone) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_variation_history"("p_user_id" "uuid", "p_variation_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  actor_id uuid;
  v_variation jsonb;
  v_sessions jsonb;
BEGIN
  actor_id := auth.uid();

  IF actor_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF p_user_id <> actor_id
     AND NOT public.is_active_coach_of(actor_id, p_user_id) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  SELECT jsonb_build_object(
    'exercise_name', e.name,
    'variation_name', v.name,
    'equipment_name', eq.name,
    'equipment_preposition', eq.preposition,
    'muscle_slug', m.slug,
    'secondary_muscle_slug', sm.slug,
    'youtube_url', v.video_url,
    'uploaded_video_object_key', vv.object_key,
    'uploaded_video_user_id', CASE WHEN vv.object_key IS NULL THEN NULL ELSE v.user_id END
  )
  INTO v_variation
  FROM public.variations v
  JOIN public.exercises e ON e.id = v.exercise_id
  JOIN public.equipments eq ON eq.id = v.equipment_id
  JOIN public.muscles m ON m.id = v.muscle_id
  LEFT JOIN public.muscles sm ON sm.id = v.secondary_muscle_id
  LEFT JOIN public.variation_videos vv ON vv.variation_id = v.id
  WHERE v.id = p_variation_id;

  IF v_variation IS NULL THEN
    RAISE EXCEPTION 'Variation not found' USING ERRCODE = 'P0002';
  END IF;

  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'workout_log_id', s.workout_log_id,
        'started_at', s.started_at,
        'max_weight_kg', s.max_weight_kg,
        'total_volume_kg', s.total_volume_kg,
        'max_reps', s.max_reps,
        'total_sets', s.total_sets,
        'sets', s.sets
      ) ORDER BY s.started_at ASC
    ),
    '[]'::jsonb
  )
  INTO v_sessions
  FROM (
    SELECT
      wl.id AS workout_log_id,
      wl.started_at,
      MAX(wesl.weight_kg) FILTER (WHERE wesl.set_type <> 'warmup') AS max_weight_kg,
      COALESCE(SUM(wesl.weight_kg * wesl.reps) FILTER (WHERE wesl.set_type <> 'warmup'), 0) AS total_volume_kg,
      MAX(wesl.reps) FILTER (WHERE wesl.set_type <> 'warmup') AS max_reps,
      COUNT(*) FILTER (WHERE wesl.set_type <> 'warmup')::integer AS total_sets,
      jsonb_agg(
        jsonb_build_object(
          'set_order', wesl.set_order,
          'set_type', wesl.set_type,
          'weight_kg', wesl.weight_kg,
          'reps', wesl.reps,
          'reps_min', wesl.reps_min,
          'reps_max', wesl.reps_max
        ) ORDER BY wesl.set_order
      ) AS sets
    FROM public.workout_logs wl
    JOIN public.workout_exercise_logs wel ON wel.workout_log_id = wl.id
    JOIN public.workout_exercise_set_logs wesl ON wesl.workout_exercise_log_id = wel.id
    WHERE wl.user_id = p_user_id
      AND wel.variation_id = p_variation_id
      AND wl.deleted_at IS NULL
    GROUP BY wl.id, wl.started_at
    ORDER BY wl.started_at DESC
    LIMIT 10
  ) s;

  RETURN jsonb_build_object(
    'variation', v_variation,
    'sessions', v_sessions
  );
END;
$$;


ALTER FUNCTION "public"."get_variation_history"("p_user_id" "uuid", "p_variation_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_variation_last"("p_user_id" "uuid", "p_variation_id" "uuid" DEFAULT NULL::"uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  actor_id uuid;
  v_result jsonb;
BEGIN
  actor_id := auth.uid();

  IF actor_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF p_user_id <> actor_id
     AND NOT public.is_active_coach_of(actor_id, p_user_id) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  WITH session_stats AS (
    SELECT
      wel.variation_id AS variation_id,
      wl.id AS workout_log_id,
      wl.started_at,
      MAX(wesl.weight_kg) FILTER (WHERE wesl.set_type <> 'warmup') AS max_weight_kg,
      COALESCE(SUM(wesl.weight_kg * wesl.reps) FILTER (WHERE wesl.set_type <> 'warmup'), 0) AS total_volume_kg,
      MAX(wesl.reps) FILTER (WHERE wesl.set_type <> 'warmup') AS max_reps,
      COUNT(*) FILTER (WHERE wesl.set_type <> 'warmup')::integer AS total_sets,
      jsonb_agg(
        jsonb_build_object(
          'set_order', wesl.set_order,
          'set_type', wesl.set_type,
          'weight_kg', wesl.weight_kg,
          'reps', wesl.reps,
          'reps_min', wesl.reps_min,
          'reps_max', wesl.reps_max
        ) ORDER BY wesl.set_order
      ) AS sets,
      row_number() OVER (
        PARTITION BY wel.variation_id
        ORDER BY wl.started_at DESC, wl.id DESC
      ) AS rn
    FROM public.workout_logs wl
    JOIN public.workout_exercise_logs wel ON wel.workout_log_id = wl.id
    JOIN public.workout_exercise_set_logs wesl ON wesl.workout_exercise_log_id = wel.id
    WHERE wl.user_id = p_user_id
      AND wl.deleted_at IS NULL
      AND (p_variation_id IS NULL OR wel.variation_id = p_variation_id)
    GROUP BY wel.variation_id, wl.id, wl.started_at
  )
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'variation_id', v.id,
        'variation', jsonb_build_object(
          'exercise_name', e.name,
          'variation_name', v.name,
          'equipment_name', eq.name,
          'equipment_preposition', eq.preposition,
          'muscle_slug', m.slug,
          'secondary_muscle_slug', sm.slug,
          'youtube_url', v.video_url,
          'uploaded_video_object_key', vv.object_key,
          'uploaded_video_user_id', CASE WHEN vv.object_key IS NULL THEN NULL ELSE v.user_id END
        ),
        'session', CASE
          WHEN ss.workout_log_id IS NULL THEN NULL
          ELSE jsonb_build_object(
            'workout_log_id', ss.workout_log_id,
            'started_at', ss.started_at,
            'max_weight_kg', ss.max_weight_kg,
            'total_volume_kg', ss.total_volume_kg,
            'max_reps', ss.max_reps,
            'total_sets', ss.total_sets,
            'sets', ss.sets
          )
        END
      ) ORDER BY e.name, v.name NULLS FIRST
    ),
    '[]'::jsonb
  )
  INTO v_result
  FROM public.variations v
  JOIN public.exercises e ON e.id = v.exercise_id
  JOIN public.equipments eq ON eq.id = v.equipment_id
  JOIN public.muscles m ON m.id = v.muscle_id
  LEFT JOIN public.muscles sm ON sm.id = v.secondary_muscle_id
  LEFT JOIN public.variation_videos vv ON vv.variation_id = v.id
  LEFT JOIN session_stats ss ON ss.variation_id = v.id AND ss.rn = 1
  WHERE (p_variation_id IS NULL AND ss.workout_log_id IS NOT NULL)
     OR (p_variation_id IS NOT NULL AND v.id = p_variation_id);

  RETURN v_result;
END;
$$;


ALTER FUNCTION "public"."get_variation_last"("p_user_id" "uuid", "p_variation_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_variation_progress"("p_user_id" "uuid", "p_variation_id" "uuid" DEFAULT NULL::"uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  actor_id uuid;
  v_result jsonb;
BEGIN
  actor_id := auth.uid();

  IF actor_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF p_user_id <> actor_id
     AND NOT public.is_active_coach_of(actor_id, p_user_id) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  WITH session_stats AS (
    SELECT
      wel.variation_id AS variation_id,
      wl.id AS workout_log_id,
      wl.started_at,
      MAX(wesl.weight_kg) FILTER (WHERE wesl.set_type <> 'warmup') AS max_weight_kg,
      COALESCE(SUM(wesl.weight_kg * wesl.reps) FILTER (WHERE wesl.set_type <> 'warmup'), 0) AS total_volume_kg,
      MAX(wesl.reps) FILTER (WHERE wesl.set_type <> 'warmup') AS max_reps,
      COUNT(*) FILTER (WHERE wesl.set_type <> 'warmup')::integer AS total_sets,
      jsonb_agg(
        jsonb_build_object(
          'set_order', wesl.set_order,
          'set_type', wesl.set_type,
          'weight_kg', wesl.weight_kg,
          'reps', wesl.reps,
          'reps_min', wesl.reps_min,
          'reps_max', wesl.reps_max
        ) ORDER BY wesl.set_order
      ) AS sets,
      row_number() OVER (
        PARTITION BY wel.variation_id
        ORDER BY wl.started_at DESC, wl.id DESC
      ) AS rn
    FROM public.workout_logs wl
    JOIN public.workout_exercise_logs wel ON wel.workout_log_id = wl.id
    JOIN public.workout_exercise_set_logs wesl ON wesl.workout_exercise_log_id = wel.id
    WHERE wl.user_id = p_user_id
      AND wl.deleted_at IS NULL
      AND (p_variation_id IS NULL OR wel.variation_id = p_variation_id)
    GROUP BY wel.variation_id, wl.id, wl.started_at
  ),
  per_variation AS (
    SELECT
      ss.variation_id,
      jsonb_agg(
        jsonb_build_object(
          'workout_log_id', ss.workout_log_id,
          'started_at', ss.started_at,
          'max_weight_kg', ss.max_weight_kg,
          'total_volume_kg', ss.total_volume_kg,
          'max_reps', ss.max_reps,
          'total_sets', ss.total_sets,
          'sets', ss.sets
        ) ORDER BY ss.started_at ASC
      ) AS sessions
    FROM session_stats ss
    WHERE ss.rn <= 10
    GROUP BY ss.variation_id
  )
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'variation_id', v.id,
        'variation', jsonb_build_object(
          'exercise_name', e.name,
          'variation_name', v.name,
          'equipment_name', eq.name,
          'equipment_preposition', eq.preposition,
          'muscle_slug', m.slug,
          'secondary_muscle_slug', sm.slug,
          'youtube_url', v.video_url,
          'uploaded_video_object_key', vv.object_key,
          'uploaded_video_user_id', CASE WHEN vv.object_key IS NULL THEN NULL ELSE v.user_id END
        ),
        'sessions', COALESCE(pv.sessions, '[]'::jsonb)
      ) ORDER BY e.name, v.name NULLS FIRST
    ),
    '[]'::jsonb
  )
  INTO v_result
  FROM public.variations v
  JOIN public.exercises e ON e.id = v.exercise_id
  JOIN public.equipments eq ON eq.id = v.equipment_id
  JOIN public.muscles m ON m.id = v.muscle_id
  LEFT JOIN public.muscles sm ON sm.id = v.secondary_muscle_id
  LEFT JOIN public.variation_videos vv ON vv.variation_id = v.id
  LEFT JOIN per_variation pv ON pv.variation_id = v.id
  WHERE (p_variation_id IS NULL AND pv.variation_id IS NOT NULL)
     OR (p_variation_id IS NOT NULL AND v.id = p_variation_id);

  RETURN v_result;
END;
$$;


ALTER FUNCTION "public"."get_variation_progress"("p_user_id" "uuid", "p_variation_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_variation_records"("p_user_id" "uuid", "p_variation_id" "uuid" DEFAULT NULL::"uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  actor_id uuid;
  v_result jsonb;
BEGIN
  actor_id := auth.uid();

  IF actor_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF p_user_id <> actor_id
     AND NOT public.is_active_coach_of(actor_id, p_user_id) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'variation_id', v.id,
        'variation', jsonb_build_object(
          'exercise_name', e.name,
          'variation_name', v.name,
          'equipment_name', eq.name,
          'equipment_preposition', eq.preposition,
          'muscle_slug', m.slug,
          'secondary_muscle_slug', sm.slug,
          'youtube_url', v.video_url,
          'uploaded_video_object_key', vv.object_key,
          'uploaded_video_user_id', CASE WHEN vv.object_key IS NULL THEN NULL ELSE v.user_id END
        ),
        'records', jsonb_build_object(
          'max_weight_kg', wvr.max_weight_kg,
          'max_volume_kg', wvr.max_volume_kg,
          'max_reps', wvr.max_reps,
          'max_sets', wvr.max_sets
        )
      ) ORDER BY e.name, v.name NULLS FIRST
    ),
    '[]'::jsonb
  )
  INTO v_result
  FROM public.variations v
  JOIN public.exercises e ON e.id = v.exercise_id
  JOIN public.equipments eq ON eq.id = v.equipment_id
  JOIN public.muscles m ON m.id = v.muscle_id
  LEFT JOIN public.muscles sm ON sm.id = v.secondary_muscle_id
  LEFT JOIN public.variation_videos vv ON vv.variation_id = v.id
  LEFT JOIN public.workout_variation_records wvr
    ON wvr.variation_id = v.id AND wvr.user_id = p_user_id
  WHERE (p_variation_id IS NULL AND wvr.variation_id IS NOT NULL)
     OR (p_variation_id IS NOT NULL AND v.id = p_variation_id);

  RETURN v_result;
END;
$$;


ALTER FUNCTION "public"."get_variation_records"("p_user_id" "uuid", "p_variation_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_variation_usage"("p_variation_id" "uuid") RETURNS TABLE("workout_id" "uuid", "workout_name" "text", "is_superset" boolean, "superset_partners" "text"[])
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  actor_id uuid;
  target_variation public.variations%rowtype;
  target_user_id uuid;
BEGIN
  actor_id := auth.uid();

  IF actor_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT * INTO target_variation
  FROM public.variations v
  WHERE v.id = p_variation_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Variation not found';
  END IF;

  target_user_id := target_variation.user_id;

  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'Variation does not belong to a target user';
  END IF;

  IF NOT (
    actor_id = target_user_id
    OR public.is_active_coach_of(actor_id, target_user_id)
  ) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  RETURN QUERY
  WITH target_exercises AS (
    SELECT we.workout_id, we.superset_group_id
    FROM public.workout_exercises we
    WHERE we.variation_id = p_variation_id
  ),
  superset_check AS (
    SELECT
      te.workout_id,
      te.superset_group_id,
      (SELECT COUNT(*)
       FROM public.workout_exercises we2
       WHERE we2.workout_id = te.workout_id
         AND we2.superset_group_id = te.superset_group_id
      ) > 1 AS is_in_superset
    FROM target_exercises te
  ),
  with_partners AS (
    SELECT
      sc.workout_id,
      sc.is_in_superset,
      COALESCE(
        ARRAY_AGG(DISTINCT e.name ORDER BY e.name) FILTER (WHERE we2.variation_id != p_variation_id),
        ARRAY[]::text[]
      ) AS partner_names
    FROM superset_check sc
    LEFT JOIN public.workout_exercises we2
      ON sc.is_in_superset
      AND we2.workout_id = sc.workout_id
      AND we2.superset_group_id = sc.superset_group_id
      AND we2.variation_id != p_variation_id
    LEFT JOIN public.variations v ON v.id = we2.variation_id
    LEFT JOIN public.exercises e ON e.id = v.exercise_id
    GROUP BY sc.workout_id, sc.is_in_superset
  )
  SELECT DISTINCT ON (wp.workout_id)
    w.id AS workout_id,
    w.name AS workout_name,
    wp.is_in_superset AS is_superset,
    wp.partner_names AS superset_partners
  FROM with_partners wp
  JOIN public.workouts w ON w.id = wp.workout_id

  UNION ALL

  -- Preparatory exercises (never supersets, only if not already listed)
  SELECT DISTINCT
    w.id AS workout_id,
    w.name AS workout_name,
    false AS is_superset,
    ARRAY[]::text[] AS superset_partners
  FROM public.workout_preparatory_exercises wpe
  JOIN public.workouts w ON w.id = wpe.workout_id
  WHERE wpe.variation_id = p_variation_id
    AND NOT EXISTS (
      SELECT 1 FROM public.workout_exercises we
      WHERE we.variation_id = p_variation_id AND we.workout_id = w.id
    );
END;
$$;


ALTER FUNCTION "public"."get_variation_usage"("p_variation_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_workout"("p_workout_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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
      'folder_id', w.folder_id,
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
            'video_object_key', vv.object_key,
            'video_thumbnail_key', vv.thumbnail_key,
            'video_duration_seconds', vv.duration_seconds,
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
        LEFT JOIN public.variation_videos vv ON vv.variation_id = v.id
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
            'video_url', v.video_url,
            'video_object_key', vv.object_key,
            'video_thumbnail_key', vv.thumbnail_key,
            'video_duration_seconds', vv.duration_seconds,
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
        LEFT JOIN public.variation_videos vv ON vv.variation_id = v.id
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
$$;


ALTER FUNCTION "public"."get_workout"("p_workout_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_workout_log_summary"("p_workout_log_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_summary jsonb;
BEGIN
  SELECT wls.summary_snapshot
  INTO v_summary
  FROM public.workout_log_summaries wls
  JOIN public.workout_logs wl ON wl.id = wls.workout_log_id
  WHERE wls.workout_log_id = p_workout_log_id
    AND (
      wl.user_id = (SELECT auth.uid())
      OR public.is_active_coach_of((SELECT auth.uid()), wl.user_id)
    )
    AND wl.deleted_at IS NULL;

  RETURN v_summary;
END;
$$;


ALTER FUNCTION "public"."get_workout_log_summary"("p_workout_log_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_workout_variation_records"("p_user_id" "uuid", "p_variation_ids" "uuid"[]) RETURNS TABLE("variation_id" "uuid", "max_weight_kg" numeric, "max_volume_kg" numeric, "max_reps" integer, "max_sets" integer)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_actor_id uuid := (SELECT auth.uid());
BEGIN
  IF p_user_id <> v_actor_id
    AND NOT public.is_active_coach_of(v_actor_id, p_user_id) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  RETURN QUERY
  SELECT
    wvr.variation_id,
    wvr.max_weight_kg,
    wvr.max_volume_kg,
    wvr.max_reps,
    wvr.max_sets
  FROM public.workout_variation_records wvr
  WHERE wvr.user_id = p_user_id
    AND wvr.variation_id = ANY(p_variation_ids);
END;
$$;


ALTER FUNCTION "public"."get_workout_variation_records"("p_user_id" "uuid", "p_variation_ids" "uuid"[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."guard_notification_update"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF NEW.recipient_user_id <> OLD.recipient_user_id
     OR NEW.sender_user_id IS DISTINCT FROM OLD.sender_user_id
     OR NEW.type <> OLD.type
     OR NEW.title <> OLD.title
     OR NEW.message <> OLD.message
     OR NEW.metadata <> OLD.metadata
     OR NEW.created_at <> OLD.created_at THEN
    RAISE EXCEPTION 'Only read state and action state can be updated';
  END IF;

  IF NEW.is_read THEN
    NEW.read_at = COALESCE(NEW.read_at, now());
  ELSE
    NEW.read_at = NULL;
  END IF;

  IF NEW.action_taken IS NOT NULL AND OLD.action_taken IS NOT NULL THEN
    RAISE EXCEPTION 'Action already taken on this notification';
  END IF;

  IF NEW.action_taken IS NOT NULL THEN
    NEW.action_taken_at = COALESCE(NEW.action_taken_at, now());
  END IF;

  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."guard_notification_update"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."guard_profile_role_transition"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  if old.role = 'coach' and new.role = 'athlete' then
    if exists (
      select 1
      from public.coach_athletes ca
      where ca.coach_id = old.id
        and ca.status = 'active'
    ) then
      raise exception 'Cannot change role while coach has active athletes';
end if;
end if;

  new.updated_at = now();
return new;
end;
$$;


ALTER FUNCTION "public"."guard_profile_role_transition"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."guard_report_favorite_update"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF NEW.user_id <> OLD.user_id
     OR NEW.target_user_id <> OLD.target_user_id
     OR NEW.filters <> OLD.filters
     OR NEW.created_at <> OLD.created_at THEN
    RAISE EXCEPTION 'Only name and notes can be updated';
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."guard_report_favorite_update"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."guard_workout_log_soft_delete"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF NEW.user_id      IS DISTINCT FROM OLD.user_id
  OR (NEW.workout_id  IS DISTINCT FROM OLD.workout_id AND NEW.workout_id IS NOT NULL)
  OR NEW.started_at   IS DISTINCT FROM OLD.started_at
  OR NEW.finished_at  IS DISTINCT FROM OLD.finished_at
  OR NEW.started_by   IS DISTINCT FROM OLD.started_by
  THEN
    RAISE EXCEPTION 'Only deleted_at and deleted_by may be updated on workout_logs';
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."guard_workout_log_soft_delete"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_subscription"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
  INSERT INTO public.subscriptions (user_id, plan_id, source)
  VALUES (NEW.id, 'free', 'self');
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_subscription"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
insert into public.profiles (id, full_name, avatar_url, role)
values (
           new.id,
           new.raw_user_meta_data->>'full_name',
           new.raw_user_meta_data->>'avatar_url',
           case
               when lower(coalesce(new.raw_user_meta_data->>'role', '')) in ('coach', 'athlete')
                   then (lower(new.raw_user_meta_data->>'role'))::public.user_role
      else 'athlete'::public.user_role
    end
       )
    on conflict (id) do update
                            set full_name = excluded.full_name,
                            avatar_url = excluded.avatar_url,
                            role = excluded.role;

return new;
end;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."insert_workout_log"("payload" "jsonb") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_log_id UUID;
  v_user_id UUID;
  v_actor_id UUID := (SELECT auth.uid());
BEGIN
  v_user_id := (payload->>'userId')::UUID;

  IF v_user_id <> v_actor_id
    AND NOT public.is_active_coach_of(v_actor_id, v_user_id) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  INSERT INTO public.workout_logs (
    workout_id, user_id, started_by, started_at, finished_at, note,
    coach_session_id, is_coached
  )
  VALUES (
    NULLIF(payload->>'workoutId', '')::UUID,
    v_user_id,
    v_actor_id,
    (payload->>'startedAt')::TIMESTAMPTZ,
    (payload->>'finishedAt')::TIMESTAMPTZ,
    NULLIF(TRIM(payload->>'note'), ''),
    NULLIF(payload->>'coachSessionId', '')::UUID,
    COALESCE((payload->>'isCoached')::BOOLEAN, FALSE)
  )
  RETURNING id INTO v_log_id;

  IF NULLIF(payload->>'coachSessionId', '') IS NOT NULL THEN
    UPDATE public.coach_sessions
    SET workout_log_id = v_log_id, status = 'completed'
    WHERE id = (payload->>'coachSessionId')::UUID;
  END IF;

  DROP TABLE IF EXISTS temp_exercises;
  CREATE TEMP TABLE temp_exercises AS
  SELECT
    ex.ordinality::INTEGER AS exercise_idx,
    (ex.value->>'variationId')::uuid AS variation_id,
    (ex.value->>'position')::INTEGER AS position,
    NULLIF(TRIM(ex.value->>'note'), '') AS note,
    NULLIF(ex.value->>'restSeconds', '')::INTEGER AS rest_seconds,
    (ex.value->>'supersetGroupId')::uuid AS superset_group_id,
    ex.value AS raw_ex
  FROM jsonb_array_elements(payload->'exercises') WITH ORDINALITY AS ex(value, ordinality);

  IF EXISTS (SELECT 1 FROM temp_exercises WHERE variation_id IS NULL) THEN
    RAISE EXCEPTION 'exercise variationId required';
  END IF;

  IF EXISTS (
    SELECT 1 FROM temp_exercises te
    WHERE NOT EXISTS (
      SELECT 1 FROM public.variations v WHERE v.id = te.variation_id
    )
  ) THEN
    RAISE EXCEPTION 'invalid variation_id';
  END IF;

  DROP TABLE IF EXISTS temp_sets;
  CREATE TEMP TABLE temp_sets AS
  SELECT
    te.exercise_idx, te.variation_id, te.position,
    (s->>'setOrder')::INTEGER AS set_order,
    s->>'setType' AS set_type,
    (s->>'weightKg')::NUMERIC(6,2) AS weight_kg,
    (s->>'reps')::INTEGER AS reps,
    (s->>'repsMin')::INTEGER AS reps_min,
    (s->>'repsMax')::INTEGER AS reps_max
  FROM temp_exercises te
  CROSS JOIN LATERAL jsonb_array_elements(te.raw_ex->'sets') s;

  IF EXISTS (
    SELECT 1 FROM temp_sets
    WHERE set_type IS NULL OR set_type NOT IN ('warmup', 'normal', 'drop', 'cluster')
  ) THEN
    RAISE EXCEPTION 'invalid set_type';
  END IF;

  IF EXISTS (SELECT 1 FROM temp_sets WHERE reps IS NOT NULL AND reps <= 0) THEN
    RAISE EXCEPTION 'reps must be > 0';
  END IF;

  INSERT INTO public.workout_exercise_logs (
    workout_log_id, variation_id, position, note, rest_seconds, superset_group_id
  )
  SELECT
    v_log_id, te.variation_id, te.position, te.note, te.rest_seconds, te.superset_group_id
  FROM temp_exercises te
  ORDER BY te.exercise_idx;

  UPDATE public.workout_exercise_logs wel
  SET exercise_name = e.name,
      variation_name = v.name
  FROM public.variations v
  JOIN public.exercises e ON e.id = v.exercise_id
  WHERE wel.workout_log_id = v_log_id
    AND wel.variation_id = v.id
    AND wel.exercise_name IS NULL;

  INSERT INTO public.workout_exercise_set_logs (
    workout_exercise_log_id, set_order, set_type, weight_kg, reps, reps_min, reps_max
  )
  SELECT
    wel.id, ts.set_order, ts.set_type, ts.weight_kg, ts.reps, ts.reps_min, ts.reps_max
  FROM temp_sets ts
  JOIN public.workout_exercise_logs wel
    ON wel.workout_log_id = v_log_id
   AND wel.variation_id = ts.variation_id
   AND wel.position = ts.position
  ORDER BY ts.exercise_idx, ts.set_order;

  RETURN v_log_id;
END;
$$;


ALTER FUNCTION "public"."insert_workout_log"("payload" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."insert_workout_log_with_summary"("payload" "jsonb", "summary_snapshot" "jsonb") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_log_id UUID;
  v_user_id UUID;
  v_summary_snapshot JSONB;
  v_actor_id UUID := (SELECT auth.uid());
BEGIN
  v_user_id := (payload->>'userId')::UUID;
  v_summary_snapshot := COALESCE(summary_snapshot, '{}'::jsonb);

  IF jsonb_typeof(v_summary_snapshot) <> 'object' THEN
    RAISE EXCEPTION 'summary_snapshot must be a JSON object';
  END IF;

  IF v_user_id <> v_actor_id
    AND NOT public.is_active_coach_of(v_actor_id, v_user_id) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  INSERT INTO public.workout_logs (
    workout_id, user_id, started_by, started_at, finished_at, note,
    coach_session_id, is_coached
  )
  VALUES (
    NULLIF(payload->>'workoutId', '')::UUID,
    v_user_id,
    v_actor_id,
    (payload->>'startedAt')::TIMESTAMPTZ,
    (payload->>'finishedAt')::TIMESTAMPTZ,
    NULLIF(TRIM(payload->>'note'), ''),
    NULLIF(payload->>'coachSessionId', '')::UUID,
    COALESCE((payload->>'isCoached')::BOOLEAN, FALSE)
  )
  RETURNING id INTO v_log_id;

  IF NULLIF(payload->>'coachSessionId', '') IS NOT NULL THEN
    UPDATE public.coach_sessions
    SET workout_log_id = v_log_id, status = 'completed'
    WHERE id = (payload->>'coachSessionId')::UUID;
  END IF;

  DROP TABLE IF EXISTS temp_exercises;
  CREATE TEMP TABLE temp_exercises AS
  SELECT
    ex.ordinality::INTEGER AS exercise_idx,
    (ex.value->>'variationId')::uuid AS variation_id,
    (ex.value->>'position')::INTEGER AS position,
    NULLIF(TRIM(ex.value->>'note'), '') AS note,
    NULLIF(ex.value->>'restSeconds', '')::INTEGER AS rest_seconds,
    (ex.value->>'supersetGroupId')::uuid AS superset_group_id,
    ex.value AS raw_ex
  FROM jsonb_array_elements(payload->'exercises') WITH ORDINALITY AS ex(value, ordinality);

  IF EXISTS (SELECT 1 FROM temp_exercises WHERE variation_id IS NULL) THEN
    RAISE EXCEPTION 'exercise variationId required';
  END IF;

  IF EXISTS (
    SELECT 1 FROM temp_exercises te
    WHERE NOT EXISTS (
      SELECT 1 FROM public.variations v WHERE v.id = te.variation_id
    )
  ) THEN
    RAISE EXCEPTION 'invalid variation_id';
  END IF;

  DROP TABLE IF EXISTS temp_sets;
  CREATE TEMP TABLE temp_sets AS
  SELECT
    te.exercise_idx, te.variation_id, te.position,
    (s->>'setOrder')::INTEGER AS set_order,
    s->>'setType' AS set_type,
    (s->>'weightKg')::NUMERIC(8,2) AS weight_kg,
    (s->>'reps')::INTEGER AS reps,
    (s->>'repsMin')::INTEGER AS reps_min,
    (s->>'repsMax')::INTEGER AS reps_max
  FROM temp_exercises te
  CROSS JOIN LATERAL jsonb_array_elements(te.raw_ex->'sets') s;

  IF EXISTS (
    SELECT 1 FROM temp_sets
    WHERE set_type IS NULL OR set_type NOT IN ('warmup', 'normal', 'drop', 'cluster')
  ) THEN
    RAISE EXCEPTION 'invalid set_type';
  END IF;

  IF EXISTS (SELECT 1 FROM temp_sets WHERE reps IS NOT NULL AND reps <= 0) THEN
    RAISE EXCEPTION 'reps must be > 0';
  END IF;

  INSERT INTO public.workout_exercise_logs (
    workout_log_id, variation_id, position, note, rest_seconds, superset_group_id
  )
  SELECT
    v_log_id, te.variation_id, te.position, te.note, te.rest_seconds, te.superset_group_id
  FROM temp_exercises te
  ORDER BY te.exercise_idx;

  UPDATE public.workout_exercise_logs wel
  SET exercise_name = e.name,
      variation_name = v.name
  FROM public.variations v
  JOIN public.exercises e ON e.id = v.exercise_id
  WHERE wel.workout_log_id = v_log_id
    AND wel.variation_id = v.id
    AND wel.exercise_name IS NULL;

  INSERT INTO public.workout_exercise_set_logs (
    workout_exercise_log_id, set_order, set_type, weight_kg, reps, reps_min, reps_max
  )
  SELECT
    wel.id, ts.set_order, ts.set_type, ts.weight_kg, ts.reps, ts.reps_min, ts.reps_max
  FROM temp_sets ts
  JOIN public.workout_exercise_logs wel
    ON wel.workout_log_id = v_log_id
   AND wel.variation_id = ts.variation_id
   AND wel.position = ts.position
  ORDER BY ts.exercise_idx, ts.set_order;

  DROP TABLE IF EXISTS temp_prep_exercises;
  CREATE TEMP TABLE temp_prep_exercises AS
  SELECT
    pe.ordinality::INTEGER AS exercise_idx,
    (pe.value->>'variationId')::uuid AS variation_id,
    (pe.value->>'position')::INTEGER AS position,
    pe.value->>'durationType' AS duration_type,
    NULLIF(TRIM(pe.value->>'note'), '') AS note,
    pe.value AS raw_pe
  FROM jsonb_array_elements(
    COALESCE(payload->'preparatoryExerciseLogs', '[]'::jsonb)
  ) WITH ORDINALITY AS pe(value, ordinality);

  INSERT INTO public.workout_preparatory_exercise_logs (
    workout_log_id, variation_id, "position", duration_type, note
  )
  SELECT
    v_log_id, tpe.variation_id, tpe.position, tpe.duration_type, tpe.note
  FROM temp_prep_exercises tpe
  ORDER BY tpe.exercise_idx;

  UPDATE public.workout_preparatory_exercise_logs wpel
  SET exercise_name = e.name,
      variation_name = v.name
  FROM public.variations v
  JOIN public.exercises e ON e.id = v.exercise_id
  WHERE wpel.workout_log_id = v_log_id
    AND wpel.variation_id = v.id
    AND wpel.exercise_name IS NULL;

  INSERT INTO public.workout_preparatory_set_logs (
    workout_preparatory_exercise_log_id, set_order, duration_seconds, reps
  )
  SELECT
    wpel.id,
    (s->>'setOrder')::INTEGER,
    (s->>'durationSeconds')::INTEGER,
    (s->>'reps')::INTEGER
  FROM temp_prep_exercises tpe
  CROSS JOIN LATERAL jsonb_array_elements(
    COALESCE(tpe.raw_pe->'setLogs', '[]'::jsonb)
  ) s
  JOIN public.workout_preparatory_exercise_logs wpel
    ON wpel.workout_log_id = v_log_id
   AND wpel.variation_id = tpe.variation_id
   AND wpel.position = tpe.position
  ORDER BY tpe.exercise_idx, (s->>'setOrder')::INTEGER;

  DROP TABLE IF EXISTS temp_variation_metrics;
  CREATE TEMP TABLE temp_variation_metrics AS
  SELECT
    variation_id,
    MAX(weight_kg) AS max_weight_kg,
    COALESCE(SUM(COALESCE(weight_kg, 0) * COALESCE(reps, 0)), 0)::NUMERIC(10,2) AS max_volume_kg,
    MAX(reps) AS max_reps,
    COUNT(*)::INTEGER AS max_sets
  FROM temp_sets
  GROUP BY variation_id;

  INSERT INTO public.workout_variation_records (
    user_id, variation_id, max_weight_kg, max_volume_kg, max_reps, max_sets
  )
  SELECT
    v_user_id, tvm.variation_id, tvm.max_weight_kg, tvm.max_volume_kg, tvm.max_reps, tvm.max_sets
  FROM temp_variation_metrics tvm
  ON CONFLICT (user_id, variation_id)
  DO UPDATE SET
    max_weight_kg = CASE
      WHEN workout_variation_records.max_weight_kg IS NULL THEN EXCLUDED.max_weight_kg
      WHEN EXCLUDED.max_weight_kg IS NULL THEN workout_variation_records.max_weight_kg
      ELSE GREATEST(workout_variation_records.max_weight_kg, EXCLUDED.max_weight_kg)
    END,
    max_volume_kg = CASE
      WHEN workout_variation_records.max_volume_kg IS NULL THEN EXCLUDED.max_volume_kg
      WHEN EXCLUDED.max_volume_kg IS NULL THEN workout_variation_records.max_volume_kg
      ELSE GREATEST(workout_variation_records.max_volume_kg, EXCLUDED.max_volume_kg)
    END,
    max_reps = CASE
      WHEN workout_variation_records.max_reps IS NULL THEN EXCLUDED.max_reps
      WHEN EXCLUDED.max_reps IS NULL THEN workout_variation_records.max_reps
      ELSE GREATEST(workout_variation_records.max_reps, EXCLUDED.max_reps)
    END,
    max_sets = CASE
      WHEN workout_variation_records.max_sets IS NULL THEN EXCLUDED.max_sets
      WHEN EXCLUDED.max_sets IS NULL THEN workout_variation_records.max_sets
      ELSE GREATEST(workout_variation_records.max_sets, EXCLUDED.max_sets)
    END;

  v_summary_snapshot := jsonb_set(
    v_summary_snapshot,
    '{workoutLogId}',
    to_jsonb(v_log_id::text),
    true
  );

  INSERT INTO public.workout_log_summaries (
    workout_log_id, user_id, summary_snapshot
  )
  VALUES (
    v_log_id, v_user_id, v_summary_snapshot
  );

  RETURN v_log_id;
END;
$$;


ALTER FUNCTION "public"."insert_workout_log_with_summary"("payload" "jsonb", "summary_snapshot" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_active_coach_of"("p_coach_id" "uuid", "p_athlete_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
select exists(
    select 1
    from public.coach_athletes ca
    where ca.coach_id = p_coach_id
      and ca.athlete_id = p_athlete_id
      and ca.status = 'active'
);
$$;


ALTER FUNCTION "public"."is_active_coach_of"("p_coach_id" "uuid", "p_athlete_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."list_periodizations"("p_created_by" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
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
          'cycle_count', COALESCE(
            (
              SELECT FLOOR(((p.end_date - p.start_date + 1)::numeric / NULLIF(COUNT(*), 0)))::int
              FROM public.periodization_template_days td
              WHERE td.periodization_id = p.id
            ),
            0
          ),
          'total_workouts', (
            SELECT COUNT(*)::int FROM public.periodization_occurrences o
            WHERE o.periodization_id = p.id
              AND o.day_type = 'training'
              AND o.kind = 'workout'
          ),
          'planned_to_date', (
            SELECT COUNT(*)::int FROM public.periodization_occurrences o
            WHERE o.periodization_id = p.id
              AND o.day_type = 'training'
              AND o.kind = 'workout'
              AND o.planned_date <= CURRENT_DATE
          ),
          'done_count', (
            SELECT COUNT(*)::int FROM public.periodization_occurrences o
            WHERE o.periodization_id = p.id
              AND o.status = 'done'
          ),
          'skipped_count', (
            SELECT COUNT(*)::int FROM public.periodization_occurrences o
            WHERE o.periodization_id = p.id
              AND o.status = 'skipped'
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


ALTER FUNCTION "public"."list_periodizations"("p_created_by" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."list_variation_views_for_mobile"("p_user_id" "uuid", "p_muscle_ids" "uuid"[], "p_equipment_ids" "uuid"[], "p_visibility" "text", "p_exercise_types" "text"[]) RETURNS TABLE("id" "uuid", "name" "text", "exercise_id" "uuid", "exercise_name" "text", "exercise_type" "text", "muscle_id" "uuid", "muscle_name" "text", "muscle_slug" "text", "muscle_level2_name" "text", "muscle_level2_slug" "text", "secondary_muscle_id" "uuid", "secondary_muscle_name" "text", "secondary_muscle_slug" "text", "equipment_id" "uuid", "equipment_name" "text", "equipment_slug" "text", "equipment_preposition" "text", "video_url" "text", "image_url" "text", "user_id" "uuid", "video_object_key" "text", "video_thumbnail_key" "text", "video_duration_seconds" integer, "video_processing_status" "text")
    LANGUAGE "sql" STABLE
    SET "search_path" TO 'public'
    AS $$
  WITH RECURSIVE expanded_muscles AS (
    SELECT m.id FROM public.muscles m WHERE m.id = ANY(p_muscle_ids)
    UNION
    SELECT m.id FROM public.muscles m
    JOIN expanded_muscles em ON m.parent_id = em.id
  )
  SELECT
    vv.id,
    vv.name,
    vv.exercise_id,
    vv.exercise_name,
    vv.exercise_type,
    vv.muscle_id,
    vv.muscle_name,
    vv.muscle_slug,
    vv.muscle_level2_name,
    vv.muscle_level2_slug,
    vv.secondary_muscle_id,
    vv.secondary_muscle_name,
    vv.secondary_muscle_slug,
    vv.equipment_id,
    vv.equipment_name,
    vv.equipment_slug,
    vv.equipment_preposition,
    vv.video_url,
    vv.image_url,
    vv.user_id,
    vv.video_object_key,
    vv.video_thumbnail_key,
    vv.video_duration_seconds,
    vv.video_processing_status
  FROM public.variations_view vv
  WHERE
    (p_visibility <> 'public' OR vv.user_id IS NULL)
    AND (
      p_visibility <> 'private'
      OR vv.user_id = p_user_id
      OR EXISTS (
        SELECT 1
        FROM public.shared_variations sv
        WHERE sv.variation_id = vv.id
          AND sv.shared_with_id = p_user_id
      )
    )
    AND (
      COALESCE(array_length(p_muscle_ids, 1), 0) = 0
      OR vv.muscle_id IN (SELECT id FROM expanded_muscles)
    )
    AND (
      COALESCE(array_length(p_equipment_ids, 1), 0) = 0
      OR vv.equipment_id = ANY(p_equipment_ids)
    )
    AND (
      COALESCE(array_length(p_exercise_types, 1), 0) = 0
      OR vv.exercise_type = ANY(p_exercise_types)
    );
$$;


ALTER FUNCTION "public"."list_variation_views_for_mobile"("p_user_id" "uuid", "p_muscle_ids" "uuid"[], "p_equipment_ids" "uuid"[], "p_visibility" "text", "p_exercise_types" "text"[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."list_workouts_with_summary"("p_user_id" "uuid", "p_folder_id" "uuid" DEFAULT NULL::"uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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
        'folder_id', w.folder_id,
        'archived_at', w.archived_at,
        'created_by', w.created_by,
        'updated_by', w.updated_by,
        'created_at', w.created_at,
        'updated_at', w.updated_at,
        'exercise_count', COALESCE(summary.exercise_count, 0),
        'muscle_names', COALESCE(summary.muscle_names, '[]'::jsonb),
        'folder_name', f.name,
        'folder_color', f.color
      )
      ORDER BY w.name, w.id
    ),
    '[]'::jsonb
  )
  INTO result
  FROM public.workouts w
  LEFT JOIN public.workout_folders f ON f.id = w.folder_id
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
  WHERE w.user_id = p_user_id
    AND (
      (p_folder_id IS NULL AND w.folder_id IS NULL)
      OR (p_folder_id IS NOT NULL AND w.folder_id = p_folder_id)
    );

  RETURN result;
END;
$$;


ALTER FUNCTION "public"."list_workouts_with_summary"("p_user_id" "uuid", "p_folder_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."on_variation_video_upsert_dispatch_transcode"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF NEW.processing_status = 'pending' AND (
       TG_OP = 'INSERT'
       OR OLD.processing_status IS DISTINCT FROM NEW.processing_status
     ) THEN
    PERFORM public.dispatch_variation_video_transcode(NEW.variation_id);
  END IF;
  RETURN NEW;
END $$;


ALTER FUNCTION "public"."on_variation_video_upsert_dispatch_transcode"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."pgmq_archive"("queue_name" "text", "msg_id" bigint) RETURNS boolean
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pgmq'
    AS $$ SELECT pgmq.archive(queue_name, msg_id); $$;


ALTER FUNCTION "public"."pgmq_archive"("queue_name" "text", "msg_id" bigint) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."pgmq_delete"("queue_name" "text", "msg_id" bigint) RETURNS boolean
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pgmq'
    AS $$ SELECT pgmq.delete(queue_name, msg_id); $$;


ALTER FUNCTION "public"."pgmq_delete"("queue_name" "text", "msg_id" bigint) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."pgmq_read"("queue_name" "text", "vt" integer, "qty" integer) RETURNS SETOF "pgmq"."message_record"
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pgmq'
    AS $$ SELECT * FROM pgmq.read(queue_name, vt, qty); $$;


ALTER FUNCTION "public"."pgmq_read"("queue_name" "text", "vt" integer, "qty" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."recalculate_variation_records"("p_user_id" "uuid", "p_variation_ids" "uuid"[]) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  DELETE FROM public.workout_variation_records
  WHERE user_id = p_user_id
    AND variation_id = ANY(p_variation_ids);

  INSERT INTO public.workout_variation_records (
    user_id, variation_id, max_weight_kg, max_volume_kg, max_reps, max_sets
  )
  SELECT
    p_user_id,
    variation_id,
    MAX(session_max_weight_kg),
    MAX(session_max_volume_kg),
    MAX(session_max_reps),
    MAX(session_sets_count)
  FROM (
    SELECT
      wel.variation_id,
      MAX(wesl.weight_kg) AS session_max_weight_kg,
      MAX(wesl.weight_kg * wesl.reps) AS session_max_volume_kg,
      MAX(wesl.reps) AS session_max_reps,
      COUNT(*)::INTEGER AS session_sets_count
    FROM workout_logs wl
    JOIN workout_exercise_logs wel ON wel.workout_log_id = wl.id
    JOIN workout_exercise_set_logs wesl ON wesl.workout_exercise_log_id = wel.id
    WHERE wl.user_id = p_user_id
      AND wl.deleted_at IS NULL
      AND wel.variation_id = ANY(p_variation_ids)
      AND wesl.set_type = 'normal'
    GROUP BY wl.id, wel.variation_id
  ) per_session
  GROUP BY variation_id
  ON CONFLICT (user_id, variation_id) DO UPDATE SET
    max_weight_kg = EXCLUDED.max_weight_kg,
    max_volume_kg = EXCLUDED.max_volume_kg,
    max_reps = EXCLUDED.max_reps,
    max_sets = EXCLUDED.max_sets,
    updated_at = NOW();
END;
$$;


ALTER FUNCTION "public"."recalculate_variation_records"("p_user_id" "uuid", "p_variation_ids" "uuid"[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."recover_stuck_video_transcodes"("p_pending_after_minutes" integer, "p_processing_after_minutes" integer, "p_limit" integer) RETURNS TABLE("variation_id" "uuid")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT v.variation_id
    FROM public.variation_videos v
    WHERE
      (v.processing_status = 'pending'
        AND (v.last_dispatched_at IS NULL
             OR v.last_dispatched_at < now() - make_interval(mins => p_pending_after_minutes)))
      OR (v.processing_status = 'processing'
        AND v.processing_started_at < now() - make_interval(mins => p_processing_after_minutes))
    ORDER BY v.uploaded_at ASC
    LIMIT p_limit
    FOR UPDATE SKIP LOCKED
  LOOP
    -- Going through 'pending' is enough: trigger fires AFTER UPDATE OF
    -- processing_status and re-dispatches.
    UPDATE public.variation_videos vv
      SET processing_status = 'pending'
      WHERE vv.variation_id = r.variation_id;
    variation_id := r.variation_id;
    RETURN NEXT;
  END LOOP;
END $$;


ALTER FUNCTION "public"."recover_stuck_video_transcodes"("p_pending_after_minutes" integer, "p_processing_after_minutes" integer, "p_limit" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."replace_future_occurrences"("p_periodization_id" "uuid", "p_from_date" "date", "p_rows" "jsonb") RETURNS "void"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
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
      day_type, kind, workout_id, cardio_program_id,
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
      NULLIF(v_row->>'cardio_program_id', '')::uuid,
      'pending'
    );
  END LOOP;
END;
$$;


ALTER FUNCTION "public"."replace_future_occurrences"("p_periodization_id" "uuid", "p_from_date" "date", "p_rows" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."resolve_all_feature_access"("p_user_id" "uuid") RETURNS TABLE("feature_key" "text", "enabled" boolean, "limit_value" integer)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  v_plan_id text;
BEGIN
  SELECT s.plan_id INTO v_plan_id
  FROM public.subscriptions s
  WHERE s.user_id = p_user_id;

  IF v_plan_id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    pfl.feature_key,
    COALESCE(sfo.enabled, pfl.enabled) AS enabled,
    COALESCE(sfo.limit_value, pfl.limit_value) AS limit_value
  FROM public.plan_feature_limits pfl
  LEFT JOIN public.subscription_feature_overrides sfo
    ON sfo.user_id = p_user_id AND sfo.feature_key = pfl.feature_key
  WHERE pfl.plan_id = v_plan_id;
END;
$$;


ALTER FUNCTION "public"."resolve_all_feature_access"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."resolve_feature_access"("p_user_id" "uuid", "p_feature_key" "text") RETURNS TABLE("enabled" boolean, "limit_value" integer)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  v_plan_id text;
  v_override_enabled boolean;
  v_override_limit integer;
  v_plan_enabled boolean;
  v_plan_limit integer;
BEGIN
  -- Get user's plan
  SELECT s.plan_id INTO v_plan_id
  FROM public.subscriptions s
  WHERE s.user_id = p_user_id;

  IF v_plan_id IS NULL THEN
    RETURN QUERY SELECT false, NULL::integer;
    RETURN;
  END IF;

  -- Get plan defaults
  SELECT pfl.enabled, pfl.limit_value
  INTO v_plan_enabled, v_plan_limit
  FROM public.plan_feature_limits pfl
  WHERE pfl.plan_id = v_plan_id AND pfl.feature_key = p_feature_key;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, NULL::integer;
    RETURN;
  END IF;

  -- Check for user override
  SELECT sfo.enabled, sfo.limit_value
  INTO v_override_enabled, v_override_limit
  FROM public.subscription_feature_overrides sfo
  WHERE sfo.user_id = p_user_id AND sfo.feature_key = p_feature_key;

  IF FOUND THEN
    RETURN QUERY SELECT
      COALESCE(v_override_enabled, v_plan_enabled),
      COALESCE(v_override_limit, v_plan_limit);
  ELSE
    RETURN QUERY SELECT v_plan_enabled, v_plan_limit;
  END IF;
END;
$$;


ALTER FUNCTION "public"."resolve_feature_access"("p_user_id" "uuid", "p_feature_key" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."save_periodization_edit"("p_periodization_id" "uuid", "p_start_date" "date", "p_end_date" "date", "p_adjustments_delete" "uuid"[], "p_adjustments_upsert" "jsonb", "p_occurrences_delete" "uuid"[], "p_occurrences_insert" "jsonb", "p_occurrences_update" "jsonb") RETURNS "void"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_owner uuid;
  v_athlete uuid;
  v_status text;
  v_current_start_date date;
  v_current_end_date date;
  v_caller uuid;
BEGIN
  SELECT p.created_by, p.athlete_id, p.status, p.start_date, p.end_date
    INTO v_owner, v_athlete, v_status, v_current_start_date, v_current_end_date
    FROM public.periodizations p
    WHERE p.id = p_periodization_id;

  IF v_owner IS NULL THEN
    RAISE EXCEPTION 'Periodização não encontrada' USING ERRCODE = 'P0002';
  END IF;

  v_caller := (SELECT auth.uid());
  IF v_caller IS DISTINCT FROM v_owner AND v_caller IS DISTINCT FROM v_athlete THEN
    RAISE EXCEPTION 'Acesso negado' USING ERRCODE = '42501';
  END IF;

  IF v_status = 'completed' THEN
    RAISE EXCEPTION 'Periodização encerrada não pode ser editada' USING ERRCODE = '22023';
  END IF;
  IF v_status = 'active' AND p_start_date <> v_current_start_date THEN
    RAISE EXCEPTION 'Data de início não pode ser alterada após a ativação' USING ERRCODE = '22023';
  END IF;

  -- Period (skip when unchanged so athletes — restricted by the
  -- periodizations_update RLS policy — don't hit the policy on no-op saves).
  IF p_start_date IS DISTINCT FROM v_current_start_date
     OR p_end_date IS DISTINCT FROM v_current_end_date THEN
    UPDATE public.periodizations
       SET start_date = p_start_date,
           end_date   = p_end_date,
           updated_at = now()
     WHERE id = p_periodization_id;
  END IF;

  -- Adjustments: delete
  IF p_adjustments_delete IS NOT NULL AND array_length(p_adjustments_delete, 1) > 0 THEN
    DELETE FROM public.periodization_adjustments
     WHERE id = ANY(p_adjustments_delete)
       AND periodization_id = p_periodization_id;
  END IF;

  -- Adjustments: insert + update (upsert by id)
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

  -- Occurrences: delete (defensive immunity — only pending/missed)
  IF p_occurrences_delete IS NOT NULL AND array_length(p_occurrences_delete, 1) > 0 THEN
    DELETE FROM public.periodization_occurrences
     WHERE id = ANY(p_occurrences_delete)
       AND periodization_id = p_periodization_id
       AND status IN ('pending', 'missed');
  END IF;

  -- Occurrences: insert
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

  -- Occurrences: update (defensive immunity — only pending/missed)
  -- Use `r->'patch' ? 'key'` so explicit nulls in the patch clear the column
  -- instead of being treated as "field absent".
  IF p_occurrences_update IS NOT NULL AND jsonb_array_length(p_occurrences_update) > 0 THEN
    UPDATE public.periodization_occurrences po
       SET planned_date         = CASE WHEN r->'patch' ? 'plannedDate'        THEN (r->'patch'->>'plannedDate')::date              ELSE po.planned_date END,
           cycle                = CASE WHEN r->'patch' ? 'cycle'              THEN (r->'patch'->>'cycle')::int                    ELSE po.cycle END,
           position_in_day      = CASE WHEN r->'patch' ? 'positionInDay'      THEN (r->'patch'->>'positionInDay')::int            ELSE po.position_in_day END,
           day_type             = CASE WHEN r->'patch' ? 'dayType'            THEN r->'patch'->>'dayType'                         ELSE po.day_type END,
           kind                 = CASE WHEN r->'patch' ? 'kind'               THEN r->'patch'->>'kind'                            ELSE po.kind END,
           workout_id           = CASE WHEN r->'patch' ? 'workoutId'          THEN NULLIF(r->'patch'->>'workoutId', '')::uuid          ELSE po.workout_id END,
           cardio_program_id    = CASE WHEN r->'patch' ? 'cardioProgramId'    THEN NULLIF(r->'patch'->>'cardioProgramId', '')::uuid    ELSE po.cardio_program_id END,
           origin               = CASE WHEN r->'patch' ? 'origin'             THEN r->'patch'->>'origin'                          ELSE po.origin END,
           source_adjustment_id = CASE WHEN r->'patch' ? 'sourceAdjustmentId' THEN NULLIF(r->'patch'->>'sourceAdjustmentId', '')::uuid ELSE po.source_adjustment_id END,
           updated_at           = now()
      FROM jsonb_array_elements(p_occurrences_update) AS r
     WHERE po.id = (r->>'id')::uuid
       AND po.periodization_id = p_periodization_id
       AND po.status IN ('pending', 'missed');
  END IF;
END;
$$;


ALTER FUNCTION "public"."save_periodization_edit"("p_periodization_id" "uuid", "p_start_date" "date", "p_end_date" "date", "p_adjustments_delete" "uuid"[], "p_adjustments_upsert" "jsonb", "p_occurrences_delete" "uuid"[], "p_occurrences_insert" "jsonb", "p_occurrences_update" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."search_coaches_by_gym_location"("p_lng" double precision, "p_lat" double precision, "p_radius_meters" double precision) RETURNS TABLE("coach_id" "uuid")
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT cg.coach_id
  FROM coach_gyms cg
  JOIN profiles p ON p.id = cg.coach_id AND p.profile_published = true
  WHERE ST_DWithin(
    cg.location,
    ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography,
    p_radius_meters
  );
END;
$$;


ALTER FUNCTION "public"."search_coaches_by_gym_location"("p_lng" double precision, "p_lat" double precision, "p_radius_meters" double precision) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."search_coaches_by_service_area"("p_lng" double precision, "p_lat" double precision) RETURNS TABLE("coach_id" "uuid")
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT csa.coach_id
  FROM coach_service_areas csa
  JOIN profiles p ON p.id = csa.coach_id AND p.profile_published = true
  WHERE ST_DWithin(
    csa.center,
    ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography,
    csa.radius_km * 1000
  );
END;
$$;


ALTER FUNCTION "public"."search_coaches_by_service_area"("p_lng" double precision, "p_lat" double precision) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."search_workouts"("p_user_id" "uuid", "p_query" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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
    RAISE EXCEPTION 'Not authorized to search workouts for this user';
  END IF;

  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', w.id,
        'user_id', w.user_id,
        'name', w.name,
        'description', w.description,
        'folder_id', w.folder_id,
        'archived_at', w.archived_at,
        'created_by', w.created_by,
        'updated_by', w.updated_by,
        'created_at', w.created_at,
        'updated_at', w.updated_at,
        'exercise_count', COALESCE(summary.exercise_count, 0),
        'muscle_names', COALESCE(summary.muscle_names, '[]'::jsonb),
        'folder_name', f.name,
        'folder_color', f.color
      )
      ORDER BY w.name, w.id
    ),
    '[]'::jsonb
  )
  INTO result
  FROM public.workouts w
  LEFT JOIN public.workout_folders f ON f.id = w.folder_id
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
  WHERE w.user_id = p_user_id
    AND w.name ILIKE '%' || p_query || '%';

  RETURN result;
END;
$$;


ALTER FUNCTION "public"."search_workouts"("p_user_id" "uuid", "p_query" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_exercise_record_audit_fields"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  actor_id uuid;
BEGIN
  actor_id := (SELECT auth.uid());

  IF TG_OP = 'INSERT' THEN
    NEW.created_by = actor_id;
  ELSE
    IF NEW.created_at <> OLD.created_at THEN
      RAISE EXCEPTION 'created_at cannot be updated';
    END IF;

    IF NEW.created_by <> OLD.created_by THEN
      RAISE EXCEPTION 'created_by cannot be updated';
    END IF;

    IF NEW.user_id IS DISTINCT FROM OLD.user_id THEN
      RAISE EXCEPTION 'user_id cannot be updated';
    END IF;
  END IF;

  NEW.updated_by = actor_id;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."set_exercise_record_audit_fields"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_timestamps"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.created_at = COALESCE(NEW.created_at, now());
  END IF;

  NEW.updated_at = now();

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."set_timestamps"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_variation_scope_with_exercise"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  exercise_user_id uuid;
begin
  select e.user_id
  into exercise_user_id
  from public.exercises e
  where e.id = new.exercise_id;

  if not found then
    raise exception 'Exercise not found for variation';
  end if;

  new.user_id = exercise_user_id;

  return new;
end;
$$;


ALTER FUNCTION "public"."sync_variation_scope_with_exercise"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_subscriptions_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_subscriptions_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."upsert_exercise_variation"("p_user_id" "uuid", "p_exercise_id" "uuid", "p_name" "text", "p_variation_id" "uuid", "p_variation_name" "text", "p_muscle_id" "uuid", "p_equipment_id" "uuid", "p_video_url" "text", "p_image_url" "text", "p_new_variation" boolean DEFAULT false, "p_secondary_muscle_id" "uuid" DEFAULT NULL::"uuid", "p_exercise_type" "text" DEFAULT 'musculacao'::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  actor_id uuid;
  normalized_exercise_name text;
  normalized_variation_name text;
  normalized_video_url text;
  normalized_image_url text;
  target_exercise public.exercises%rowtype;
  target_variation public.variations%rowtype;
  saved_variation_id uuid;
  result jsonb;
BEGIN
  actor_id := auth.uid();

  IF actor_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'user_id is required';
  END IF;

  IF p_user_id != actor_id THEN
    RAISE EXCEPTION 'Not authorized to manage records for this user';
  END IF;

  IF p_exercise_type NOT IN ('preparatorio', 'musculacao') THEN
    RAISE EXCEPTION 'BUSINESS: Tipo de exercício inválido';
  END IF;

  normalized_exercise_name := nullif(trim(p_name), '');
  normalized_variation_name := nullif(trim(coalesce(p_variation_name, '')), '');
  normalized_video_url := nullif(trim(coalesce(p_video_url, '')), '');
  normalized_image_url := nullif(trim(coalesce(p_image_url, '')), '');

  IF normalized_exercise_name IS NULL THEN
    RAISE EXCEPTION 'Exercise name is required';
  END IF;

  IF p_muscle_id IS NULL THEN
    RAISE EXCEPTION 'muscle_id is required';
  END IF;

  IF p_equipment_id IS NULL THEN
    RAISE EXCEPTION 'equipment_id is required';
  END IF;

  IF p_variation_id IS NOT NULL AND p_exercise_id IS NULL THEN
    RAISE EXCEPTION 'exercise_id is required when updating an existing variation';
  END IF;

  IF p_exercise_id IS NOT NULL THEN
    SELECT *
    INTO target_exercise
    FROM public.exercises
    WHERE id = p_exercise_id
      AND user_id = p_user_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Exercise not found for target user';
    END IF;

    UPDATE public.exercises
    SET name = normalized_exercise_name,
        exercise_type = p_exercise_type
    WHERE id = p_exercise_id
    RETURNING *
    INTO target_exercise;
  ELSE
    SELECT *
    INTO target_exercise
    FROM public.exercises
    WHERE user_id = p_user_id
      AND lower(trim(name)) = lower(normalized_exercise_name)
    LIMIT 1;

    IF NOT FOUND THEN
      INSERT INTO public.exercises (name, user_id, exercise_type)
      VALUES (normalized_exercise_name, p_user_id, p_exercise_type)
      RETURNING *
      INTO target_exercise;
    END IF;
  END IF;

  -- Path 1: New variation (p_new_variation = true)
  IF coalesce(p_new_variation, false) THEN
    IF EXISTS (
      SELECT 1
      FROM public.variations v
      JOIN public.exercises e ON e.id = v.exercise_id
      WHERE v.user_id = p_user_id
        AND lower(trim(e.name)) = lower(normalized_exercise_name)
        AND v.equipment_id = p_equipment_id
        AND v.name IS NOT DISTINCT FROM normalized_variation_name
        AND v.id IS DISTINCT FROM p_variation_id
    ) THEN
      RAISE EXCEPTION 'BUSINESS: Já existe uma variação com este exercício, equipamento e nome para este usuário';
    END IF;

    INSERT INTO public.variations (
      name, exercise_id, muscle_id, equipment_id,
      video_url, image_url, secondary_muscle_id
    )
    VALUES (
      normalized_variation_name, target_exercise.id, p_muscle_id, p_equipment_id,
      normalized_video_url, normalized_image_url, p_secondary_muscle_id
    )
    RETURNING id
    INTO saved_variation_id;

  -- Path 2: Update existing variation (p_variation_id provided)
  ELSIF p_variation_id IS NOT NULL THEN
    SELECT *
    INTO target_variation
    FROM public.variations
    WHERE id = p_variation_id
      AND user_id = p_user_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'BUSINESS: Variação não encontrada para este usuário';
    END IF;

    IF target_variation.exercise_id <> target_exercise.id THEN
      RAISE EXCEPTION 'BUSINESS: Variação não pertence ao exercício selecionado';
    END IF;

    IF EXISTS (
      SELECT 1
      FROM public.variations v
      JOIN public.exercises e ON e.id = v.exercise_id
      WHERE v.user_id = p_user_id
        AND lower(trim(e.name)) = lower(normalized_exercise_name)
        AND v.equipment_id = p_equipment_id
        AND v.name IS NOT DISTINCT FROM normalized_variation_name
        AND v.id IS DISTINCT FROM p_variation_id
    ) THEN
      RAISE EXCEPTION 'BUSINESS: Já existe uma variação com este exercício, equipamento e nome para este usuário';
    END IF;

    UPDATE public.variations
    SET name = normalized_variation_name,
        muscle_id = p_muscle_id,
        equipment_id = p_equipment_id,
        video_url = normalized_video_url,
        image_url = normalized_image_url,
        secondary_muscle_id = p_secondary_muscle_id
    WHERE id = p_variation_id
    RETURNING id
    INTO saved_variation_id;

  -- Path 3: Fallback insert (no variation_id, not new_variation)
  ELSE
    IF EXISTS (
      SELECT 1
      FROM public.variations v
      JOIN public.exercises e ON e.id = v.exercise_id
      WHERE v.user_id = p_user_id
        AND lower(trim(e.name)) = lower(normalized_exercise_name)
        AND v.equipment_id = p_equipment_id
        AND v.name IS NOT DISTINCT FROM normalized_variation_name
        AND v.id IS DISTINCT FROM p_variation_id
    ) THEN
      RAISE EXCEPTION 'BUSINESS: Já existe uma variação com este exercício, equipamento e nome para este usuário';
    END IF;

    INSERT INTO public.variations (
      name, exercise_id, muscle_id, equipment_id,
      video_url, image_url, secondary_muscle_id
    )
    VALUES (
      normalized_variation_name, target_exercise.id, p_muscle_id, p_equipment_id,
      normalized_video_url, normalized_image_url, p_secondary_muscle_id
    )
    RETURNING id
    INTO saved_variation_id;
  END IF;

  SELECT to_jsonb(vv)
  INTO result
  FROM public.variations_view vv
  WHERE vv.id = saved_variation_id;

  IF result IS NULL THEN
    RAISE EXCEPTION 'Saved variation not found in variations_view';
  END IF;

  RETURN result;
END;
$$;


ALTER FUNCTION "public"."upsert_exercise_variation"("p_user_id" "uuid", "p_exercise_id" "uuid", "p_name" "text", "p_variation_id" "uuid", "p_variation_name" "text", "p_muscle_id" "uuid", "p_equipment_id" "uuid", "p_video_url" "text", "p_image_url" "text", "p_new_variation" boolean, "p_secondary_muscle_id" "uuid", "p_exercise_type" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."upsert_periodization"("payload" "jsonb") RETURNS "uuid"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_id uuid;
  v_day_record record;
  v_day_id uuid;
  v_activity_record record;
  v_adj_record record;
BEGIN
  v_id := COALESCE((payload->'periodization'->>'id')::uuid, gen_random_uuid());

  -- Enforce one-active-per-athlete: complete any other active periodization
  -- for this athlete before inserting/updating this one as active.
  IF (payload->'periodization'->>'status') = 'active' THEN
    UPDATE public.periodizations
       SET status = 'completed', updated_at = now()
     WHERE athlete_id = (payload->'periodization'->>'athlete_id')::uuid
       AND status = 'active'
       AND id <> v_id;
  END IF;

  INSERT INTO public.periodizations (
    id, created_by, athlete_id, start_date, end_date,
    objective, status, notification_days_before
  ) VALUES (
    v_id,
    (SELECT auth.uid()),
    (payload->'periodization'->>'athlete_id')::uuid,
    (payload->'periodization'->>'start_date')::date,
    (payload->'periodization'->>'end_date')::date,
    NULLIF(payload->'periodization'->>'objective', ''),
    (payload->'periodization'->>'status'),
    NULLIF(payload->'periodization'->>'notification_days_before', '')::int
  )
  ON CONFLICT (id) DO UPDATE SET
    athlete_id = EXCLUDED.athlete_id,
    start_date = EXCLUDED.start_date,
    end_date = EXCLUDED.end_date,
    objective = EXCLUDED.objective,
    status = EXCLUDED.status,
    notification_days_before = EXCLUDED.notification_days_before,
    updated_at = now();

  -- Replace template (cascade to activities)
  DELETE FROM public.periodization_template_days WHERE periodization_id = v_id;

  FOR v_day_record IN
    SELECT day, pos
    FROM jsonb_array_elements(payload->'template'->'days')
    WITH ORDINALITY AS t(day, pos)
  LOOP
    v_day_id := (v_day_record.day->>'id')::uuid;
    INSERT INTO public.periodization_template_days (id, periodization_id, position, day_type)
    VALUES (
      v_day_id,
      v_id,
      (v_day_record.pos::int - 1),
      v_day_record.day->>'day_type'
    );

    IF v_day_record.day->>'day_type' = 'training' THEN
      FOR v_activity_record IN
        SELECT act, pos
        FROM jsonb_array_elements(v_day_record.day->'activities')
        WITH ORDINALITY AS a(act, pos)
      LOOP
        INSERT INTO public.periodization_template_activities (
          id, template_day_id, position, kind, workout_id, cardio_program_id
        ) VALUES (
          (v_activity_record.act->>'id')::uuid,
          v_day_id,
          (v_activity_record.pos::int - 1),
          v_activity_record.act->>'kind',
          NULLIF(v_activity_record.act->>'workout_id', '')::uuid,
          NULLIF(v_activity_record.act->>'cardio_program_id', '')::uuid
        );
      END LOOP;
    END IF;
  END LOOP;

  -- Replace adjustments
  DELETE FROM public.periodization_adjustments WHERE periodization_id = v_id;

  FOR v_adj_record IN
    SELECT value AS adj FROM jsonb_array_elements(COALESCE(payload->'adjustments', '[]'::jsonb))
  LOOP
    INSERT INTO public.periodization_adjustments (
      id, periodization_id, cycle_start, cycle_end, cycle_every, type, payload, created_at
    ) VALUES (
      COALESCE(NULLIF(v_adj_record.adj->>'id', '')::uuid, gen_random_uuid()),
      v_id,
      NULLIF(v_adj_record.adj->>'cycle_start', '')::int,
      NULLIF(v_adj_record.adj->>'cycle_end', '')::int,
      NULLIF(v_adj_record.adj->>'cycle_every', '')::int,
      (v_adj_record.adj->'payload'->>'type'),
      v_adj_record.adj->'payload',
      COALESCE(NULLIF(v_adj_record.adj->>'created_at', '')::timestamptz, now())
    );
  END LOOP;

  -- Replace occurrences (preserves status != 'pending')
  PERFORM public.replace_future_occurrences(
    v_id,
    (payload->'periodization'->>'start_date')::date,
    COALESCE(payload->'occurrences', '[]'::jsonb)
  );

  RETURN v_id;
END;
$$;


ALTER FUNCTION "public"."upsert_periodization"("payload" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."upsert_push_subscription"("p_user_id" "uuid", "p_endpoint" "text", "p_p256dh_key" "text", "p_auth_key" "text", "p_user_agent" "text") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  result json;
BEGIN
  -- Remove qualquer subscription existente com este endpoint (pode ser de outro usuário)
  DELETE FROM public.push_subscriptions WHERE endpoint = p_endpoint;

  -- Insere a nova subscription
  INSERT INTO public.push_subscriptions (user_id, platform, endpoint, p256dh_key, auth_key, user_agent)
  VALUES (p_user_id, 'web', p_endpoint, p_p256dh_key, p_auth_key, p_user_agent)
  RETURNING row_to_json(push_subscriptions.*) INTO result;

  RETURN result;
END;
$$;


ALTER FUNCTION "public"."upsert_push_subscription"("p_user_id" "uuid", "p_endpoint" "text", "p_p256dh_key" "text", "p_auth_key" "text", "p_user_agent" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."upsert_workout"("payload" "jsonb") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_workout jsonb := payload->'workout';
  v_workout_id uuid := (v_workout->>'id')::uuid;
  v_workout_name text;
  v_workout_description text;
  v_workout_folder_id uuid;
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
  v_workout_folder_id := NULLIF(v_workout->>'folder_id', '')::uuid;
  v_workout_archived := (v_workout->>'archived_at')::timestamptz;

  IF v_workout_name IS NULL THEN
    RAISE EXCEPTION 'workout name required';
  END IF;

  IF v_workout_id IS NULL THEN
    v_workout_id := gen_random_uuid();
  END IF;

  INSERT INTO public.workouts (
    id, user_id, name, description, folder_id, archived_at
  )
  VALUES (
    v_workout_id, v_user_id, v_workout_name, v_workout_description,
    v_workout_folder_id, v_workout_archived
  )
  ON CONFLICT (id) DO UPDATE SET
    name = excluded.name,
    description = excluded.description,
    folder_id = excluded.folder_id,
    archived_at = excluded.archived_at
  WHERE public.workouts.user_id = v_user_id
    OR public.is_active_coach_of(v_auth_id, public.workouts.user_id);

  IF NOT FOUND THEN
    RAISE EXCEPTION 'workout not found or access denied';
  END IF;

  DROP TABLE IF EXISTS temp_exercises;
  CREATE TEMP TABLE temp_exercises AS
  SELECT
    (ex->>'id')::uuid AS id,
    (ex->>'variation_id')::uuid AS variation_id,
    NULLIF(TRIM(ex->>'note'), '') AS note,
    NULLIF(ex->>'rest_seconds', '')::INTEGER AS rest_seconds,
    (ex->>'position')::INTEGER AS position,
    (ex->>'superset_group_id')::uuid AS superset_group_id,
    (ex->>'superset_order')::INTEGER AS superset_order,
    ex AS raw_ex
  FROM jsonb_array_elements(payload->'exercises') ex;

  IF EXISTS (SELECT 1 FROM temp_exercises WHERE id IS NULL) THEN
    RAISE EXCEPTION 'exercise id required';
  END IF;

  DROP TABLE IF EXISTS temp_sets;
  CREATE TEMP TABLE temp_sets AS
  SELECT
    te.id AS exercise_id,
    (s->>'id')::uuid AS id,
    (s->>'set_order')::INTEGER AS set_order,
    s->>'set_type' AS set_type,
    (s->>'reps_min')::INTEGER AS reps_min,
    (s->>'reps_max')::INTEGER AS reps_max,
    (s->>'linked_set_id')::uuid AS linked_set_id,
    (s->>'load_percent_of_previous')::INTEGER AS load_percent_of_previous
  FROM temp_exercises te
  CROSS JOIN LATERAL jsonb_array_elements(te.raw_ex->'sets') s;

  IF EXISTS (SELECT 1 FROM temp_sets WHERE id IS NULL) THEN
    RAISE EXCEPTION 'set id required';
  END IF;

  IF EXISTS (
    SELECT 1 FROM temp_sets
    WHERE set_type IS NULL OR set_type NOT IN ('warmup', 'normal', 'drop', 'cluster')
  ) THEN
    RAISE EXCEPTION 'invalid set_type';
  END IF;

  IF EXISTS (SELECT 1 FROM temp_sets WHERE reps_min IS NULL OR reps_min <= 0) THEN
    RAISE EXCEPTION 'reps_min must be > 0';
  END IF;

  IF EXISTS (SELECT 1 FROM temp_sets WHERE reps_max IS NULL OR reps_max < reps_min) THEN
    RAISE EXCEPTION 'reps_max must be >= reps_min';
  END IF;

  IF EXISTS (
    SELECT 1 FROM temp_sets ts
    WHERE ts.set_type IN ('drop', 'cluster') AND ts.linked_set_id IS NULL
  ) THEN
    RAISE EXCEPTION 'linked_set_id required for drop/cluster';
  END IF;

  IF EXISTS (
    SELECT 1 FROM temp_sets ts
    WHERE ts.set_type IN ('drop', 'cluster')
      AND NOT EXISTS (
        SELECT 1 FROM temp_sets prev
        WHERE prev.exercise_id = ts.exercise_id
          AND prev.set_order = ts.set_order - 1
          AND prev.id = ts.linked_set_id
      )
  ) THEN
    RAISE EXCEPTION 'linked_set_id must reference previous set';
  END IF;

  IF EXISTS (
    SELECT 1 FROM temp_sets ts
    WHERE ts.set_type IN ('drop', 'cluster')
      AND ts.set_order > 0
      AND NOT EXISTS (
        SELECT 1 FROM temp_sets prev
        WHERE prev.exercise_id = ts.exercise_id
          AND prev.set_order = ts.set_order - 1
          AND (prev.set_type = 'normal' OR prev.set_type = ts.set_type)
      )
  ) THEN
    RAISE EXCEPTION 'drop/cluster sets must follow normal or same type sets';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM temp_exercises te
    WHERE te.superset_group_id IS NOT NULL
    GROUP BY te.superset_group_id
    HAVING COUNT(*) > 3
  ) THEN
    RAISE EXCEPTION 'max 3 exercises per superset group';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM temp_exercises te
    WHERE te.superset_group_id IS NOT NULL
    GROUP BY te.superset_group_id
    HAVING COUNT(*) > 1
      AND COUNT(DISTINCT te.position) > 1
  ) THEN
    RAISE EXCEPTION 'all exercises in a superset group must share the same position';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM (
      SELECT
        te.superset_group_id,
        te.id AS exercise_id,
        COUNT(ts.id) AS set_count
      FROM temp_exercises te
      LEFT JOIN temp_sets ts ON ts.exercise_id = te.id
      WHERE te.superset_group_id IS NOT NULL
      GROUP BY te.superset_group_id, te.id
    ) ex_sets
    WHERE superset_group_id IN (
      SELECT superset_group_id
      FROM temp_exercises
      GROUP BY superset_group_id
      HAVING COUNT(*) > 1
    )
    GROUP BY superset_group_id
    HAVING COUNT(DISTINCT set_count) > 1
  ) THEN
    RAISE EXCEPTION 'all exercises in a superset group must have the same number of sets';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM temp_sets ts
    JOIN temp_exercises te ON te.id = ts.exercise_id
    WHERE te.superset_group_id IN (
      SELECT superset_group_id
      FROM temp_exercises
      GROUP BY superset_group_id
      HAVING COUNT(*) > 1
    )
    AND ts.set_type <> 'normal'
  ) THEN
    RAISE EXCEPTION 'all sets in superset exercises must be type normal';
  END IF;

  DELETE FROM public.workout_exercises
  WHERE workout_id = v_workout_id;

  INSERT INTO public.workout_exercises (
    id, workout_id, variation_id, note, rest_seconds, position,
    superset_group_id, superset_order
  )
  SELECT
    te.id, v_workout_id, te.variation_id, te.note, te.rest_seconds, te.position,
    te.superset_group_id, te.superset_order
  FROM temp_exercises te;

  INSERT INTO public.workout_sets (
    id, workout_exercise_id, set_order, set_type, reps_min, reps_max,
    linked_set_id, load_percent_of_previous
  )
  SELECT
    ts.id, ts.exercise_id, ts.set_order, ts.set_type, ts.reps_min, ts.reps_max,
    ts.linked_set_id, ts.load_percent_of_previous
  FROM temp_sets ts;

  DELETE FROM public.workout_preparatory_exercises
  WHERE workout_id = v_workout_id;

  DROP TABLE IF EXISTS temp_prep_exercises;
  CREATE TEMP TABLE temp_prep_exercises AS
  SELECT
    (pe->>'id')::uuid AS id,
    (pe->>'variation_id')::uuid AS variation_id,
    (pe->>'position')::INTEGER AS position,
    pe->>'duration_type' AS duration_type,
    NULLIF(TRIM(pe->>'note'), '') AS note,
    pe AS raw_pe
  FROM jsonb_array_elements(COALESCE(payload->'preparatory_exercises', '[]'::jsonb)) pe;

  INSERT INTO public.workout_preparatory_exercises (
    id, workout_id, variation_id, "position", duration_type, note
  )
  SELECT
    tpe.id, v_workout_id, tpe.variation_id, tpe.position, tpe.duration_type, tpe.note
  FROM temp_prep_exercises tpe;

  INSERT INTO public.workout_preparatory_sets (
    id, workout_preparatory_exercise_id, set_order, duration_seconds, reps
  )
  SELECT
    (s->>'id')::uuid,
    tpe.id,
    (s->>'set_order')::INTEGER,
    (s->>'duration_seconds')::INTEGER,
    (s->>'reps')::INTEGER
  FROM temp_prep_exercises tpe
  CROSS JOIN LATERAL jsonb_array_elements(COALESCE(tpe.raw_pe->'sets', '[]'::jsonb)) s;

  -- Auto-share coach-owned variations with the target athlete.
  INSERT INTO public.shared_variations (variation_id, owner_id, shared_with_id)
  SELECT DISTINCT v.id, v.user_id, v_user_id
  FROM public.workout_exercises we
  JOIN public.variations v ON v.id = we.variation_id
  WHERE we.workout_id = v_workout_id
    AND v.user_id IS NOT NULL
    AND v.user_id <> v_user_id
  ON CONFLICT (variation_id, shared_with_id) DO NOTHING;

  INSERT INTO public.shared_variations (variation_id, owner_id, shared_with_id)
  SELECT DISTINCT v.id, v.user_id, v_user_id
  FROM public.workout_preparatory_exercises wpe
  JOIN public.variations v ON v.id = wpe.variation_id
  WHERE wpe.workout_id = v_workout_id
    AND v.user_id IS NOT NULL
    AND v.user_id <> v_user_id
  ON CONFLICT (variation_id, shared_with_id) DO NOTHING;

  RETURN v_workout_id;
END;
$$;


ALTER FUNCTION "public"."upsert_workout"("payload" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_coach_athlete_transition"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  actor_id uuid;
  coach_role public.user_role;
  transition_context text;
begin
  actor_id := auth.uid();
  transition_context := current_setting(
    'app.coach_athlete_transition_context',
    true
  );

  select role into coach_role
  from public.profiles
  where id = new.coach_id;

  if coach_role is distinct from 'coach' then
    raise exception 'Only coach users can be set as coach_id';
  end if;

  if tg_op = 'INSERT' then
    if transition_context = 'email_invite' then
      return new;
    end if;

    if actor_id is null or actor_id <> new.coach_id then
      raise exception 'Only the coach can create an invite';
    end if;

    if new.status <> 'pending' then
      raise exception 'New relationship must start as pending';
    end if;

    if new.invited_by <> actor_id then
      raise exception 'invited_by must match current coach user';
    end if;

    return new;
  end if;

  if tg_op = 'UPDATE' then
    if new.coach_id <> old.coach_id or new.athlete_id <> old.athlete_id then
      raise exception 'Cannot change coach_id or athlete_id after creation';
    end if;

    if old.status = 'pending' then
      if actor_id = old.athlete_id and new.status in ('active', 'declined') then
        new.responded_at = coalesce(new.responded_at, now());
        return new;
      end if;

      if actor_id = old.athlete_id
         and transition_context = 'accept_invite_swap'
         and new.status = 'canceled' then
        new.responded_at = coalesce(new.responded_at, now());
        return new;
      end if;

      if actor_id = old.coach_id and new.status = 'canceled' then
        return new;
      end if;
    end if;

    if old.status = 'active'
       and (
         (actor_id = old.coach_id and new.status = 'ended')
         or (
           actor_id = old.athlete_id
           and transition_context = 'accept_invite_swap'
           and new.status = 'ended'
         )
       ) then
      new.ended_at = coalesce(new.ended_at, now());
      return new;
    end if;

    raise exception 'Invalid relationship transition';
  end if;

  return new;
end;
$$;


ALTER FUNCTION "public"."validate_coach_athlete_transition"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_muscle_hierarchy"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  parent_level smallint;
BEGIN
  IF NEW.parent_id IS NULL THEN
    IF NEW.level <> 1 THEN
      RAISE EXCEPTION 'Muscle without parent must be level 1';
    END IF;
  ELSE
    SELECT level INTO STRICT parent_level FROM public.muscles WHERE id = NEW.parent_id;
    IF NEW.level <> parent_level + 1 THEN
      RAISE EXCEPTION 'Muscle level must be parent level + 1';
    END IF;
    IF parent_level = 3 THEN
      RAISE EXCEPTION 'Level 3 muscles cannot have children';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."validate_muscle_hierarchy"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_variation_muscle_level"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.muscles WHERE id = NEW.muscle_id AND level < 2) THEN
    RAISE EXCEPTION 'Primary muscle must be level 2 or 3';
  END IF;
  IF NEW.secondary_muscle_id IS NOT NULL AND
     EXISTS (SELECT 1 FROM public.muscles WHERE id = NEW.secondary_muscle_id AND level < 2) THEN
    RAISE EXCEPTION 'Secondary muscle must be level 2 or 3';
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."validate_variation_muscle_level"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."cardio_programs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_by" "uuid" NOT NULL,
    "athlete_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "instructions" "text",
    "duration_seconds" integer NOT NULL,
    "hr_mode" "text",
    "hr_zone" "text",
    "min_bpm" smallint,
    "max_bpm" smallint,
    "deleted_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "cardio_programs_bpm_range" CHECK ((("min_bpm" IS NULL) OR ("max_bpm" IS NULL) OR ("min_bpm" <= "max_bpm"))),
    CONSTRAINT "cardio_programs_duration_seconds_check" CHECK (("duration_seconds" > 0)),
    CONSTRAINT "cardio_programs_hr_consistency" CHECK (((("hr_mode" IS NULL) AND ("hr_zone" IS NULL) AND ("min_bpm" IS NULL) AND ("max_bpm" IS NULL)) OR (("hr_mode" = 'zone'::"text") AND ("hr_zone" IS NOT NULL)) OR (("hr_mode" = 'bpm'::"text") AND ("min_bpm" IS NOT NULL) AND ("max_bpm" IS NOT NULL) AND ("hr_zone" IS NULL)))),
    CONSTRAINT "cardio_programs_hr_mode_check" CHECK ((("hr_mode" IS NULL) OR ("hr_mode" = ANY (ARRAY['zone'::"text", 'bpm'::"text"])))),
    CONSTRAINT "cardio_programs_hr_zone_check" CHECK ((("hr_zone" IS NULL) OR ("hr_zone" = ANY (ARRAY['max'::"text", 'very_hard'::"text", 'hard'::"text", 'moderate'::"text", 'light'::"text"])))),
    CONSTRAINT "cardio_programs_max_bpm_check" CHECK ((("max_bpm" IS NULL) OR (("max_bpm" >= 30) AND ("max_bpm" <= 240)))),
    CONSTRAINT "cardio_programs_min_bpm_check" CHECK ((("min_bpm" IS NULL) OR (("min_bpm" >= 30) AND ("min_bpm" <= 240)))),
    CONSTRAINT "cardio_programs_name_check" CHECK (("length"(TRIM(BOTH FROM "name")) > 0))
);


ALTER TABLE "public"."cardio_programs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."coach_athletes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "coach_id" "uuid" NOT NULL,
    "athlete_id" "uuid" NOT NULL,
    "invited_by" "uuid" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "invited_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "responded_at" timestamp with time zone,
    "ended_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "default_session_duration" smallint DEFAULT 60 NOT NULL,
    "cancellation_policy_hours" smallint,
    "manual_approval_deadline_hours" smallint DEFAULT 48 NOT NULL,
    CONSTRAINT "coach_athletes_cancellation_policy_hours_check" CHECK ((("cancellation_policy_hours" IS NULL) OR ("cancellation_policy_hours" > 0))),
    CONSTRAINT "coach_athletes_default_session_duration_check" CHECK (("default_session_duration" > 0)),
    CONSTRAINT "coach_athletes_distinct_users" CHECK (("coach_id" <> "athlete_id")),
    CONSTRAINT "coach_athletes_manual_approval_deadline_hours_check" CHECK (("manual_approval_deadline_hours" > 0)),
    CONSTRAINT "coach_athletes_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'active'::"text", 'declined'::"text", 'canceled'::"text", 'ended'::"text"])))
);


ALTER TABLE "public"."coach_athletes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "updated_at" timestamp with time zone,
    "username" "text",
    "full_name" "text",
    "avatar_url" "text",
    "website" "text",
    "role" "public"."user_role" DEFAULT 'athlete'::"public"."user_role" NOT NULL,
    "slug" "text",
    "bio" "text",
    "city" "text",
    "specialties" "text"[],
    "credentials" "jsonb" DEFAULT '[]'::"jsonb",
    "contact_links" "jsonb" DEFAULT '[]'::"jsonb",
    "gallery_urls" "text"[] DEFAULT '{}'::"text"[],
    "profile_published" boolean DEFAULT false NOT NULL,
    "onboarding_completed" boolean DEFAULT false NOT NULL,
    "stripe_customer_id" "text",
    "avatar_crop_meta" "jsonb",
    "sex" "text",
    "birth_date" "date",
    CONSTRAINT "profiles_birth_date_check" CHECK ((("birth_date" IS NULL) OR ("birth_date" <= CURRENT_DATE))),
    CONSTRAINT "profiles_sex_check" CHECK ((("sex" IS NULL) OR ("sex" = ANY (ARRAY['male'::"text", 'female'::"text"])))),
    CONSTRAINT "profiles_slug_format" CHECK ((("slug" IS NULL) OR ("slug" ~ '^[a-z0-9][a-z0-9-]{1,58}[a-z0-9]$'::"text"))),
    CONSTRAINT "username_length" CHECK (("char_length"("username") >= 3))
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


COMMENT ON COLUMN "public"."profiles"."avatar_crop_meta" IS 'Crop metadata for avatar display: {x, y, width, height} as percentages of the original image';



CREATE OR REPLACE VIEW "public"."coach_athletes_with_profiles" WITH ("security_invoker"='true') AS
 SELECT "ca"."id" AS "relationship_id",
    "ca"."coach_id",
    "ca"."athlete_id",
    "ca"."status",
    "ca"."invited_at",
    "ca"."responded_at",
    "ca"."ended_at",
    "p"."full_name" AS "athlete_full_name",
    "p"."avatar_url" AS "athlete_avatar_url",
    "ca"."default_session_duration",
    "ca"."cancellation_policy_hours",
    "ca"."manual_approval_deadline_hours"
   FROM ("public"."coach_athletes" "ca"
     LEFT JOIN "public"."profiles" "p" ON (("p"."id" = "ca"."athlete_id")));


ALTER VIEW "public"."coach_athletes_with_profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."coach_availability" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "coach_id" "uuid" NOT NULL,
    "day_of_week" smallint NOT NULL,
    "start_time" time without time zone NOT NULL,
    "end_time" time without time zone NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "coach_availability_day_of_week_check" CHECK ((("day_of_week" >= 0) AND ("day_of_week" <= 6))),
    CONSTRAINT "coach_availability_time_range" CHECK (("start_time" < "end_time"))
);


ALTER TABLE "public"."coach_availability" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."coach_availability_overrides" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "coach_id" "uuid" NOT NULL,
    "date" "date" NOT NULL,
    "start_time" time without time zone,
    "end_time" time without time zone,
    "is_available" boolean DEFAULT false NOT NULL,
    "reason" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "coach_availability_overrides_time_range" CHECK (((("start_time" IS NULL) AND ("end_time" IS NULL)) OR (("start_time" IS NOT NULL) AND ("end_time" IS NOT NULL) AND ("start_time" < "end_time"))))
);


ALTER TABLE "public"."coach_availability_overrides" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."coach_gym_schedules" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "gym_id" "uuid" NOT NULL,
    "schedule_type" "text" NOT NULL,
    "day_of_week" smallint,
    "specific_date" "date",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "coach_gym_schedules_check" CHECK (((("schedule_type" = 'recurring'::"text") AND ("day_of_week" IS NOT NULL) AND ("specific_date" IS NULL)) OR (("schedule_type" = 'specific_date'::"text") AND ("specific_date" IS NOT NULL) AND ("day_of_week" IS NULL)) OR (("schedule_type" = 'default'::"text") AND ("day_of_week" IS NULL) AND ("specific_date" IS NULL)))),
    CONSTRAINT "coach_gym_schedules_schedule_type_check" CHECK (("schedule_type" = ANY (ARRAY['default'::"text", 'recurring'::"text", 'specific_date'::"text"])))
);


ALTER TABLE "public"."coach_gym_schedules" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."coach_gyms" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "coach_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "google_place_id" "text",
    "address" "text" NOT NULL,
    "city" "text" NOT NULL,
    "state" "text" NOT NULL,
    "location" "extensions"."geography"(Point,4326) NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."coach_gyms" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."coach_recurring_schedule_exceptions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "schedule_id" "uuid" NOT NULL,
    "exception_date" "date" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."coach_recurring_schedule_exceptions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."coach_recurring_schedules" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "coach_id" "uuid" NOT NULL,
    "athlete_id" "uuid",
    "start_time" time without time zone NOT NULL,
    "duration_minutes" smallint DEFAULT 60 NOT NULL,
    "effective_from" "date" NOT NULL,
    "effective_until" "date",
    "external_name" "text",
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "days_of_week" smallint[] DEFAULT '{}'::smallint[] NOT NULL,
    "interval_weeks" smallint DEFAULT 1 NOT NULL,
    "end_type" "text" DEFAULT 'never'::"text" NOT NULL,
    "end_date" "date",
    "end_count" smallint,
    "created_count" smallint DEFAULT 0 NOT NULL,
    "cron_expression" "text",
    CONSTRAINT "coach_recurring_schedules_date_range" CHECK ((("effective_until" IS NULL) OR ("effective_from" <= "effective_until"))),
    CONSTRAINT "coach_recurring_schedules_duration_minutes_check" CHECK (("duration_minutes" > 0)),
    CONSTRAINT "coach_recurring_schedules_end_count_check" CHECK ((("end_count" IS NULL) OR ("end_count" > 0))),
    CONSTRAINT "coach_recurring_schedules_end_type_check" CHECK (("end_type" = ANY (ARRAY['never'::"text", 'on_date'::"text", 'after_count'::"text"]))),
    CONSTRAINT "coach_recurring_schedules_interval_weeks_check" CHECK (("interval_weeks" > 0)),
    CONSTRAINT "coach_recurring_schedules_participant_check" CHECK ((("athlete_id" IS NOT NULL) OR ("external_name" IS NOT NULL)))
);


ALTER TABLE "public"."coach_recurring_schedules" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."coach_service_area_schedules" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "service_area_id" "uuid" NOT NULL,
    "schedule_type" "text" NOT NULL,
    "day_of_week" smallint,
    "specific_date" "date",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "coach_service_area_schedules_check" CHECK (((("schedule_type" = 'recurring'::"text") AND ("day_of_week" IS NOT NULL) AND ("specific_date" IS NULL)) OR (("schedule_type" = 'specific_date'::"text") AND ("specific_date" IS NOT NULL) AND ("day_of_week" IS NULL)) OR (("schedule_type" = 'default'::"text") AND ("day_of_week" IS NULL) AND ("specific_date" IS NULL)))),
    CONSTRAINT "coach_service_area_schedules_schedule_type_check" CHECK (("schedule_type" = ANY (ARRAY['default'::"text", 'recurring'::"text", 'specific_date'::"text"])))
);


ALTER TABLE "public"."coach_service_area_schedules" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."coach_service_areas" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "coach_id" "uuid" NOT NULL,
    "center" "extensions"."geography"(Point,4326) NOT NULL,
    "radius_km" double precision NOT NULL,
    "address" "text" NOT NULL,
    "city" "text" NOT NULL,
    "state" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."coach_service_areas" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."coach_service_types" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "coach_id" "uuid" NOT NULL,
    "service_type" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "coach_service_types_service_type_check" CHECK (("service_type" = ANY (ARRAY['online'::"text", 'in_person_gym'::"text", 'in_person_home'::"text"])))
);


ALTER TABLE "public"."coach_service_types" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."coach_session_disputes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "session_id" "uuid" NOT NULL,
    "author_id" "uuid" NOT NULL,
    "message" "text" NOT NULL,
    "resolution" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "coach_session_disputes_resolution_check" CHECK ((("resolution" IS NULL) OR ("resolution" = ANY (ARRAY['approved'::"text", 'rejected'::"text"]))))
);


ALTER TABLE "public"."coach_session_disputes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."coach_sessions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "coach_id" "uuid" NOT NULL,
    "athlete_id" "uuid",
    "scheduled_at" timestamp with time zone NOT NULL,
    "duration_minutes" smallint DEFAULT 60 NOT NULL,
    "status" "text" DEFAULT 'pending_approval'::"text" NOT NULL,
    "source" "text" DEFAULT 'scheduled'::"text" NOT NULL,
    "workout_log_id" "uuid",
    "requested_by" "uuid" NOT NULL,
    "approved_at" timestamp with time zone,
    "approved_by" "uuid",
    "canceled_at" timestamp with time zone,
    "canceled_by" "uuid",
    "cancellation_counts" boolean DEFAULT false NOT NULL,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "external_name" "text",
    "recurring_schedule_id" "uuid",
    CONSTRAINT "coach_sessions_duration_minutes_check" CHECK (("duration_minutes" > 0)),
    CONSTRAINT "coach_sessions_participant_check" CHECK ((("athlete_id" IS NOT NULL) OR ("external_name" IS NOT NULL))),
    CONSTRAINT "coach_sessions_source_check" CHECK (("source" = ANY (ARRAY['scheduled'::"text", 'manual'::"text", 'workout'::"text", 'recurring'::"text"]))),
    CONSTRAINT "coach_sessions_status_check" CHECK (("status" = ANY (ARRAY['pending_approval'::"text", 'scheduled'::"text", 'completed'::"text", 'canceled'::"text"])))
);


ALTER TABLE "public"."coach_sessions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."coach_testimonials" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "coach_id" "uuid" NOT NULL,
    "athlete_id" "uuid" NOT NULL,
    "content" "text" NOT NULL,
    "rating" smallint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    CONSTRAINT "coach_testimonials_distinct_users" CHECK (("coach_id" <> "athlete_id")),
    CONSTRAINT "coach_testimonials_rating_check" CHECK ((("rating" >= 1) AND ("rating" <= 5))),
    CONSTRAINT "coach_testimonials_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'published'::"text", 'unpublished'::"text"])))
);


ALTER TABLE "public"."coach_testimonials" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."equipments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "preposition" "text" DEFAULT 'com'::"text" NOT NULL,
    "slug" "text" NOT NULL,
    CONSTRAINT "equipments_name_nonempty" CHECK (("length"(TRIM(BOTH FROM "name")) > 0))
);


ALTER TABLE "public"."equipments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."exercises" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "user_id" "uuid",
    "created_by" "uuid",
    "updated_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "exercise_type" "text" DEFAULT 'musculacao'::"text" NOT NULL,
    CONSTRAINT "exercises_exercise_type_check" CHECK (("exercise_type" = ANY (ARRAY['preparatorio'::"text", 'musculacao'::"text"]))),
    CONSTRAINT "exercises_name_nonempty" CHECK (("length"(TRIM(BOTH FROM "name")) > 0))
);


ALTER TABLE "public"."exercises" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."feature_keys" (
    "key" "text" NOT NULL,
    "description" "text" NOT NULL
);


ALTER TABLE "public"."feature_keys" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."muscles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "parent_id" "uuid",
    "level" smallint DEFAULT 2 NOT NULL,
    "sort_order" smallint DEFAULT 0 NOT NULL,
    "slug" "text" NOT NULL,
    CONSTRAINT "muscles_level_check" CHECK ((("level" >= 1) AND ("level" <= 3))),
    CONSTRAINT "muscles_name_nonempty" CHECK (("length"(TRIM(BOTH FROM "name")) > 0))
);


ALTER TABLE "public"."muscles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."notification_preferences" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "notification_type" "text" NOT NULL,
    "enabled" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."notification_preferences" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."notifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "recipient_user_id" "uuid" NOT NULL,
    "sender_user_id" "uuid",
    "type" "text" NOT NULL,
    "title" "text" NOT NULL,
    "message" "text" NOT NULL,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "is_read" boolean DEFAULT false NOT NULL,
    "read_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "action_taken" "text",
    "action_taken_at" timestamp with time zone,
    CONSTRAINT "notifications_message_check" CHECK (("length"(TRIM(BOTH FROM "message")) > 0)),
    CONSTRAINT "notifications_read_state_check" CHECK (((("is_read" = false) AND ("read_at" IS NULL)) OR ("is_read" = true))),
    CONSTRAINT "notifications_title_check" CHECK (("length"(TRIM(BOTH FROM "title")) > 0)),
    CONSTRAINT "notifications_type_check" CHECK (("length"(TRIM(BOTH FROM "type")) > 0))
);


ALTER TABLE "public"."notifications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."payment_sessions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "payment_id" "uuid" NOT NULL,
    "session_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."payment_sessions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."payments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "coach_id" "uuid" NOT NULL,
    "amount" numeric(8,2) NOT NULL,
    "paid_at" timestamp with time zone NOT NULL,
    "payment_method" "text" NOT NULL,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "payments_amount_check" CHECK (("amount" > (0)::numeric))
);


ALTER TABLE "public"."payments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."periodization_adjustments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "periodization_id" "uuid" NOT NULL,
    "cycle_start" integer,
    "cycle_end" integer,
    "cycle_every" integer,
    "type" "text" NOT NULL,
    "payload" "jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "periodization_adjustments_check" CHECK ((("cycle_end" IS NULL) OR ("cycle_end" >= "cycle_start"))),
    CONSTRAINT "periodization_adjustments_microcycle_repetition_every_check" CHECK ((("cycle_every" IS NULL) OR ("cycle_every" >= 1))),
    CONSTRAINT "periodization_adjustments_microcycle_repetition_start_check" CHECK ((("cycle_start" IS NULL) OR ("cycle_start" >= 1))),
    CONSTRAINT "periodization_adjustments_type_check" CHECK (("type" = ANY (ARRAY['workout_override'::"text", 'extra_day'::"text", 'extra_activity'::"text", 'remove_day'::"text", 'remove_activity'::"text", 'swap'::"text", 'stop_until'::"text", 'note'::"text"])))
);


ALTER TABLE "public"."periodization_adjustments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."periodization_occurrences" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "periodization_id" "uuid" NOT NULL,
    "planned_date" "date" NOT NULL,
    "day_type" "text" NOT NULL,
    "workout_id" "uuid",
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "executed_at" timestamp with time zone,
    "workout_log_id" "uuid",
    "skipped_reason" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "cycle" integer NOT NULL,
    "template_day_id" "uuid",
    "template_activity_id" "uuid",
    "position_in_day" integer NOT NULL,
    "origin" "text" NOT NULL,
    "source_adjustment_id" "uuid",
    "kind" "text",
    "cardio_program_id" "uuid",
    CONSTRAINT "periodization_occurrences_day_type_check" CHECK (("day_type" = ANY (ARRAY['rest'::"text", 'training'::"text"]))),
    CONSTRAINT "periodization_occurrences_kind_check" CHECK ((("kind" IS NULL) OR ("kind" = ANY (ARRAY['workout'::"text", 'cardio'::"text"])))),
    CONSTRAINT "periodization_occurrences_kind_workout_check" CHECK ((("kind" IS DISTINCT FROM 'workout'::"text") OR ("workout_id" IS NOT NULL))),
    CONSTRAINT "periodization_occurrences_origin_check" CHECK (("origin" = ANY (ARRAY['template'::"text", 'extra'::"text"]))),
    CONSTRAINT "periodization_occurrences_rest_training_check" CHECK (((("day_type" = 'rest'::"text") AND ("kind" IS NULL) AND ("workout_id" IS NULL) AND ("position_in_day" = 0)) OR (("day_type" = 'training'::"text") AND ("kind" IS NOT NULL)))),
    CONSTRAINT "periodization_occurrences_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'done'::"text", 'skipped'::"text"])))
);


ALTER TABLE "public"."periodization_occurrences" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."periodization_template_activities" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "template_day_id" "uuid" NOT NULL,
    "position" integer NOT NULL,
    "kind" "text" NOT NULL,
    "workout_id" "uuid",
    "cardio_program_id" "uuid",
    CONSTRAINT "template_activities_kind_valid" CHECK (("kind" = ANY (ARRAY['workout'::"text", 'cardio'::"text"]))),
    CONSTRAINT "template_activities_position_nonneg" CHECK (("position" >= 0)),
    CONSTRAINT "template_activities_workout_required" CHECK ((("kind" = 'cardio'::"text") OR ("workout_id" IS NOT NULL)))
);


ALTER TABLE "public"."periodization_template_activities" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."periodization_template_days" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "periodization_id" "uuid" NOT NULL,
    "position" integer NOT NULL,
    "day_type" "text" NOT NULL,
    CONSTRAINT "template_days_day_type_valid" CHECK (("day_type" = ANY (ARRAY['rest'::"text", 'training'::"text"]))),
    CONSTRAINT "template_days_position_nonneg" CHECK (("position" >= 0))
);


ALTER TABLE "public"."periodization_template_days" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."periodizations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_by" "uuid" NOT NULL,
    "athlete_id" "uuid" NOT NULL,
    "start_date" "date" NOT NULL,
    "end_date" "date" NOT NULL,
    "objective" "text",
    "status" "text" DEFAULT 'draft'::"text" NOT NULL,
    "notification_days_before" integer,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "periodizations_date_range" CHECK (("end_date" > "start_date")),
    CONSTRAINT "periodizations_status_valid" CHECK (("status" = ANY (ARRAY['draft'::"text", 'active'::"text", 'completed'::"text"])))
);


ALTER TABLE "public"."periodizations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."plan_feature_limits" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "plan_id" "text" NOT NULL,
    "feature_key" "text" NOT NULL,
    "limit_value" integer,
    "enabled" boolean DEFAULT true NOT NULL
);


ALTER TABLE "public"."plan_feature_limits" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."push_subscriptions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "platform" "text" DEFAULT 'web'::"text" NOT NULL,
    "endpoint" "text",
    "p256dh_key" "text",
    "auth_key" "text",
    "device_token" "text",
    "user_agent" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "valid_platform" CHECK (("platform" = ANY (ARRAY['web'::"text", 'android'::"text", 'ios'::"text"]))),
    CONSTRAINT "web_fields_required" CHECK ((("platform" <> 'web'::"text") OR (("endpoint" IS NOT NULL) AND ("p256dh_key" IS NOT NULL) AND ("auth_key" IS NOT NULL))))
);


ALTER TABLE "public"."push_subscriptions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."report_favorites" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "target_user_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "notes" "text",
    "filters" "jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "name_max_length" CHECK (("char_length"("name") <= 100)),
    CONSTRAINT "notes_max_length" CHECK ((("notes" IS NULL) OR ("char_length"("notes") <= 500)))
);


ALTER TABLE "public"."report_favorites" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."shared_variations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "variation_id" "uuid" NOT NULL,
    "owner_id" "uuid" NOT NULL,
    "shared_with_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "shared_variations_no_self_share" CHECK (("owner_id" <> "shared_with_id"))
);


ALTER TABLE "public"."shared_variations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."stripe_events" (
    "id" "text" NOT NULL,
    "type" "text" NOT NULL,
    "processed_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."stripe_events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."stripe_price_map" (
    "lookup_key" "text" NOT NULL,
    "stripe_price_id" "text" NOT NULL,
    "stripe_product_id" "text" NOT NULL,
    "plan_code" "text" NOT NULL,
    "active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."stripe_price_map" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."subscription_feature_overrides" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "feature_key" "text" NOT NULL,
    "limit_value" integer,
    "enabled" boolean,
    "reason" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."subscription_feature_overrides" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."subscription_plans" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "code" "text" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."subscription_plans" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."subscriptions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "plan_id" "text" NOT NULL,
    "source" "text" NOT NULL,
    "granted_by" "uuid",
    "started_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "expires_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "stripe_subscription_id" "text",
    "stripe_price_id" "text",
    "stripe_status" "text",
    "trial_ends_at" timestamp with time zone,
    "current_period_end" timestamp with time zone,
    CONSTRAINT "subscriptions_source_check" CHECK (("source" = ANY (ARRAY['self'::"text", 'coach_grant'::"text"])))
);


ALTER TABLE "public"."subscriptions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."variation_videos" (
    "variation_id" "uuid" NOT NULL,
    "object_key" "text" NOT NULL,
    "thumbnail_key" "text",
    "duration_seconds" smallint NOT NULL,
    "size_bytes" integer NOT NULL,
    "content_type" "text" NOT NULL,
    "uploaded_by" "uuid" NOT NULL,
    "uploaded_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "processing_status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "processing_attempts" smallint DEFAULT 0 NOT NULL,
    "processing_started_at" timestamp with time zone,
    "last_dispatched_at" timestamp with time zone,
    "processing_error" "text",
    CONSTRAINT "variation_videos_content_type_check" CHECK (("content_type" = ANY (ARRAY['video/mp4'::"text", 'video/webm'::"text", 'video/quicktime'::"text"]))),
    CONSTRAINT "variation_videos_duration_seconds_check" CHECK ((("duration_seconds" >= 1) AND ("duration_seconds" <= 30))),
    CONSTRAINT "variation_videos_object_key_format" CHECK (("object_key" ~ '^(catalog|[0-9a-f-]{36})/[0-9a-f-]{36}/[0-9a-f-]{36}\.(mp4|webm|mov)$'::"text")),
    CONSTRAINT "variation_videos_processing_status_check" CHECK (("processing_status" = ANY (ARRAY['pending'::"text", 'processing'::"text", 'ready'::"text", 'failed'::"text"]))),
    CONSTRAINT "variation_videos_size_bytes_check" CHECK ((("size_bytes" >= 1) AND ("size_bytes" <= 104857600))),
    CONSTRAINT "variation_videos_thumbnail_key_format" CHECK ((("thumbnail_key" IS NULL) OR ("thumbnail_key" ~ '^(catalog|[0-9a-f-]{36})/[0-9a-f-]{36}/[0-9a-f-]{36}\.jpg$'::"text")))
);


ALTER TABLE "public"."variation_videos" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."variations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text",
    "exercise_id" "uuid" NOT NULL,
    "muscle_id" "uuid" NOT NULL,
    "equipment_id" "uuid" NOT NULL,
    "video_url" "text",
    "image_url" "text",
    "user_id" "uuid",
    "created_by" "uuid",
    "updated_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "secondary_muscle_id" "uuid",
    CONSTRAINT "variations_image_url_http" CHECK ((("image_url" IS NULL) OR ("image_url" ~* '^(https?:\/\/|\/).+\.(?:jpg|jpeg|png|webp|gif|svg|avif)(?:\?.*)?$'::"text"))),
    CONSTRAINT "variations_secondary_neq_primary" CHECK ((("secondary_muscle_id" IS NULL) OR ("secondary_muscle_id" <> "muscle_id"))),
    CONSTRAINT "variations_video_url_http" CHECK ((("video_url" IS NULL) OR ("video_url" ~* '^https?://'::"text")))
);


ALTER TABLE "public"."variations" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."variations_view" WITH ("security_invoker"='true') AS
 SELECT "v"."id",
    "v"."name",
    "v"."exercise_id",
    "e"."name" AS "exercise_name",
    "e"."exercise_type",
    "v"."muscle_id",
    "m"."name" AS "muscle_name",
    "m"."slug" AS "muscle_slug",
    COALESCE("m_parent"."name", "m"."name") AS "muscle_level2_name",
    COALESCE("m_parent"."slug", "m"."slug") AS "muscle_level2_slug",
    "v"."secondary_muscle_id",
    "sm"."name" AS "secondary_muscle_name",
    "sm"."slug" AS "secondary_muscle_slug",
    "v"."equipment_id",
    "eq"."name" AS "equipment_name",
    "eq"."slug" AS "equipment_slug",
    "eq"."preposition" AS "equipment_preposition",
    "v"."video_url",
    "v"."image_url",
    "v"."user_id",
    "vv"."object_key" AS "video_object_key",
    "vv"."thumbnail_key" AS "video_thumbnail_key",
    "vv"."duration_seconds" AS "video_duration_seconds",
    "vv"."processing_status" AS "video_processing_status"
   FROM (((((("public"."variations" "v"
     JOIN "public"."exercises" "e" ON (("e"."id" = "v"."exercise_id")))
     JOIN "public"."muscles" "m" ON (("m"."id" = "v"."muscle_id")))
     LEFT JOIN "public"."muscles" "m_parent" ON ((("m"."level" = 3) AND ("m_parent"."id" = "m"."parent_id"))))
     LEFT JOIN "public"."muscles" "sm" ON (("sm"."id" = "v"."secondary_muscle_id")))
     JOIN "public"."equipments" "eq" ON (("eq"."id" = "v"."equipment_id")))
     LEFT JOIN "public"."variation_videos" "vv" ON (("vv"."variation_id" = "v"."id")));


ALTER VIEW "public"."variations_view" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."workout_exercise_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "workout_log_id" "uuid" NOT NULL,
    "variation_id" "uuid",
    "position" integer NOT NULL,
    "note" "text",
    "rest_seconds" integer,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "superset_group_id" "uuid",
    "exercise_name" "text",
    "variation_name" "text",
    CONSTRAINT "workout_exercise_logs_position_check" CHECK (("position" >= 0))
);


ALTER TABLE "public"."workout_exercise_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."workout_exercise_set_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "workout_exercise_log_id" "uuid" NOT NULL,
    "set_order" integer NOT NULL,
    "set_type" "text" NOT NULL,
    "weight_kg" numeric(6,2),
    "reps" integer,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "reps_min" integer,
    "reps_max" integer,
    CONSTRAINT "workout_exercise_set_logs_reps_check" CHECK ((("reps" IS NULL) OR ("reps" > 0))),
    CONSTRAINT "workout_exercise_set_logs_set_order_check" CHECK (("set_order" >= 0)),
    CONSTRAINT "workout_exercise_set_logs_set_type_check" CHECK (("set_type" = ANY (ARRAY['warmup'::"text", 'normal'::"text", 'drop'::"text", 'cluster'::"text"])))
);


ALTER TABLE "public"."workout_exercise_set_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."workout_exercises" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "workout_id" "uuid" NOT NULL,
    "variation_id" "uuid" NOT NULL,
    "note" "text",
    "rest_seconds" integer,
    "position" integer NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "superset_group_id" "uuid" NOT NULL,
    "superset_order" integer DEFAULT 0 NOT NULL,
    CONSTRAINT "workout_exercises_position_positive" CHECK (("position" >= 0)),
    CONSTRAINT "workout_exercises_superset_order_check" CHECK (("superset_order" = ANY (ARRAY[0, 1, 2])))
);


ALTER TABLE "public"."workout_exercises" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."workout_folders" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" DEFAULT "auth"."uid"() NOT NULL,
    "name" "text" NOT NULL,
    "color" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "workout_folders_color_allowed" CHECK (("color" = ANY (ARRAY['blue'::"text", 'green'::"text", 'amber'::"text", 'red'::"text", 'purple'::"text", 'pink'::"text", 'cyan'::"text", 'slate'::"text"]))),
    CONSTRAINT "workout_folders_name_nonempty" CHECK (("length"(TRIM(BOTH FROM "name")) > 0))
);


ALTER TABLE "public"."workout_folders" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."workout_log_summaries" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "workout_log_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "summary_snapshot" "jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "workout_log_summaries_snapshot_object" CHECK (("jsonb_typeof"("summary_snapshot") = 'object'::"text"))
);


ALTER TABLE "public"."workout_log_summaries" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."workout_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "workout_id" "uuid",
    "user_id" "uuid" NOT NULL,
    "started_by" "uuid" NOT NULL,
    "started_at" timestamp with time zone NOT NULL,
    "finished_at" timestamp with time zone NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "deleted_at" timestamp with time zone,
    "deleted_by" "uuid",
    "note" "text",
    "coach_session_id" "uuid",
    "is_coached" boolean DEFAULT false NOT NULL
);


ALTER TABLE "public"."workout_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."workout_preparatory_exercise_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "workout_log_id" "uuid" NOT NULL,
    "variation_id" "uuid",
    "position" integer NOT NULL,
    "duration_type" "text" NOT NULL,
    "note" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "exercise_name" "text",
    "variation_name" "text",
    CONSTRAINT "workout_preparatory_exercise_logs_duration_type_check" CHECK (("duration_type" = ANY (ARRAY['time'::"text", 'reps'::"text"]))),
    CONSTRAINT "workout_preparatory_exercise_logs_position_positive" CHECK (("position" >= 0))
);


ALTER TABLE "public"."workout_preparatory_exercise_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."workout_preparatory_exercises" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "workout_id" "uuid" NOT NULL,
    "variation_id" "uuid" NOT NULL,
    "position" integer NOT NULL,
    "duration_type" "text" NOT NULL,
    "note" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "workout_preparatory_exercises_duration_type_check" CHECK (("duration_type" = ANY (ARRAY['time'::"text", 'reps'::"text"]))),
    CONSTRAINT "workout_preparatory_exercises_position_positive" CHECK (("position" >= 0))
);


ALTER TABLE "public"."workout_preparatory_exercises" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."workout_preparatory_set_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "workout_preparatory_exercise_log_id" "uuid" NOT NULL,
    "set_order" integer NOT NULL,
    "duration_seconds" integer,
    "reps" integer,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "workout_preparatory_set_logs_duration_seconds_positive" CHECK ((("duration_seconds" IS NULL) OR ("duration_seconds" > 0))),
    CONSTRAINT "workout_preparatory_set_logs_order_positive" CHECK (("set_order" >= 0)),
    CONSTRAINT "workout_preparatory_set_logs_reps_positive" CHECK ((("reps" IS NULL) OR ("reps" > 0)))
);


ALTER TABLE "public"."workout_preparatory_set_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."workout_preparatory_sets" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "workout_preparatory_exercise_id" "uuid" NOT NULL,
    "set_order" integer NOT NULL,
    "duration_seconds" integer,
    "reps" integer,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "workout_preparatory_sets_duration_seconds_positive" CHECK ((("duration_seconds" IS NULL) OR ("duration_seconds" > 0))),
    CONSTRAINT "workout_preparatory_sets_has_value" CHECK ((("duration_seconds" IS NOT NULL) OR ("reps" IS NOT NULL))),
    CONSTRAINT "workout_preparatory_sets_order_positive" CHECK (("set_order" >= 0)),
    CONSTRAINT "workout_preparatory_sets_reps_positive" CHECK ((("reps" IS NULL) OR ("reps" > 0)))
);


ALTER TABLE "public"."workout_preparatory_sets" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."workout_sets" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "workout_exercise_id" "uuid" NOT NULL,
    "set_order" integer NOT NULL,
    "set_type" "text" NOT NULL,
    "reps_min" integer NOT NULL,
    "reps_max" integer NOT NULL,
    "linked_set_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "load_percent_of_previous" integer,
    CONSTRAINT "workout_sets_load_percent_check" CHECK ((("load_percent_of_previous" IS NULL) OR ("load_percent_of_previous" >= 0))),
    CONSTRAINT "workout_sets_order_positive" CHECK (("set_order" >= 0)),
    CONSTRAINT "workout_sets_reps_max" CHECK (("reps_max" >= "reps_min")),
    CONSTRAINT "workout_sets_reps_min" CHECK (("reps_min" > 0)),
    CONSTRAINT "workout_sets_set_type" CHECK (("set_type" = ANY (ARRAY['warmup'::"text", 'normal'::"text", 'drop'::"text", 'cluster'::"text"])))
);


ALTER TABLE "public"."workout_sets" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."workout_variation_records" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "variation_id" "uuid" NOT NULL,
    "max_weight_kg" numeric(8,2),
    "max_volume_kg" numeric(10,2),
    "max_reps" integer,
    "max_sets" integer,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "workout_variation_records_max_reps_nonnegative" CHECK ((("max_reps" IS NULL) OR ("max_reps" >= 0))),
    CONSTRAINT "workout_variation_records_max_sets_nonnegative" CHECK ((("max_sets" IS NULL) OR ("max_sets" >= 0))),
    CONSTRAINT "workout_variation_records_max_volume_nonnegative" CHECK ((("max_volume_kg" IS NULL) OR ("max_volume_kg" >= (0)::numeric))),
    CONSTRAINT "workout_variation_records_max_weight_nonnegative" CHECK ((("max_weight_kg" IS NULL) OR ("max_weight_kg" >= (0)::numeric)))
);


ALTER TABLE "public"."workout_variation_records" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."workouts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" DEFAULT "auth"."uid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "archived_at" timestamp with time zone,
    "created_by" "uuid",
    "updated_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "folder_id" "uuid",
    CONSTRAINT "workouts_name_nonempty" CHECK (("length"(TRIM(BOTH FROM "name")) > 0))
);


ALTER TABLE "public"."workouts" OWNER TO "postgres";


ALTER TABLE ONLY "public"."cardio_programs"
    ADD CONSTRAINT "cardio_programs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."coach_athletes"
    ADD CONSTRAINT "coach_athletes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."coach_availability_overrides"
    ADD CONSTRAINT "coach_availability_overrides_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."coach_availability"
    ADD CONSTRAINT "coach_availability_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."coach_gym_schedules"
    ADD CONSTRAINT "coach_gym_schedules_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."coach_gyms"
    ADD CONSTRAINT "coach_gyms_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."coach_recurring_schedule_exceptions"
    ADD CONSTRAINT "coach_recurring_schedule_excepti_schedule_id_exception_date_key" UNIQUE ("schedule_id", "exception_date");



ALTER TABLE ONLY "public"."coach_recurring_schedule_exceptions"
    ADD CONSTRAINT "coach_recurring_schedule_exceptions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."coach_recurring_schedules"
    ADD CONSTRAINT "coach_recurring_schedules_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."coach_service_area_schedules"
    ADD CONSTRAINT "coach_service_area_schedules_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."coach_service_areas"
    ADD CONSTRAINT "coach_service_areas_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."coach_service_types"
    ADD CONSTRAINT "coach_service_types_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."coach_session_disputes"
    ADD CONSTRAINT "coach_session_disputes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."coach_sessions"
    ADD CONSTRAINT "coach_sessions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."coach_testimonials"
    ADD CONSTRAINT "coach_testimonials_one_per_pair" UNIQUE ("coach_id", "athlete_id");



ALTER TABLE ONLY "public"."coach_testimonials"
    ADD CONSTRAINT "coach_testimonials_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."equipments"
    ADD CONSTRAINT "equipments_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."equipments"
    ADD CONSTRAINT "equipments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."equipments"
    ADD CONSTRAINT "equipments_slug_unique" UNIQUE ("slug");



ALTER TABLE ONLY "public"."exercises"
    ADD CONSTRAINT "exercises_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."feature_keys"
    ADD CONSTRAINT "feature_keys_pkey" PRIMARY KEY ("key");



ALTER TABLE ONLY "public"."muscles"
    ADD CONSTRAINT "muscles_name_parent_unique" UNIQUE NULLS NOT DISTINCT ("name", "parent_id");



ALTER TABLE ONLY "public"."muscles"
    ADD CONSTRAINT "muscles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."muscles"
    ADD CONSTRAINT "muscles_slug_unique" UNIQUE ("slug");



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."subscriptions"
    ADD CONSTRAINT "one_subscription_per_user" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."payment_sessions"
    ADD CONSTRAINT "payment_sessions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."payment_sessions"
    ADD CONSTRAINT "payment_sessions_session_unique" UNIQUE ("session_id");



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."periodization_adjustments"
    ADD CONSTRAINT "periodization_adjustments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."periodization_occurrences"
    ADD CONSTRAINT "periodization_occurrences_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."periodization_occurrences"
    ADD CONSTRAINT "periodization_occurrences_unique_slot" UNIQUE ("periodization_id", "planned_date", "position_in_day");



ALTER TABLE ONLY "public"."periodization_template_activities"
    ADD CONSTRAINT "periodization_template_activities_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."periodization_template_days"
    ADD CONSTRAINT "periodization_template_days_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."periodizations"
    ADD CONSTRAINT "periodizations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."plan_feature_limits"
    ADD CONSTRAINT "plan_feature_limits_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."plan_feature_limits"
    ADD CONSTRAINT "plan_feature_limits_plan_id_feature_key_key" UNIQUE ("plan_id", "feature_key");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_stripe_customer_id_key" UNIQUE ("stripe_customer_id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_username_key" UNIQUE ("username");



ALTER TABLE ONLY "public"."notification_preferences"
    ADD CONSTRAINT "push_notification_preferences_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notification_preferences"
    ADD CONSTRAINT "push_notification_preferences_user_id_notification_type_key" UNIQUE ("user_id", "notification_type");



ALTER TABLE ONLY "public"."push_subscriptions"
    ADD CONSTRAINT "push_subscriptions_endpoint_unique" UNIQUE ("endpoint");



ALTER TABLE ONLY "public"."push_subscriptions"
    ADD CONSTRAINT "push_subscriptions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."report_favorites"
    ADD CONSTRAINT "report_favorites_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."shared_variations"
    ADD CONSTRAINT "shared_variations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."shared_variations"
    ADD CONSTRAINT "shared_variations_unique_pair" UNIQUE ("variation_id", "shared_with_id");



ALTER TABLE ONLY "public"."stripe_events"
    ADD CONSTRAINT "stripe_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."stripe_price_map"
    ADD CONSTRAINT "stripe_price_map_pkey" PRIMARY KEY ("lookup_key");



ALTER TABLE ONLY "public"."subscription_feature_overrides"
    ADD CONSTRAINT "subscription_feature_overrides_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."subscription_feature_overrides"
    ADD CONSTRAINT "subscription_feature_overrides_user_id_feature_key_key" UNIQUE ("user_id", "feature_key");



ALTER TABLE ONLY "public"."subscription_plans"
    ADD CONSTRAINT "subscription_plans_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."subscription_plans"
    ADD CONSTRAINT "subscription_plans_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."subscriptions"
    ADD CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."periodization_template_activities"
    ADD CONSTRAINT "template_activities_position_unique" UNIQUE ("template_day_id", "position");



ALTER TABLE ONLY "public"."periodization_template_days"
    ADD CONSTRAINT "template_days_position_unique" UNIQUE ("periodization_id", "position");



ALTER TABLE ONLY "public"."variation_videos"
    ADD CONSTRAINT "variation_videos_pkey" PRIMARY KEY ("variation_id");



ALTER TABLE ONLY "public"."variations"
    ADD CONSTRAINT "variations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."workout_exercise_logs"
    ADD CONSTRAINT "workout_exercise_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."workout_exercise_set_logs"
    ADD CONSTRAINT "workout_exercise_set_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."workout_exercises"
    ADD CONSTRAINT "workout_exercises_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."workout_folders"
    ADD CONSTRAINT "workout_folders_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."workout_folders"
    ADD CONSTRAINT "workout_folders_user_name_unique" UNIQUE ("user_id", "name");



ALTER TABLE ONLY "public"."workout_log_summaries"
    ADD CONSTRAINT "workout_log_summaries_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."workout_log_summaries"
    ADD CONSTRAINT "workout_log_summaries_workout_log_id_key" UNIQUE ("workout_log_id");



ALTER TABLE ONLY "public"."workout_logs"
    ADD CONSTRAINT "workout_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."workout_preparatory_exercise_logs"
    ADD CONSTRAINT "workout_preparatory_exercise_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."workout_preparatory_exercises"
    ADD CONSTRAINT "workout_preparatory_exercises_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."workout_preparatory_set_logs"
    ADD CONSTRAINT "workout_preparatory_set_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."workout_preparatory_sets"
    ADD CONSTRAINT "workout_preparatory_sets_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."workout_sets"
    ADD CONSTRAINT "workout_sets_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."workout_variation_records"
    ADD CONSTRAINT "workout_variation_records_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."workout_variation_records"
    ADD CONSTRAINT "workout_variation_records_user_variation_uidx" UNIQUE ("user_id", "variation_id");



ALTER TABLE ONLY "public"."workouts"
    ADD CONSTRAINT "workouts_pkey" PRIMARY KEY ("id");



CREATE INDEX "cardio_programs_active_idx" ON "public"."cardio_programs" USING "btree" ("athlete_id") WHERE ("deleted_at" IS NULL);



CREATE UNIQUE INDEX "coach_athletes_active_athlete_unique_idx" ON "public"."coach_athletes" USING "btree" ("athlete_id") WHERE ("status" = 'active'::"text");



CREATE INDEX "coach_athletes_athlete_id_idx" ON "public"."coach_athletes" USING "btree" ("athlete_id");



CREATE INDEX "coach_athletes_coach_id_idx" ON "public"."coach_athletes" USING "btree" ("coach_id");



CREATE INDEX "coach_testimonials_coach_id_idx" ON "public"."coach_testimonials" USING "btree" ("coach_id");



CREATE INDEX "exercises_created_by_idx" ON "public"."exercises" USING "btree" ("created_by");



CREATE INDEX "exercises_updated_by_idx" ON "public"."exercises" USING "btree" ("updated_by");



CREATE INDEX "exercises_user_id_idx" ON "public"."exercises" USING "btree" ("user_id");



CREATE INDEX "idx_coach_availability_coach_id" ON "public"."coach_availability" USING "btree" ("coach_id");



CREATE INDEX "idx_coach_availability_overrides_coach_date" ON "public"."coach_availability_overrides" USING "btree" ("coach_id", "date");



CREATE INDEX "idx_coach_gym_schedules_gym_id" ON "public"."coach_gym_schedules" USING "btree" ("gym_id");



CREATE INDEX "idx_coach_gyms_coach_id" ON "public"."coach_gyms" USING "btree" ("coach_id");



CREATE INDEX "idx_coach_gyms_location" ON "public"."coach_gyms" USING "gist" ("location");



CREATE INDEX "idx_coach_recurring_schedules_athlete_id" ON "public"."coach_recurring_schedules" USING "btree" ("athlete_id");



CREATE INDEX "idx_coach_recurring_schedules_coach_id" ON "public"."coach_recurring_schedules" USING "btree" ("coach_id");



CREATE INDEX "idx_coach_service_area_schedules_area_id" ON "public"."coach_service_area_schedules" USING "btree" ("service_area_id");



CREATE INDEX "idx_coach_service_areas_center" ON "public"."coach_service_areas" USING "gist" ("center");



CREATE INDEX "idx_coach_service_areas_coach_id" ON "public"."coach_service_areas" USING "btree" ("coach_id");



CREATE UNIQUE INDEX "idx_coach_service_types_coach_id_service_type" ON "public"."coach_service_types" USING "btree" ("coach_id", "service_type");



CREATE INDEX "idx_coach_session_disputes_session_id" ON "public"."coach_session_disputes" USING "btree" ("session_id");



CREATE INDEX "idx_coach_sessions_athlete_id" ON "public"."coach_sessions" USING "btree" ("athlete_id");



CREATE INDEX "idx_coach_sessions_coach_id" ON "public"."coach_sessions" USING "btree" ("coach_id");



CREATE INDEX "idx_coach_sessions_recurring_schedule_id" ON "public"."coach_sessions" USING "btree" ("recurring_schedule_id");



CREATE INDEX "idx_coach_sessions_scheduled_at" ON "public"."coach_sessions" USING "btree" ("scheduled_at");



CREATE INDEX "idx_coach_sessions_status" ON "public"."coach_sessions" USING "btree" ("status");



CREATE INDEX "idx_coach_sessions_workout_log_id" ON "public"."coach_sessions" USING "btree" ("workout_log_id");



CREATE INDEX "idx_payment_sessions_payment_id" ON "public"."payment_sessions" USING "btree" ("payment_id");



CREATE INDEX "idx_payment_sessions_session_id" ON "public"."payment_sessions" USING "btree" ("session_id");



CREATE INDEX "idx_payments_coach_id" ON "public"."payments" USING "btree" ("coach_id");



CREATE INDEX "idx_payments_paid_at" ON "public"."payments" USING "btree" ("paid_at");



CREATE INDEX "idx_push_subscriptions_user_id" ON "public"."push_subscriptions" USING "btree" ("user_id");



CREATE INDEX "idx_recurring_exceptions_schedule_id" ON "public"."coach_recurring_schedule_exceptions" USING "btree" ("schedule_id");



CREATE INDEX "idx_shared_variations_owner_id" ON "public"."shared_variations" USING "btree" ("owner_id");



CREATE INDEX "idx_shared_variations_shared_with_id" ON "public"."shared_variations" USING "btree" ("shared_with_id");



CREATE INDEX "idx_variations_secondary_muscle_id" ON "public"."variations" USING "btree" ("secondary_muscle_id");



CREATE INDEX "idx_workout_logs_coach_session_id" ON "public"."workout_logs" USING "btree" ("coach_session_id");



CREATE INDEX "notifications_recipient_created_at_idx" ON "public"."notifications" USING "btree" ("recipient_user_id", "created_at" DESC);



CREATE INDEX "notifications_recipient_is_read_idx" ON "public"."notifications" USING "btree" ("recipient_user_id", "is_read");



CREATE INDEX "periodization_adjustments_pz_idx" ON "public"."periodization_adjustments" USING "btree" ("periodization_id");



CREATE INDEX "periodization_adjustments_type_idx" ON "public"."periodization_adjustments" USING "btree" ("type");



CREATE INDEX "periodization_occurrences_cardio_program_idx" ON "public"."periodization_occurrences" USING "btree" ("cardio_program_id") WHERE ("cardio_program_id" IS NOT NULL);



CREATE INDEX "periodization_occurrences_date_idx" ON "public"."periodization_occurrences" USING "btree" ("periodization_id", "planned_date");



CREATE INDEX "periodization_occurrences_log_idx" ON "public"."periodization_occurrences" USING "btree" ("workout_log_id") WHERE ("workout_log_id" IS NOT NULL);



CREATE INDEX "periodization_occurrences_periodization_idx" ON "public"."periodization_occurrences" USING "btree" ("periodization_id", "planned_date");



CREATE INDEX "periodization_occurrences_status_idx" ON "public"."periodization_occurrences" USING "btree" ("periodization_id", "status");



CREATE INDEX "periodization_template_activities_cardio_program_idx" ON "public"."periodization_template_activities" USING "btree" ("cardio_program_id") WHERE ("cardio_program_id" IS NOT NULL);



CREATE INDEX "periodization_template_activities_day_idx" ON "public"."periodization_template_activities" USING "btree" ("template_day_id");



CREATE INDEX "periodization_template_days_periodization_idx" ON "public"."periodization_template_days" USING "btree" ("periodization_id");



CREATE INDEX "periodizations_athlete_id_idx" ON "public"."periodizations" USING "btree" ("athlete_id");



CREATE INDEX "periodizations_created_by_idx" ON "public"."periodizations" USING "btree" ("created_by");



CREATE UNIQUE INDEX "periodizations_one_active_per_athlete" ON "public"."periodizations" USING "btree" ("athlete_id") WHERE ("status" = 'active'::"text");



CREATE INDEX "periodizations_status_idx" ON "public"."periodizations" USING "btree" ("status");



CREATE INDEX "report_favorites_user_id_created_at_idx" ON "public"."report_favorites" USING "btree" ("user_id", "created_at" DESC);



CREATE INDEX "subscriptions_granted_by_idx" ON "public"."subscriptions" USING "btree" ("granted_by");



CREATE INDEX "subscriptions_plan_id_idx" ON "public"."subscriptions" USING "btree" ("plan_id");



CREATE INDEX "subscriptions_stripe_subscription_id_idx" ON "public"."subscriptions" USING "btree" ("stripe_subscription_id");



CREATE INDEX "variation_videos_pending_idx" ON "public"."variation_videos" USING "btree" ("uploaded_at") WHERE ("processing_status" = ANY (ARRAY['pending'::"text", 'processing'::"text"]));



CREATE INDEX "variation_videos_uploaded_by_idx" ON "public"."variation_videos" USING "btree" ("uploaded_by");



CREATE INDEX "variations_created_by_idx" ON "public"."variations" USING "btree" ("created_by");



CREATE INDEX "variations_equipment_id_idx" ON "public"."variations" USING "btree" ("equipment_id");



CREATE INDEX "variations_exercise_id_idx" ON "public"."variations" USING "btree" ("exercise_id");



CREATE INDEX "variations_muscle_id_idx" ON "public"."variations" USING "btree" ("muscle_id");



CREATE INDEX "variations_updated_by_idx" ON "public"."variations" USING "btree" ("updated_by");



CREATE INDEX "variations_user_id_idx" ON "public"."variations" USING "btree" ("user_id");



CREATE INDEX "workout_exercise_logs_log_id_idx" ON "public"."workout_exercise_logs" USING "btree" ("workout_log_id");



CREATE INDEX "workout_exercise_logs_variation_id_idx" ON "public"."workout_exercise_logs" USING "btree" ("variation_id");



CREATE INDEX "workout_exercise_set_logs_exercise_log_id_idx" ON "public"."workout_exercise_set_logs" USING "btree" ("workout_exercise_log_id");



CREATE INDEX "workout_exercises_variation_id_idx" ON "public"."workout_exercises" USING "btree" ("variation_id");



CREATE INDEX "workout_exercises_workout_id_idx" ON "public"."workout_exercises" USING "btree" ("workout_id");



CREATE UNIQUE INDEX "workout_exercises_workout_position_superset_uidx" ON "public"."workout_exercises" USING "btree" ("workout_id", "position", "superset_order");



CREATE INDEX "workout_folders_user_id_idx" ON "public"."workout_folders" USING "btree" ("user_id");



CREATE INDEX "workout_log_summaries_user_id_idx" ON "public"."workout_log_summaries" USING "btree" ("user_id");



CREATE INDEX "workout_log_summaries_workout_log_id_idx" ON "public"."workout_log_summaries" USING "btree" ("workout_log_id");



CREATE INDEX "workout_logs_active_user_idx" ON "public"."workout_logs" USING "btree" ("user_id") WHERE ("deleted_at" IS NULL);



CREATE INDEX "workout_logs_started_by_idx" ON "public"."workout_logs" USING "btree" ("started_by");



CREATE INDEX "workout_logs_user_id_idx" ON "public"."workout_logs" USING "btree" ("user_id");



CREATE INDEX "workout_logs_user_id_started_at_idx" ON "public"."workout_logs" USING "btree" ("user_id", "started_at" DESC);



CREATE INDEX "workout_logs_workout_id_idx" ON "public"."workout_logs" USING "btree" ("workout_id");



CREATE INDEX "workout_preparatory_exercise_logs_log_id_idx" ON "public"."workout_preparatory_exercise_logs" USING "btree" ("workout_log_id");



CREATE UNIQUE INDEX "workout_preparatory_exercise_logs_log_position_uidx" ON "public"."workout_preparatory_exercise_logs" USING "btree" ("workout_log_id", "position");



CREATE INDEX "workout_preparatory_exercise_logs_variation_id_idx" ON "public"."workout_preparatory_exercise_logs" USING "btree" ("variation_id");



CREATE INDEX "workout_preparatory_exercises_variation_id_idx" ON "public"."workout_preparatory_exercises" USING "btree" ("variation_id");



CREATE INDEX "workout_preparatory_exercises_workout_id_idx" ON "public"."workout_preparatory_exercises" USING "btree" ("workout_id");



CREATE UNIQUE INDEX "workout_preparatory_exercises_workout_position_uidx" ON "public"."workout_preparatory_exercises" USING "btree" ("workout_id", "position");



CREATE INDEX "workout_preparatory_set_logs_exercise_log_id_idx" ON "public"."workout_preparatory_set_logs" USING "btree" ("workout_preparatory_exercise_log_id");



CREATE UNIQUE INDEX "workout_preparatory_set_logs_exercise_log_order_uidx" ON "public"."workout_preparatory_set_logs" USING "btree" ("workout_preparatory_exercise_log_id", "set_order");



CREATE INDEX "workout_preparatory_sets_exercise_id_idx" ON "public"."workout_preparatory_sets" USING "btree" ("workout_preparatory_exercise_id");



CREATE UNIQUE INDEX "workout_preparatory_sets_exercise_order_uidx" ON "public"."workout_preparatory_sets" USING "btree" ("workout_preparatory_exercise_id", "set_order");



CREATE INDEX "workout_sets_exercise_id_idx" ON "public"."workout_sets" USING "btree" ("workout_exercise_id");



CREATE UNIQUE INDEX "workout_sets_exercise_order_uidx" ON "public"."workout_sets" USING "btree" ("workout_exercise_id", "set_order");



CREATE INDEX "workout_variation_records_user_id_idx" ON "public"."workout_variation_records" USING "btree" ("user_id");



CREATE INDEX "workout_variation_records_variation_id_idx" ON "public"."workout_variation_records" USING "btree" ("variation_id");



CREATE INDEX "workouts_archived_at_idx" ON "public"."workouts" USING "btree" ("archived_at");



CREATE INDEX "workouts_created_by_idx" ON "public"."workouts" USING "btree" ("created_by");



CREATE INDEX "workouts_folder_id_idx" ON "public"."workouts" USING "btree" ("folder_id") WHERE ("folder_id" IS NOT NULL);



CREATE INDEX "workouts_updated_by_idx" ON "public"."workouts" USING "btree" ("updated_by");



CREATE INDEX "workouts_user_id_idx" ON "public"."workouts" USING "btree" ("user_id");



CREATE OR REPLACE TRIGGER "broadcast_changes_for_notifications_created" AFTER INSERT ON "public"."notifications" FOR EACH ROW EXECUTE FUNCTION "public"."broadcast_notification_insert"();



CREATE OR REPLACE TRIGGER "cardio_programs_set_updated_at" BEFORE UPDATE ON "public"."cardio_programs" FOR EACH ROW EXECUTE FUNCTION "public"."set_timestamps"();



CREATE OR REPLACE TRIGGER "coach_athletes_set_timestamps" BEFORE INSERT OR UPDATE ON "public"."coach_athletes" FOR EACH ROW EXECUTE FUNCTION "public"."set_timestamps"();



CREATE OR REPLACE TRIGGER "coach_athletes_transition_guard" BEFORE INSERT OR UPDATE ON "public"."coach_athletes" FOR EACH ROW EXECUTE FUNCTION "public"."validate_coach_athlete_transition"();



CREATE OR REPLACE TRIGGER "coach_availability_set_timestamps" BEFORE INSERT OR UPDATE ON "public"."coach_availability" FOR EACH ROW EXECUTE FUNCTION "public"."set_timestamps"();



CREATE OR REPLACE TRIGGER "coach_recurring_schedules_set_timestamps" BEFORE INSERT OR UPDATE ON "public"."coach_recurring_schedules" FOR EACH ROW EXECUTE FUNCTION "public"."set_timestamps"();



CREATE OR REPLACE TRIGGER "coach_sessions_set_timestamps" BEFORE INSERT OR UPDATE ON "public"."coach_sessions" FOR EACH ROW EXECUTE FUNCTION "public"."set_timestamps"();



CREATE OR REPLACE TRIGGER "exercises_set_audit_fields" BEFORE INSERT OR UPDATE ON "public"."exercises" FOR EACH ROW EXECUTE FUNCTION "public"."set_exercise_record_audit_fields"();



CREATE OR REPLACE TRIGGER "exercises_set_timestamps" BEFORE INSERT OR UPDATE ON "public"."exercises" FOR EACH ROW EXECUTE FUNCTION "public"."set_timestamps"();



CREATE OR REPLACE TRIGGER "notifications_broadcast_insert" AFTER INSERT ON "public"."notifications" FOR EACH ROW EXECUTE FUNCTION "public"."broadcast_notification_insert"();



CREATE OR REPLACE TRIGGER "notifications_guard_update" BEFORE UPDATE ON "public"."notifications" FOR EACH ROW EXECUTE FUNCTION "public"."guard_notification_update"();



CREATE OR REPLACE TRIGGER "notifications_set_timestamps" BEFORE INSERT OR UPDATE ON "public"."notifications" FOR EACH ROW EXECUTE FUNCTION "public"."set_timestamps"();



CREATE OR REPLACE TRIGGER "on_notification_insert_send_push" AFTER INSERT ON "public"."notifications" FOR EACH ROW EXECUTE FUNCTION "supabase_functions"."http_request"('https://xkahfwraybxyofitlymo.supabase.co/functions/v1/send-push', 'POST', '{"Content-Type":"application/json"}', '{}', '5000');



CREATE OR REPLACE TRIGGER "on_profile_created_subscription" AFTER INSERT ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."handle_new_subscription"();



DROP TRIGGER IF EXISTS "on_auth_user_created" ON "auth"."users";
CREATE TRIGGER "on_auth_user_created" AFTER INSERT ON "auth"."users" FOR EACH ROW EXECUTE FUNCTION "public"."handle_new_user"();



CREATE OR REPLACE TRIGGER "payments_set_timestamps" BEFORE INSERT OR UPDATE ON "public"."payments" FOR EACH ROW EXECUTE FUNCTION "public"."set_timestamps"();



CREATE OR REPLACE TRIGGER "profiles_role_transition_guard" BEFORE UPDATE OF "role" ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."guard_profile_role_transition"();



CREATE OR REPLACE TRIGGER "push_notification_preferences_set_timestamps" BEFORE INSERT OR UPDATE ON "public"."notification_preferences" FOR EACH ROW EXECUTE FUNCTION "public"."set_timestamps"();



CREATE OR REPLACE TRIGGER "report_favorites_guard_update" BEFORE UPDATE ON "public"."report_favorites" FOR EACH ROW EXECUTE FUNCTION "public"."guard_report_favorite_update"();



CREATE OR REPLACE TRIGGER "report_favorites_set_timestamps" BEFORE INSERT OR UPDATE ON "public"."report_favorites" FOR EACH ROW EXECUTE FUNCTION "public"."set_timestamps"();



CREATE OR REPLACE TRIGGER "set_periodizations_updated_at" BEFORE UPDATE ON "public"."periodizations" FOR EACH ROW EXECUTE FUNCTION "public"."set_timestamps"();



CREATE OR REPLACE TRIGGER "subscriptions_updated_at" BEFORE UPDATE ON "public"."subscriptions" FOR EACH ROW EXECUTE FUNCTION "public"."update_subscriptions_updated_at"();



CREATE OR REPLACE TRIGGER "trg_guard_workout_log_update" BEFORE UPDATE ON "public"."workout_logs" FOR EACH ROW EXECUTE FUNCTION "public"."guard_workout_log_soft_delete"();



CREATE OR REPLACE TRIGGER "trg_validate_muscle_hierarchy" BEFORE INSERT OR UPDATE ON "public"."muscles" FOR EACH ROW EXECUTE FUNCTION "public"."validate_muscle_hierarchy"();



CREATE OR REPLACE TRIGGER "trg_validate_variation_muscle_level" BEFORE INSERT OR UPDATE ON "public"."variations" FOR EACH ROW EXECUTE FUNCTION "public"."validate_variation_muscle_level"();



CREATE OR REPLACE TRIGGER "trg_workouts_folder_same_owner" BEFORE INSERT OR UPDATE OF "folder_id", "user_id" ON "public"."workouts" FOR EACH ROW EXECUTE FUNCTION "public"."enforce_workout_folder_same_owner"();



CREATE OR REPLACE TRIGGER "variation_videos_dispatch_transcode" AFTER INSERT OR UPDATE OF "processing_status" ON "public"."variation_videos" FOR EACH ROW EXECUTE FUNCTION "public"."on_variation_video_upsert_dispatch_transcode"();



CREATE OR REPLACE TRIGGER "variation_videos_enqueue_deletion" AFTER DELETE OR UPDATE ON "public"."variation_videos" FOR EACH ROW EXECUTE FUNCTION "public"."enqueue_variation_video_deletion"();



CREATE OR REPLACE TRIGGER "variations_set_audit_fields" BEFORE INSERT OR UPDATE ON "public"."variations" FOR EACH ROW EXECUTE FUNCTION "public"."set_exercise_record_audit_fields"();



CREATE OR REPLACE TRIGGER "variations_set_timestamps" BEFORE INSERT OR UPDATE ON "public"."variations" FOR EACH ROW EXECUTE FUNCTION "public"."set_timestamps"();



CREATE OR REPLACE TRIGGER "variations_sync_scope" BEFORE INSERT OR UPDATE ON "public"."variations" FOR EACH ROW EXECUTE FUNCTION "public"."sync_variation_scope_with_exercise"();



CREATE OR REPLACE TRIGGER "workout_exercise_logs_set_timestamps" BEFORE INSERT OR UPDATE ON "public"."workout_exercise_logs" FOR EACH ROW EXECUTE FUNCTION "public"."set_timestamps"();



CREATE OR REPLACE TRIGGER "workout_exercise_set_logs_set_timestamps" BEFORE INSERT OR UPDATE ON "public"."workout_exercise_set_logs" FOR EACH ROW EXECUTE FUNCTION "public"."set_timestamps"();



CREATE OR REPLACE TRIGGER "workout_exercises_set_timestamps" BEFORE INSERT OR UPDATE ON "public"."workout_exercises" FOR EACH ROW EXECUTE FUNCTION "public"."set_timestamps"();



CREATE OR REPLACE TRIGGER "workout_log_summaries_set_timestamps" BEFORE INSERT OR UPDATE ON "public"."workout_log_summaries" FOR EACH ROW EXECUTE FUNCTION "public"."set_timestamps"();



CREATE OR REPLACE TRIGGER "workout_logs_set_timestamps" BEFORE INSERT OR UPDATE ON "public"."workout_logs" FOR EACH ROW EXECUTE FUNCTION "public"."set_timestamps"();



CREATE OR REPLACE TRIGGER "workout_preparatory_exercise_logs_set_timestamps" BEFORE UPDATE ON "public"."workout_preparatory_exercise_logs" FOR EACH ROW EXECUTE FUNCTION "public"."set_timestamps"();



CREATE OR REPLACE TRIGGER "workout_preparatory_exercises_set_timestamps" BEFORE UPDATE ON "public"."workout_preparatory_exercises" FOR EACH ROW EXECUTE FUNCTION "public"."set_timestamps"();



CREATE OR REPLACE TRIGGER "workout_preparatory_set_logs_set_timestamps" BEFORE UPDATE ON "public"."workout_preparatory_set_logs" FOR EACH ROW EXECUTE FUNCTION "public"."set_timestamps"();



CREATE OR REPLACE TRIGGER "workout_preparatory_sets_set_timestamps" BEFORE UPDATE ON "public"."workout_preparatory_sets" FOR EACH ROW EXECUTE FUNCTION "public"."set_timestamps"();



CREATE OR REPLACE TRIGGER "workout_sets_set_timestamps" BEFORE INSERT OR UPDATE ON "public"."workout_sets" FOR EACH ROW EXECUTE FUNCTION "public"."set_timestamps"();



CREATE OR REPLACE TRIGGER "workout_variation_records_set_timestamps" BEFORE INSERT OR UPDATE ON "public"."workout_variation_records" FOR EACH ROW EXECUTE FUNCTION "public"."set_timestamps"();



CREATE OR REPLACE TRIGGER "workouts_set_timestamps" BEFORE INSERT OR UPDATE ON "public"."workouts" FOR EACH ROW EXECUTE FUNCTION "public"."set_timestamps"();



ALTER TABLE ONLY "public"."cardio_programs"
    ADD CONSTRAINT "cardio_programs_athlete_id_fkey" FOREIGN KEY ("athlete_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."cardio_programs"
    ADD CONSTRAINT "cardio_programs_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."coach_athletes"
    ADD CONSTRAINT "coach_athletes_athlete_id_fkey" FOREIGN KEY ("athlete_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."coach_athletes"
    ADD CONSTRAINT "coach_athletes_coach_id_fkey" FOREIGN KEY ("coach_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."coach_athletes"
    ADD CONSTRAINT "coach_athletes_invited_by_fkey" FOREIGN KEY ("invited_by") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."coach_availability"
    ADD CONSTRAINT "coach_availability_coach_id_fkey" FOREIGN KEY ("coach_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."coach_availability_overrides"
    ADD CONSTRAINT "coach_availability_overrides_coach_id_fkey" FOREIGN KEY ("coach_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."coach_gym_schedules"
    ADD CONSTRAINT "coach_gym_schedules_gym_id_fkey" FOREIGN KEY ("gym_id") REFERENCES "public"."coach_gyms"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."coach_gyms"
    ADD CONSTRAINT "coach_gyms_coach_id_fkey" FOREIGN KEY ("coach_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."coach_recurring_schedule_exceptions"
    ADD CONSTRAINT "coach_recurring_schedule_exceptions_schedule_id_fkey" FOREIGN KEY ("schedule_id") REFERENCES "public"."coach_recurring_schedules"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."coach_recurring_schedules"
    ADD CONSTRAINT "coach_recurring_schedules_athlete_id_fkey" FOREIGN KEY ("athlete_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."coach_recurring_schedules"
    ADD CONSTRAINT "coach_recurring_schedules_coach_id_fkey" FOREIGN KEY ("coach_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."coach_service_area_schedules"
    ADD CONSTRAINT "coach_service_area_schedules_service_area_id_fkey" FOREIGN KEY ("service_area_id") REFERENCES "public"."coach_service_areas"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."coach_service_areas"
    ADD CONSTRAINT "coach_service_areas_coach_id_fkey" FOREIGN KEY ("coach_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."coach_service_types"
    ADD CONSTRAINT "coach_service_types_coach_id_fkey" FOREIGN KEY ("coach_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."coach_session_disputes"
    ADD CONSTRAINT "coach_session_disputes_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."coach_session_disputes"
    ADD CONSTRAINT "coach_session_disputes_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."coach_sessions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."coach_sessions"
    ADD CONSTRAINT "coach_sessions_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."coach_sessions"
    ADD CONSTRAINT "coach_sessions_athlete_id_fkey" FOREIGN KEY ("athlete_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."coach_sessions"
    ADD CONSTRAINT "coach_sessions_canceled_by_fkey" FOREIGN KEY ("canceled_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."coach_sessions"
    ADD CONSTRAINT "coach_sessions_coach_id_fkey" FOREIGN KEY ("coach_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."coach_sessions"
    ADD CONSTRAINT "coach_sessions_recurring_schedule_id_fkey" FOREIGN KEY ("recurring_schedule_id") REFERENCES "public"."coach_recurring_schedules"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."coach_sessions"
    ADD CONSTRAINT "coach_sessions_requested_by_fkey" FOREIGN KEY ("requested_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."coach_sessions"
    ADD CONSTRAINT "coach_sessions_workout_log_id_fkey" FOREIGN KEY ("workout_log_id") REFERENCES "public"."workout_logs"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."coach_testimonials"
    ADD CONSTRAINT "coach_testimonials_athlete_id_fkey" FOREIGN KEY ("athlete_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."coach_testimonials"
    ADD CONSTRAINT "coach_testimonials_coach_id_fkey" FOREIGN KEY ("coach_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."exercises"
    ADD CONSTRAINT "exercises_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."exercises"
    ADD CONSTRAINT "exercises_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."exercises"
    ADD CONSTRAINT "exercises_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."muscles"
    ADD CONSTRAINT "muscles_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "public"."muscles"("id");



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_recipient_user_id_fkey" FOREIGN KEY ("recipient_user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_sender_user_id_fkey" FOREIGN KEY ("sender_user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."payment_sessions"
    ADD CONSTRAINT "payment_sessions_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "public"."payments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."payment_sessions"
    ADD CONSTRAINT "payment_sessions_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."coach_sessions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_coach_id_fkey" FOREIGN KEY ("coach_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."periodization_adjustments"
    ADD CONSTRAINT "periodization_adjustments_periodization_id_fkey" FOREIGN KEY ("periodization_id") REFERENCES "public"."periodizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."periodization_occurrences"
    ADD CONSTRAINT "periodization_occurrences_cardio_program_id_fkey" FOREIGN KEY ("cardio_program_id") REFERENCES "public"."cardio_programs"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."periodization_occurrences"
    ADD CONSTRAINT "periodization_occurrences_periodization_id_fkey" FOREIGN KEY ("periodization_id") REFERENCES "public"."periodizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."periodization_occurrences"
    ADD CONSTRAINT "periodization_occurrences_source_adjustment_id_fkey" FOREIGN KEY ("source_adjustment_id") REFERENCES "public"."periodization_adjustments"("id");



ALTER TABLE ONLY "public"."periodization_occurrences"
    ADD CONSTRAINT "periodization_occurrences_template_activity_id_fkey" FOREIGN KEY ("template_activity_id") REFERENCES "public"."periodization_template_activities"("id");



ALTER TABLE ONLY "public"."periodization_occurrences"
    ADD CONSTRAINT "periodization_occurrences_template_day_id_fkey" FOREIGN KEY ("template_day_id") REFERENCES "public"."periodization_template_days"("id");



ALTER TABLE ONLY "public"."periodization_occurrences"
    ADD CONSTRAINT "periodization_occurrences_workout_id_fkey" FOREIGN KEY ("workout_id") REFERENCES "public"."workouts"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."periodization_occurrences"
    ADD CONSTRAINT "periodization_occurrences_workout_log_id_fkey" FOREIGN KEY ("workout_log_id") REFERENCES "public"."workout_logs"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."periodization_template_activities"
    ADD CONSTRAINT "periodization_template_activities_cardio_program_id_fkey" FOREIGN KEY ("cardio_program_id") REFERENCES "public"."cardio_programs"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."periodization_template_activities"
    ADD CONSTRAINT "periodization_template_activities_template_day_id_fkey" FOREIGN KEY ("template_day_id") REFERENCES "public"."periodization_template_days"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."periodization_template_activities"
    ADD CONSTRAINT "periodization_template_activities_workout_id_fkey" FOREIGN KEY ("workout_id") REFERENCES "public"."workouts"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."periodization_template_days"
    ADD CONSTRAINT "periodization_template_days_periodization_id_fkey" FOREIGN KEY ("periodization_id") REFERENCES "public"."periodizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."periodizations"
    ADD CONSTRAINT "periodizations_athlete_id_fkey" FOREIGN KEY ("athlete_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."periodizations"
    ADD CONSTRAINT "periodizations_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."plan_feature_limits"
    ADD CONSTRAINT "plan_feature_limits_feature_key_fk" FOREIGN KEY ("feature_key") REFERENCES "public"."feature_keys"("key");



ALTER TABLE ONLY "public"."plan_feature_limits"
    ADD CONSTRAINT "plan_feature_limits_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "public"."subscription_plans"("code") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notification_preferences"
    ADD CONSTRAINT "push_notification_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."push_subscriptions"
    ADD CONSTRAINT "push_subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."report_favorites"
    ADD CONSTRAINT "report_favorites_target_user_id_fkey" FOREIGN KEY ("target_user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."report_favorites"
    ADD CONSTRAINT "report_favorites_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."shared_variations"
    ADD CONSTRAINT "shared_variations_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."shared_variations"
    ADD CONSTRAINT "shared_variations_shared_with_id_fkey" FOREIGN KEY ("shared_with_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."shared_variations"
    ADD CONSTRAINT "shared_variations_variation_id_fkey" FOREIGN KEY ("variation_id") REFERENCES "public"."variations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."subscription_feature_overrides"
    ADD CONSTRAINT "subscription_feature_overrides_feature_key_fk" FOREIGN KEY ("feature_key") REFERENCES "public"."feature_keys"("key");



ALTER TABLE ONLY "public"."subscription_feature_overrides"
    ADD CONSTRAINT "subscription_feature_overrides_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."subscriptions"
    ADD CONSTRAINT "subscriptions_granted_by_fkey" FOREIGN KEY ("granted_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."subscriptions"
    ADD CONSTRAINT "subscriptions_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "public"."subscription_plans"("code");



ALTER TABLE ONLY "public"."subscriptions"
    ADD CONSTRAINT "subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."variation_videos"
    ADD CONSTRAINT "variation_videos_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."variation_videos"
    ADD CONSTRAINT "variation_videos_variation_id_fkey" FOREIGN KEY ("variation_id") REFERENCES "public"."variations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."variations"
    ADD CONSTRAINT "variations_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."variations"
    ADD CONSTRAINT "variations_equipment_id_fkey" FOREIGN KEY ("equipment_id") REFERENCES "public"."equipments"("id");



ALTER TABLE ONLY "public"."variations"
    ADD CONSTRAINT "variations_exercise_id_fkey" FOREIGN KEY ("exercise_id") REFERENCES "public"."exercises"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."variations"
    ADD CONSTRAINT "variations_muscle_id_fkey" FOREIGN KEY ("muscle_id") REFERENCES "public"."muscles"("id");



ALTER TABLE ONLY "public"."variations"
    ADD CONSTRAINT "variations_secondary_muscle_id_fkey" FOREIGN KEY ("secondary_muscle_id") REFERENCES "public"."muscles"("id");



ALTER TABLE ONLY "public"."variations"
    ADD CONSTRAINT "variations_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."variations"
    ADD CONSTRAINT "variations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."workout_exercise_logs"
    ADD CONSTRAINT "workout_exercise_logs_variation_id_fkey" FOREIGN KEY ("variation_id") REFERENCES "public"."variations"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."workout_exercise_logs"
    ADD CONSTRAINT "workout_exercise_logs_workout_log_id_fkey" FOREIGN KEY ("workout_log_id") REFERENCES "public"."workout_logs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."workout_exercise_set_logs"
    ADD CONSTRAINT "workout_exercise_set_logs_workout_exercise_log_id_fkey" FOREIGN KEY ("workout_exercise_log_id") REFERENCES "public"."workout_exercise_logs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."workout_exercises"
    ADD CONSTRAINT "workout_exercises_variation_id_fkey" FOREIGN KEY ("variation_id") REFERENCES "public"."variations"("id");



ALTER TABLE ONLY "public"."workout_exercises"
    ADD CONSTRAINT "workout_exercises_workout_id_fkey" FOREIGN KEY ("workout_id") REFERENCES "public"."workouts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."workout_folders"
    ADD CONSTRAINT "workout_folders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."workout_log_summaries"
    ADD CONSTRAINT "workout_log_summaries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."workout_log_summaries"
    ADD CONSTRAINT "workout_log_summaries_workout_log_id_fkey" FOREIGN KEY ("workout_log_id") REFERENCES "public"."workout_logs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."workout_logs"
    ADD CONSTRAINT "workout_logs_coach_session_id_fkey" FOREIGN KEY ("coach_session_id") REFERENCES "public"."coach_sessions"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."workout_logs"
    ADD CONSTRAINT "workout_logs_deleted_by_fkey" FOREIGN KEY ("deleted_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."workout_logs"
    ADD CONSTRAINT "workout_logs_started_by_fkey" FOREIGN KEY ("started_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."workout_logs"
    ADD CONSTRAINT "workout_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."workout_logs"
    ADD CONSTRAINT "workout_logs_workout_id_fkey" FOREIGN KEY ("workout_id") REFERENCES "public"."workouts"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."workout_preparatory_exercise_logs"
    ADD CONSTRAINT "workout_preparatory_exercise_logs_variation_id_fkey" FOREIGN KEY ("variation_id") REFERENCES "public"."variations"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."workout_preparatory_exercise_logs"
    ADD CONSTRAINT "workout_preparatory_exercise_logs_workout_log_id_fkey" FOREIGN KEY ("workout_log_id") REFERENCES "public"."workout_logs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."workout_preparatory_exercises"
    ADD CONSTRAINT "workout_preparatory_exercises_variation_id_fkey" FOREIGN KEY ("variation_id") REFERENCES "public"."variations"("id");



ALTER TABLE ONLY "public"."workout_preparatory_exercises"
    ADD CONSTRAINT "workout_preparatory_exercises_workout_id_fkey" FOREIGN KEY ("workout_id") REFERENCES "public"."workouts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."workout_preparatory_set_logs"
    ADD CONSTRAINT "workout_preparatory_set_logs_workout_preparatory_exercise__fkey" FOREIGN KEY ("workout_preparatory_exercise_log_id") REFERENCES "public"."workout_preparatory_exercise_logs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."workout_preparatory_sets"
    ADD CONSTRAINT "workout_preparatory_sets_workout_preparatory_exercise_id_fkey" FOREIGN KEY ("workout_preparatory_exercise_id") REFERENCES "public"."workout_preparatory_exercises"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."workout_sets"
    ADD CONSTRAINT "workout_sets_linked_set_id_fkey" FOREIGN KEY ("linked_set_id") REFERENCES "public"."workout_sets"("id");



ALTER TABLE ONLY "public"."workout_sets"
    ADD CONSTRAINT "workout_sets_workout_exercise_id_fkey" FOREIGN KEY ("workout_exercise_id") REFERENCES "public"."workout_exercises"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."workout_variation_records"
    ADD CONSTRAINT "workout_variation_records_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."workout_variation_records"
    ADD CONSTRAINT "workout_variation_records_variation_id_fkey" FOREIGN KEY ("variation_id") REFERENCES "public"."variations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."workouts"
    ADD CONSTRAINT "workouts_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."workouts"
    ADD CONSTRAINT "workouts_folder_id_fkey" FOREIGN KEY ("folder_id") REFERENCES "public"."workout_folders"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."workouts"
    ADD CONSTRAINT "workouts_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."workouts"
    ADD CONSTRAINT "workouts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



CREATE POLICY "Anyone can view gyms of published coaches" ON "public"."coach_gyms" FOR SELECT TO "authenticated", "anon" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "coach_gyms"."coach_id") AND ("profiles"."profile_published" = true)))));



CREATE POLICY "Anyone can view schedules of published coach gyms" ON "public"."coach_gym_schedules" FOR SELECT TO "authenticated", "anon" USING ((EXISTS ( SELECT 1
   FROM ("public"."coach_gyms"
     JOIN "public"."profiles" ON (("profiles"."id" = "coach_gyms"."coach_id")))
  WHERE (("coach_gyms"."id" = "coach_gym_schedules"."gym_id") AND ("profiles"."profile_published" = true)))));



CREATE POLICY "Anyone can view schedules of published coach service areas" ON "public"."coach_service_area_schedules" FOR SELECT TO "authenticated", "anon" USING ((EXISTS ( SELECT 1
   FROM ("public"."coach_service_areas"
     JOIN "public"."profiles" ON (("profiles"."id" = "coach_service_areas"."coach_id")))
  WHERE (("coach_service_areas"."id" = "coach_service_area_schedules"."service_area_id") AND ("profiles"."profile_published" = true)))));



CREATE POLICY "Anyone can view service areas of published coaches" ON "public"."coach_service_areas" FOR SELECT TO "authenticated", "anon" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "coach_service_areas"."coach_id") AND ("profiles"."profile_published" = true)))));



CREATE POLICY "Anyone can view service types of published coaches" ON "public"."coach_service_types" FOR SELECT TO "authenticated", "anon" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "coach_service_types"."coach_id") AND ("profiles"."profile_published" = true)))));



CREATE POLICY "Athletes can delete their own testimonials." ON "public"."coach_testimonials" FOR DELETE USING (("athlete_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Athletes can insert testimonials for their coaches." ON "public"."coach_testimonials" FOR INSERT WITH CHECK ((("athlete_id" = ( SELECT "auth"."uid"() AS "uid")) AND (EXISTS ( SELECT 1
   FROM "public"."coach_athletes"
  WHERE (("coach_athletes"."coach_id" = "coach_testimonials"."coach_id") AND ("coach_athletes"."athlete_id" = "coach_testimonials"."athlete_id") AND ("coach_athletes"."status" = ANY (ARRAY['active'::"text", 'ended'::"text"])))))));



CREATE POLICY "Athletes can update their own testimonials." ON "public"."coach_testimonials" FOR UPDATE USING (("athlete_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Athletes delete own preparatory exercise logs" ON "public"."workout_preparatory_exercise_logs" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."workout_logs" "wl"
  WHERE (("wl"."id" = "workout_preparatory_exercise_logs"."workout_log_id") AND ("wl"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "Athletes delete own preparatory exercises" ON "public"."workout_preparatory_exercises" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."workouts" "w"
  WHERE (("w"."id" = "workout_preparatory_exercises"."workout_id") AND ("w"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "Athletes delete own preparatory set logs" ON "public"."workout_preparatory_set_logs" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."workout_preparatory_exercise_logs" "wpel"
     JOIN "public"."workout_logs" "wl" ON (("wl"."id" = "wpel"."workout_log_id")))
  WHERE (("wpel"."id" = "workout_preparatory_set_logs"."workout_preparatory_exercise_log_id") AND ("wl"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "Athletes delete own preparatory sets" ON "public"."workout_preparatory_sets" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."workout_preparatory_exercises" "wpe"
     JOIN "public"."workouts" "w" ON (("w"."id" = "wpe"."workout_id")))
  WHERE (("wpe"."id" = "workout_preparatory_sets"."workout_preparatory_exercise_id") AND ("w"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "Athletes insert own exercise logs" ON "public"."workout_exercise_logs" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."workout_logs" "wl"
  WHERE (("wl"."id" = "workout_exercise_logs"."workout_log_id") AND ("wl"."user_id" = "auth"."uid"())))));



CREATE POLICY "Athletes insert own logs" ON "public"."workout_logs" FOR INSERT WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "Athletes insert own preparatory exercise logs" ON "public"."workout_preparatory_exercise_logs" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."workout_logs" "wl"
  WHERE (("wl"."id" = "workout_preparatory_exercise_logs"."workout_log_id") AND ("wl"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "Athletes insert own preparatory exercises" ON "public"."workout_preparatory_exercises" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."workouts" "w"
  WHERE (("w"."id" = "workout_preparatory_exercises"."workout_id") AND ("w"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "Athletes insert own preparatory set logs" ON "public"."workout_preparatory_set_logs" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."workout_preparatory_exercise_logs" "wpel"
     JOIN "public"."workout_logs" "wl" ON (("wl"."id" = "wpel"."workout_log_id")))
  WHERE (("wpel"."id" = "workout_preparatory_set_logs"."workout_preparatory_exercise_log_id") AND ("wl"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "Athletes insert own preparatory sets" ON "public"."workout_preparatory_sets" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."workout_preparatory_exercises" "wpe"
     JOIN "public"."workouts" "w" ON (("w"."id" = "wpe"."workout_id")))
  WHERE (("wpe"."id" = "workout_preparatory_sets"."workout_preparatory_exercise_id") AND ("w"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "Athletes insert own set logs" ON "public"."workout_exercise_set_logs" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."workout_exercise_logs" "wel"
     JOIN "public"."workout_logs" "wl" ON (("wl"."id" = "wel"."workout_log_id")))
  WHERE (("wel"."id" = "workout_exercise_set_logs"."workout_exercise_log_id") AND ("wl"."user_id" = "auth"."uid"())))));



CREATE POLICY "Athletes insert own workout summaries" ON "public"."workout_log_summaries" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Athletes insert own workout variation records" ON "public"."workout_variation_records" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Athletes read own exercise logs" ON "public"."workout_exercise_logs" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."workout_logs" "wl"
  WHERE (("wl"."id" = "workout_exercise_logs"."workout_log_id") AND ("wl"."user_id" = "auth"."uid"())))));



CREATE POLICY "Athletes read own logs" ON "public"."workout_logs" FOR SELECT USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Athletes read own set logs" ON "public"."workout_exercise_set_logs" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM ("public"."workout_exercise_logs" "wel"
     JOIN "public"."workout_logs" "wl" ON (("wl"."id" = "wel"."workout_log_id")))
  WHERE (("wel"."id" = "workout_exercise_set_logs"."workout_exercise_log_id") AND ("wl"."user_id" = "auth"."uid"())))));



CREATE POLICY "Athletes read own workout summaries" ON "public"."workout_log_summaries" FOR SELECT TO "authenticated" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Athletes read own workout variation records" ON "public"."workout_variation_records" FOR SELECT TO "authenticated" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Athletes select own preparatory exercise logs" ON "public"."workout_preparatory_exercise_logs" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."workout_logs" "wl"
  WHERE (("wl"."id" = "workout_preparatory_exercise_logs"."workout_log_id") AND ("wl"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "Athletes select own preparatory exercises" ON "public"."workout_preparatory_exercises" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."workouts" "w"
  WHERE (("w"."id" = "workout_preparatory_exercises"."workout_id") AND ("w"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "Athletes select own preparatory set logs" ON "public"."workout_preparatory_set_logs" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."workout_preparatory_exercise_logs" "wpel"
     JOIN "public"."workout_logs" "wl" ON (("wl"."id" = "wpel"."workout_log_id")))
  WHERE (("wpel"."id" = "workout_preparatory_set_logs"."workout_preparatory_exercise_log_id") AND ("wl"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "Athletes select own preparatory sets" ON "public"."workout_preparatory_sets" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."workout_preparatory_exercises" "wpe"
     JOIN "public"."workouts" "w" ON (("w"."id" = "wpe"."workout_id")))
  WHERE (("wpe"."id" = "workout_preparatory_sets"."workout_preparatory_exercise_id") AND ("w"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "Athletes update own preparatory exercise logs" ON "public"."workout_preparatory_exercise_logs" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."workout_logs" "wl"
  WHERE (("wl"."id" = "workout_preparatory_exercise_logs"."workout_log_id") AND ("wl"."user_id" = ( SELECT "auth"."uid"() AS "uid")))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."workout_logs" "wl"
  WHERE (("wl"."id" = "workout_preparatory_exercise_logs"."workout_log_id") AND ("wl"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "Athletes update own preparatory exercises" ON "public"."workout_preparatory_exercises" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."workouts" "w"
  WHERE (("w"."id" = "workout_preparatory_exercises"."workout_id") AND ("w"."user_id" = ( SELECT "auth"."uid"() AS "uid")))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."workouts" "w"
  WHERE (("w"."id" = "workout_preparatory_exercises"."workout_id") AND ("w"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "Athletes update own preparatory set logs" ON "public"."workout_preparatory_set_logs" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."workout_preparatory_exercise_logs" "wpel"
     JOIN "public"."workout_logs" "wl" ON (("wl"."id" = "wpel"."workout_log_id")))
  WHERE (("wpel"."id" = "workout_preparatory_set_logs"."workout_preparatory_exercise_log_id") AND ("wl"."user_id" = ( SELECT "auth"."uid"() AS "uid")))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."workout_preparatory_exercise_logs" "wpel"
     JOIN "public"."workout_logs" "wl" ON (("wl"."id" = "wpel"."workout_log_id")))
  WHERE (("wpel"."id" = "workout_preparatory_set_logs"."workout_preparatory_exercise_log_id") AND ("wl"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "Athletes update own preparatory sets" ON "public"."workout_preparatory_sets" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."workout_preparatory_exercises" "wpe"
     JOIN "public"."workouts" "w" ON (("w"."id" = "wpe"."workout_id")))
  WHERE (("wpe"."id" = "workout_preparatory_sets"."workout_preparatory_exercise_id") AND ("w"."user_id" = ( SELECT "auth"."uid"() AS "uid")))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."workout_preparatory_exercises" "wpe"
     JOIN "public"."workouts" "w" ON (("w"."id" = "wpe"."workout_id")))
  WHERE (("wpe"."id" = "workout_preparatory_sets"."workout_preparatory_exercise_id") AND ("w"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "Authenticated users can read feature keys" ON "public"."feature_keys" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Authenticated users can read feature limits" ON "public"."plan_feature_limits" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Authenticated users can read plans" ON "public"."subscription_plans" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Coach athlete relationships are publicly countable." ON "public"."coach_athletes" FOR SELECT TO "anon" USING (("status" = 'active'::"text"));



CREATE POLICY "Coaches can manage own gym schedules" ON "public"."coach_gym_schedules" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."coach_gyms"
  WHERE (("coach_gyms"."id" = "coach_gym_schedules"."gym_id") AND ("coach_gyms"."coach_id" = ( SELECT "auth"."uid"() AS "uid")))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."coach_gyms"
  WHERE (("coach_gyms"."id" = "coach_gym_schedules"."gym_id") AND ("coach_gyms"."coach_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "Coaches can manage own gyms" ON "public"."coach_gyms" TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "coach_id")) WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "coach_id"));



CREATE POLICY "Coaches can manage own service area schedules" ON "public"."coach_service_area_schedules" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."coach_service_areas"
  WHERE (("coach_service_areas"."id" = "coach_service_area_schedules"."service_area_id") AND ("coach_service_areas"."coach_id" = ( SELECT "auth"."uid"() AS "uid")))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."coach_service_areas"
  WHERE (("coach_service_areas"."id" = "coach_service_area_schedules"."service_area_id") AND ("coach_service_areas"."coach_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "Coaches can manage own service areas" ON "public"."coach_service_areas" TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "coach_id")) WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "coach_id"));



CREATE POLICY "Coaches can manage own service types" ON "public"."coach_service_types" TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "coach_id")) WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "coach_id"));



CREATE POLICY "Coaches can read athletes subscriptions" ON "public"."subscriptions" FOR SELECT TO "authenticated" USING (("user_id" IN ( SELECT "coach_athletes"."athlete_id"
   FROM "public"."coach_athletes"
  WHERE (("coach_athletes"."coach_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("coach_athletes"."status" = 'active'::"text")))));



CREATE POLICY "Coaches can read their athletes subscriptions" ON "public"."subscriptions" FOR SELECT TO "authenticated" USING (("user_id" IN ( SELECT "ca"."athlete_id"
   FROM "public"."coach_athletes" "ca"
  WHERE (("ca"."coach_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("ca"."status" = 'active'::"text")))));



CREATE POLICY "Coaches can update status of their testimonials." ON "public"."coach_testimonials" FOR UPDATE USING (("coach_id" = ( SELECT "auth"."uid"() AS "uid"))) WITH CHECK (("coach_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Coaches delete athlete preparatory exercise logs" ON "public"."workout_preparatory_exercise_logs" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."workout_logs" "wl"
  WHERE (("wl"."id" = "workout_preparatory_exercise_logs"."workout_log_id") AND "public"."is_active_coach_of"(( SELECT "auth"."uid"() AS "uid"), "wl"."user_id")))));



CREATE POLICY "Coaches delete athlete preparatory exercises" ON "public"."workout_preparatory_exercises" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."workouts" "w"
  WHERE (("w"."id" = "workout_preparatory_exercises"."workout_id") AND "public"."is_active_coach_of"(( SELECT "auth"."uid"() AS "uid"), "w"."user_id")))));



CREATE POLICY "Coaches delete athlete preparatory set logs" ON "public"."workout_preparatory_set_logs" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."workout_preparatory_exercise_logs" "wpel"
     JOIN "public"."workout_logs" "wl" ON (("wl"."id" = "wpel"."workout_log_id")))
  WHERE (("wpel"."id" = "workout_preparatory_set_logs"."workout_preparatory_exercise_log_id") AND "public"."is_active_coach_of"(( SELECT "auth"."uid"() AS "uid"), "wl"."user_id")))));



CREATE POLICY "Coaches delete athlete preparatory sets" ON "public"."workout_preparatory_sets" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."workout_preparatory_exercises" "wpe"
     JOIN "public"."workouts" "w" ON (("w"."id" = "wpe"."workout_id")))
  WHERE (("wpe"."id" = "workout_preparatory_sets"."workout_preparatory_exercise_id") AND "public"."is_active_coach_of"(( SELECT "auth"."uid"() AS "uid"), "w"."user_id")))));



CREATE POLICY "Coaches insert athlete exercise logs" ON "public"."workout_exercise_logs" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."workout_logs" "wl"
  WHERE (("wl"."id" = "workout_exercise_logs"."workout_log_id") AND "public"."is_active_coach_of"("auth"."uid"(), "wl"."user_id")))));



CREATE POLICY "Coaches insert athlete logs" ON "public"."workout_logs" FOR INSERT WITH CHECK ("public"."is_active_coach_of"("auth"."uid"(), "user_id"));



CREATE POLICY "Coaches insert athlete preparatory exercise logs" ON "public"."workout_preparatory_exercise_logs" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."workout_logs" "wl"
  WHERE (("wl"."id" = "workout_preparatory_exercise_logs"."workout_log_id") AND "public"."is_active_coach_of"(( SELECT "auth"."uid"() AS "uid"), "wl"."user_id")))));



CREATE POLICY "Coaches insert athlete preparatory exercises" ON "public"."workout_preparatory_exercises" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."workouts" "w"
  WHERE (("w"."id" = "workout_preparatory_exercises"."workout_id") AND "public"."is_active_coach_of"(( SELECT "auth"."uid"() AS "uid"), "w"."user_id")))));



CREATE POLICY "Coaches insert athlete preparatory set logs" ON "public"."workout_preparatory_set_logs" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."workout_preparatory_exercise_logs" "wpel"
     JOIN "public"."workout_logs" "wl" ON (("wl"."id" = "wpel"."workout_log_id")))
  WHERE (("wpel"."id" = "workout_preparatory_set_logs"."workout_preparatory_exercise_log_id") AND "public"."is_active_coach_of"(( SELECT "auth"."uid"() AS "uid"), "wl"."user_id")))));



CREATE POLICY "Coaches insert athlete preparatory sets" ON "public"."workout_preparatory_sets" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."workout_preparatory_exercises" "wpe"
     JOIN "public"."workouts" "w" ON (("w"."id" = "wpe"."workout_id")))
  WHERE (("wpe"."id" = "workout_preparatory_sets"."workout_preparatory_exercise_id") AND "public"."is_active_coach_of"(( SELECT "auth"."uid"() AS "uid"), "w"."user_id")))));



CREATE POLICY "Coaches insert athlete set logs" ON "public"."workout_exercise_set_logs" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."workout_exercise_logs" "wel"
     JOIN "public"."workout_logs" "wl" ON (("wl"."id" = "wel"."workout_log_id")))
  WHERE (("wel"."id" = "workout_exercise_set_logs"."workout_exercise_log_id") AND "public"."is_active_coach_of"("auth"."uid"(), "wl"."user_id")))));



CREATE POLICY "Coaches insert athlete workout summaries" ON "public"."workout_log_summaries" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_active_coach_of"(( SELECT "auth"."uid"() AS "uid"), "user_id"));



CREATE POLICY "Coaches insert athlete workout variation records" ON "public"."workout_variation_records" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_active_coach_of"(( SELECT "auth"."uid"() AS "uid"), "user_id"));



CREATE POLICY "Coaches read athlete exercise logs" ON "public"."workout_exercise_logs" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."workout_logs" "wl"
  WHERE (("wl"."id" = "workout_exercise_logs"."workout_log_id") AND "public"."is_active_coach_of"("auth"."uid"(), "wl"."user_id")))));



CREATE POLICY "Coaches read athlete logs" ON "public"."workout_logs" FOR SELECT USING ("public"."is_active_coach_of"("auth"."uid"(), "user_id"));



CREATE POLICY "Coaches read athlete set logs" ON "public"."workout_exercise_set_logs" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM ("public"."workout_exercise_logs" "wel"
     JOIN "public"."workout_logs" "wl" ON (("wl"."id" = "wel"."workout_log_id")))
  WHERE (("wel"."id" = "workout_exercise_set_logs"."workout_exercise_log_id") AND "public"."is_active_coach_of"("auth"."uid"(), "wl"."user_id")))));



CREATE POLICY "Coaches read athlete workout summaries" ON "public"."workout_log_summaries" FOR SELECT TO "authenticated" USING ("public"."is_active_coach_of"(( SELECT "auth"."uid"() AS "uid"), "user_id"));



CREATE POLICY "Coaches read athlete workout variation records" ON "public"."workout_variation_records" FOR SELECT TO "authenticated" USING ("public"."is_active_coach_of"(( SELECT "auth"."uid"() AS "uid"), "user_id"));



CREATE POLICY "Coaches select athlete preparatory exercise logs" ON "public"."workout_preparatory_exercise_logs" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."workout_logs" "wl"
  WHERE (("wl"."id" = "workout_preparatory_exercise_logs"."workout_log_id") AND "public"."is_active_coach_of"(( SELECT "auth"."uid"() AS "uid"), "wl"."user_id")))));



CREATE POLICY "Coaches select athlete preparatory exercises" ON "public"."workout_preparatory_exercises" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."workouts" "w"
  WHERE (("w"."id" = "workout_preparatory_exercises"."workout_id") AND "public"."is_active_coach_of"(( SELECT "auth"."uid"() AS "uid"), "w"."user_id")))));



CREATE POLICY "Coaches select athlete preparatory set logs" ON "public"."workout_preparatory_set_logs" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."workout_preparatory_exercise_logs" "wpel"
     JOIN "public"."workout_logs" "wl" ON (("wl"."id" = "wpel"."workout_log_id")))
  WHERE (("wpel"."id" = "workout_preparatory_set_logs"."workout_preparatory_exercise_log_id") AND "public"."is_active_coach_of"(( SELECT "auth"."uid"() AS "uid"), "wl"."user_id")))));



CREATE POLICY "Coaches select athlete preparatory sets" ON "public"."workout_preparatory_sets" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."workout_preparatory_exercises" "wpe"
     JOIN "public"."workouts" "w" ON (("w"."id" = "wpe"."workout_id")))
  WHERE (("wpe"."id" = "workout_preparatory_sets"."workout_preparatory_exercise_id") AND "public"."is_active_coach_of"(( SELECT "auth"."uid"() AS "uid"), "w"."user_id")))));



CREATE POLICY "Coaches update athlete preparatory exercise logs" ON "public"."workout_preparatory_exercise_logs" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."workout_logs" "wl"
  WHERE (("wl"."id" = "workout_preparatory_exercise_logs"."workout_log_id") AND "public"."is_active_coach_of"(( SELECT "auth"."uid"() AS "uid"), "wl"."user_id"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."workout_logs" "wl"
  WHERE (("wl"."id" = "workout_preparatory_exercise_logs"."workout_log_id") AND "public"."is_active_coach_of"(( SELECT "auth"."uid"() AS "uid"), "wl"."user_id")))));



CREATE POLICY "Coaches update athlete preparatory exercises" ON "public"."workout_preparatory_exercises" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."workouts" "w"
  WHERE (("w"."id" = "workout_preparatory_exercises"."workout_id") AND "public"."is_active_coach_of"(( SELECT "auth"."uid"() AS "uid"), "w"."user_id"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."workouts" "w"
  WHERE (("w"."id" = "workout_preparatory_exercises"."workout_id") AND "public"."is_active_coach_of"(( SELECT "auth"."uid"() AS "uid"), "w"."user_id")))));



CREATE POLICY "Coaches update athlete preparatory set logs" ON "public"."workout_preparatory_set_logs" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."workout_preparatory_exercise_logs" "wpel"
     JOIN "public"."workout_logs" "wl" ON (("wl"."id" = "wpel"."workout_log_id")))
  WHERE (("wpel"."id" = "workout_preparatory_set_logs"."workout_preparatory_exercise_log_id") AND "public"."is_active_coach_of"(( SELECT "auth"."uid"() AS "uid"), "wl"."user_id"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."workout_preparatory_exercise_logs" "wpel"
     JOIN "public"."workout_logs" "wl" ON (("wl"."id" = "wpel"."workout_log_id")))
  WHERE (("wpel"."id" = "workout_preparatory_set_logs"."workout_preparatory_exercise_log_id") AND "public"."is_active_coach_of"(( SELECT "auth"."uid"() AS "uid"), "wl"."user_id")))));



CREATE POLICY "Coaches update athlete preparatory sets" ON "public"."workout_preparatory_sets" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."workout_preparatory_exercises" "wpe"
     JOIN "public"."workouts" "w" ON (("w"."id" = "wpe"."workout_id")))
  WHERE (("wpe"."id" = "workout_preparatory_sets"."workout_preparatory_exercise_id") AND "public"."is_active_coach_of"(( SELECT "auth"."uid"() AS "uid"), "w"."user_id"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."workout_preparatory_exercises" "wpe"
     JOIN "public"."workouts" "w" ON (("w"."id" = "wpe"."workout_id")))
  WHERE (("wpe"."id" = "workout_preparatory_sets"."workout_preparatory_exercise_id") AND "public"."is_active_coach_of"(( SELECT "auth"."uid"() AS "uid"), "w"."user_id")))));



CREATE POLICY "Public profiles are viewable by everyone." ON "public"."profiles" FOR SELECT USING (true);



CREATE POLICY "Service role can manage subscriptions" ON "public"."subscriptions" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Testimonials are viewable by everyone (published only) or by ow" ON "public"."coach_testimonials" FOR SELECT USING ((("status" = 'published'::"text") OR ("coach_id" = ( SELECT "auth"."uid"() AS "uid")) OR ("athlete_id" = ( SELECT "auth"."uid"() AS "uid"))));



CREATE POLICY "Users can insert their own profile." ON "public"."profiles" FOR INSERT WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "id"));



CREATE POLICY "Users can read own overrides" ON "public"."subscription_feature_overrides" FOR SELECT TO "authenticated" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can read own subscription" ON "public"."subscriptions" FOR SELECT TO "authenticated" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can update own profile." ON "public"."profiles" FOR UPDATE USING ((( SELECT "auth"."uid"() AS "uid") = "id"));



CREATE POLICY "adjustments_via_periodization" ON "public"."periodization_adjustments" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."periodizations" "p"
  WHERE (("p"."id" = "periodization_adjustments"."periodization_id") AND (("p"."created_by" = ( SELECT "auth"."uid"() AS "uid")) OR ("p"."athlete_id" = ( SELECT "auth"."uid"() AS "uid")))))));



CREATE POLICY "athlete_insert_own_exceptions" ON "public"."coach_recurring_schedule_exceptions" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."coach_recurring_schedules" "rs"
  WHERE (("rs"."id" = "coach_recurring_schedule_exceptions"."schedule_id") AND ("rs"."athlete_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "athlete_manage_own_sessions" ON "public"."coach_sessions" TO "authenticated" USING (("athlete_id" = ( SELECT "auth"."uid"() AS "uid"))) WITH CHECK (("athlete_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "athlete_view_coach_availability" ON "public"."coach_availability" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."coach_athletes"
  WHERE (("coach_athletes"."coach_id" = "coach_availability"."coach_id") AND ("coach_athletes"."athlete_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("coach_athletes"."status" = 'active'::"text")))));



CREATE POLICY "athlete_view_coach_overrides" ON "public"."coach_availability_overrides" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."coach_athletes"
  WHERE (("coach_athletes"."coach_id" = "coach_availability_overrides"."coach_id") AND ("coach_athletes"."athlete_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("coach_athletes"."status" = 'active'::"text")))));



CREATE POLICY "athlete_view_linked_payments" ON "public"."payments" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."payment_sessions" "ps"
     JOIN "public"."coach_sessions" "cs" ON (("cs"."id" = "ps"."session_id")))
  WHERE (("ps"."payment_id" = "payments"."id") AND ("cs"."athlete_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "athlete_view_own_exceptions" ON "public"."coach_recurring_schedule_exceptions" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."coach_recurring_schedules" "rs"
  WHERE (("rs"."id" = "coach_recurring_schedule_exceptions"."schedule_id") AND ("rs"."athlete_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "athlete_view_own_recurring_schedules" ON "public"."coach_recurring_schedules" FOR SELECT TO "authenticated" USING (("athlete_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "athlete_view_payment_sessions" ON "public"."payment_sessions" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."coach_sessions" "cs"
  WHERE (("cs"."id" = "payment_sessions"."session_id") AND ("cs"."athlete_id" = ( SELECT "auth"."uid"() AS "uid"))))));



ALTER TABLE "public"."cardio_programs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "cardio_programs_delete_owner" ON "public"."cardio_programs" FOR DELETE TO "authenticated" USING (("created_by" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "cardio_programs_insert_owner" ON "public"."cardio_programs" FOR INSERT TO "authenticated" WITH CHECK ((("created_by" = ( SELECT "auth"."uid"() AS "uid")) AND (("athlete_id" = ( SELECT "auth"."uid"() AS "uid")) OR "public"."is_active_coach_of"(( SELECT "auth"."uid"() AS "uid"), "athlete_id"))));



CREATE POLICY "cardio_programs_select_owner_or_athlete" ON "public"."cardio_programs" FOR SELECT TO "authenticated" USING ((("created_by" = ( SELECT "auth"."uid"() AS "uid")) OR ("athlete_id" = ( SELECT "auth"."uid"() AS "uid"))));



CREATE POLICY "cardio_programs_update_owner" ON "public"."cardio_programs" FOR UPDATE TO "authenticated" USING (("created_by" = ( SELECT "auth"."uid"() AS "uid"))) WITH CHECK (("created_by" = ( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."coach_athletes" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "coach_athletes_insert_participants" ON "public"."coach_athletes" FOR INSERT TO "authenticated" WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "coach_id"));



CREATE POLICY "coach_athletes_select_participants" ON "public"."coach_athletes" FOR SELECT TO "authenticated" USING (((( SELECT "auth"."uid"() AS "uid") = "coach_id") OR (( SELECT "auth"."uid"() AS "uid") = "athlete_id")));



CREATE POLICY "coach_athletes_update_participants" ON "public"."coach_athletes" FOR UPDATE TO "authenticated" USING (((( SELECT "auth"."uid"() AS "uid") = "coach_id") OR (( SELECT "auth"."uid"() AS "uid") = "athlete_id"))) WITH CHECK (((( SELECT "auth"."uid"() AS "uid") = "coach_id") OR (( SELECT "auth"."uid"() AS "uid") = "athlete_id")));



ALTER TABLE "public"."coach_availability" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."coach_availability_overrides" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."coach_gym_schedules" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."coach_gyms" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "coach_manage_own_availability" ON "public"."coach_availability" TO "authenticated" USING (("coach_id" = ( SELECT "auth"."uid"() AS "uid"))) WITH CHECK (("coach_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "coach_manage_own_exceptions" ON "public"."coach_recurring_schedule_exceptions" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."coach_recurring_schedules" "rs"
  WHERE (("rs"."id" = "coach_recurring_schedule_exceptions"."schedule_id") AND ("rs"."coach_id" = ( SELECT "auth"."uid"() AS "uid")))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."coach_recurring_schedules" "rs"
  WHERE (("rs"."id" = "coach_recurring_schedule_exceptions"."schedule_id") AND ("rs"."coach_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "coach_manage_own_overrides" ON "public"."coach_availability_overrides" TO "authenticated" USING (("coach_id" = ( SELECT "auth"."uid"() AS "uid"))) WITH CHECK (("coach_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "coach_manage_own_payments" ON "public"."payments" TO "authenticated" USING (("coach_id" = ( SELECT "auth"."uid"() AS "uid"))) WITH CHECK (("coach_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "coach_manage_own_sessions" ON "public"."coach_sessions" TO "authenticated" USING (("coach_id" = ( SELECT "auth"."uid"() AS "uid"))) WITH CHECK (("coach_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "coach_manage_payment_sessions" ON "public"."payment_sessions" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."coach_sessions" "cs"
  WHERE (("cs"."id" = "payment_sessions"."session_id") AND ("cs"."coach_id" = ( SELECT "auth"."uid"() AS "uid")))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."coach_sessions" "cs"
  WHERE (("cs"."id" = "payment_sessions"."session_id") AND ("cs"."coach_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "coach_manage_recurring_schedules" ON "public"."coach_recurring_schedules" TO "authenticated" USING (("coach_id" = ( SELECT "auth"."uid"() AS "uid"))) WITH CHECK (("coach_id" = ( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."coach_recurring_schedule_exceptions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."coach_recurring_schedules" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."coach_service_area_schedules" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."coach_service_areas" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."coach_service_types" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."coach_session_disputes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."coach_sessions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."coach_testimonials" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."equipments" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "equipments_select_authenticated" ON "public"."equipments" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."exercises" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "exercises_delete_scoped" ON "public"."exercises" FOR DELETE TO "authenticated" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "exercises_insert_scoped" ON "public"."exercises" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "exercises_select_scoped" ON "public"."exercises" FOR SELECT TO "authenticated" USING ((("user_id" IS NULL) OR ("user_id" = ( SELECT "auth"."uid"() AS "uid")) OR "public"."is_active_coach_of"(( SELECT "auth"."uid"() AS "uid"), "user_id") OR ("id" IN ( SELECT "v"."exercise_id"
   FROM ("public"."variations" "v"
     JOIN "public"."shared_variations" "sv" ON (("sv"."variation_id" = "v"."id")))
  WHERE ("sv"."shared_with_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "exercises_update_scoped" ON "public"."exercises" FOR UPDATE TO "authenticated" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid"))) WITH CHECK (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."feature_keys" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."muscles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "muscles_select_authenticated" ON "public"."muscles" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."notification_preferences" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."notifications" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "notifications_insert_authenticated" ON "public"."notifications" FOR INSERT TO "authenticated" WITH CHECK (((( SELECT "auth"."uid"() AS "uid") = "sender_user_id") OR (("sender_user_id" IS NULL) AND (( SELECT "auth"."uid"() AS "uid") = "recipient_user_id"))));



CREATE POLICY "notifications_insert_system" ON "public"."notifications" FOR INSERT TO "service_role" WITH CHECK (true);



CREATE POLICY "notifications_select_recipient" ON "public"."notifications" FOR SELECT TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "recipient_user_id"));



CREATE POLICY "notifications_update_recipient" ON "public"."notifications" FOR UPDATE TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "recipient_user_id")) WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "recipient_user_id"));



ALTER TABLE "public"."payment_sessions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."payments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."periodization_adjustments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."periodization_occurrences" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "periodization_occurrences_delete" ON "public"."periodization_occurrences" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."periodizations" "p"
  WHERE (("p"."id" = "periodization_occurrences"."periodization_id") AND (("p"."created_by" = ( SELECT "auth"."uid"() AS "uid")) OR ("p"."athlete_id" = ( SELECT "auth"."uid"() AS "uid")))))));



CREATE POLICY "periodization_occurrences_insert" ON "public"."periodization_occurrences" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."periodizations" "p"
  WHERE (("p"."id" = "periodization_occurrences"."periodization_id") AND (("p"."created_by" = ( SELECT "auth"."uid"() AS "uid")) OR ("p"."athlete_id" = ( SELECT "auth"."uid"() AS "uid")))))));



CREATE POLICY "periodization_occurrences_select" ON "public"."periodization_occurrences" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."periodizations" "p"
  WHERE (("p"."id" = "periodization_occurrences"."periodization_id") AND (("p"."created_by" = ( SELECT "auth"."uid"() AS "uid")) OR ("p"."athlete_id" = ( SELECT "auth"."uid"() AS "uid")))))));



CREATE POLICY "periodization_occurrences_update" ON "public"."periodization_occurrences" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."periodizations" "p"
  WHERE (("p"."id" = "periodization_occurrences"."periodization_id") AND (("p"."created_by" = ( SELECT "auth"."uid"() AS "uid")) OR ("p"."athlete_id" = ( SELECT "auth"."uid"() AS "uid"))))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."periodizations" "p"
  WHERE (("p"."id" = "periodization_occurrences"."periodization_id") AND (("p"."created_by" = ( SELECT "auth"."uid"() AS "uid")) OR ("p"."athlete_id" = ( SELECT "auth"."uid"() AS "uid")))))));



ALTER TABLE "public"."periodization_template_activities" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."periodization_template_days" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."periodizations" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "periodizations_delete" ON "public"."periodizations" FOR DELETE TO "authenticated" USING (("created_by" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "periodizations_insert" ON "public"."periodizations" FOR INSERT TO "authenticated" WITH CHECK ((("created_by" = ( SELECT "auth"."uid"() AS "uid")) AND (("athlete_id" = ( SELECT "auth"."uid"() AS "uid")) OR "public"."is_active_coach_of"(( SELECT "auth"."uid"() AS "uid"), "athlete_id"))));



CREATE POLICY "periodizations_select" ON "public"."periodizations" FOR SELECT TO "authenticated" USING ((("created_by" = ( SELECT "auth"."uid"() AS "uid")) OR ("athlete_id" = ( SELECT "auth"."uid"() AS "uid"))));



CREATE POLICY "periodizations_update" ON "public"."periodizations" FOR UPDATE TO "authenticated" USING (("created_by" = ( SELECT "auth"."uid"() AS "uid"))) WITH CHECK (("created_by" = ( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."plan_feature_limits" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."push_subscriptions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."report_favorites" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "report_favorites_delete" ON "public"."report_favorites" FOR DELETE TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "report_favorites_insert" ON "public"."report_favorites" FOR INSERT TO "authenticated" WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "report_favorites_select" ON "public"."report_favorites" FOR SELECT TO "authenticated" USING (((( SELECT "auth"."uid"() AS "uid") = "user_id") OR "public"."is_active_coach_of"(( SELECT "auth"."uid"() AS "uid"), "target_user_id")));



CREATE POLICY "report_favorites_update" ON "public"."report_favorites" FOR UPDATE TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "user_id")) WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "session_participants_manage_disputes" ON "public"."coach_session_disputes" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."coach_sessions"
  WHERE (("coach_sessions"."id" = "coach_session_disputes"."session_id") AND (("coach_sessions"."coach_id" = ( SELECT "auth"."uid"() AS "uid")) OR ("coach_sessions"."athlete_id" = ( SELECT "auth"."uid"() AS "uid"))))))) WITH CHECK ((("author_id" = ( SELECT "auth"."uid"() AS "uid")) AND (EXISTS ( SELECT 1
   FROM "public"."coach_sessions"
  WHERE (("coach_sessions"."id" = "coach_session_disputes"."session_id") AND (("coach_sessions"."coach_id" = ( SELECT "auth"."uid"() AS "uid")) OR ("coach_sessions"."athlete_id" = ( SELECT "auth"."uid"() AS "uid"))))))));



ALTER TABLE "public"."shared_variations" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "shared_variations_delete" ON "public"."shared_variations" FOR DELETE TO "authenticated" USING (("owner_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "shared_variations_insert" ON "public"."shared_variations" FOR INSERT TO "authenticated" WITH CHECK ((("owner_id" = ( SELECT "auth"."uid"() AS "uid")) AND (EXISTS ( SELECT 1
   FROM "public"."variations" "v"
  WHERE (("v"."id" = "shared_variations"."variation_id") AND ("v"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))) AND "public"."is_active_coach_of"(( SELECT "auth"."uid"() AS "uid"), "shared_with_id")));



CREATE POLICY "shared_variations_select" ON "public"."shared_variations" FOR SELECT TO "authenticated" USING ((("owner_id" = ( SELECT "auth"."uid"() AS "uid")) OR ("shared_with_id" = ( SELECT "auth"."uid"() AS "uid"))));



ALTER TABLE "public"."stripe_events" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."stripe_price_map" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."subscription_feature_overrides" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."subscription_plans" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."subscriptions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "template_activities_delete_owner" ON "public"."periodization_template_activities" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."periodization_template_days" "d"
     JOIN "public"."periodizations" "p" ON (("p"."id" = "d"."periodization_id")))
  WHERE (("d"."id" = "periodization_template_activities"."template_day_id") AND ("p"."created_by" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "template_activities_insert_owner" ON "public"."periodization_template_activities" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."periodization_template_days" "d"
     JOIN "public"."periodizations" "p" ON (("p"."id" = "d"."periodization_id")))
  WHERE (("d"."id" = "periodization_template_activities"."template_day_id") AND ("p"."created_by" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "template_activities_select_owner_or_athlete" ON "public"."periodization_template_activities" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."periodization_template_days" "d"
     JOIN "public"."periodizations" "p" ON (("p"."id" = "d"."periodization_id")))
  WHERE (("d"."id" = "periodization_template_activities"."template_day_id") AND (("p"."created_by" = ( SELECT "auth"."uid"() AS "uid")) OR ("p"."athlete_id" = ( SELECT "auth"."uid"() AS "uid")))))));



CREATE POLICY "template_activities_update_owner" ON "public"."periodization_template_activities" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."periodization_template_days" "d"
     JOIN "public"."periodizations" "p" ON (("p"."id" = "d"."periodization_id")))
  WHERE (("d"."id" = "periodization_template_activities"."template_day_id") AND ("p"."created_by" = ( SELECT "auth"."uid"() AS "uid")))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."periodization_template_days" "d"
     JOIN "public"."periodizations" "p" ON (("p"."id" = "d"."periodization_id")))
  WHERE (("d"."id" = "periodization_template_activities"."template_day_id") AND ("p"."created_by" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "template_days_delete_owner" ON "public"."periodization_template_days" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."periodizations" "p"
  WHERE (("p"."id" = "periodization_template_days"."periodization_id") AND ("p"."created_by" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "template_days_insert_owner" ON "public"."periodization_template_days" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."periodizations" "p"
  WHERE (("p"."id" = "periodization_template_days"."periodization_id") AND ("p"."created_by" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "template_days_select_owner_or_athlete" ON "public"."periodization_template_days" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."periodizations" "p"
  WHERE (("p"."id" = "periodization_template_days"."periodization_id") AND (("p"."created_by" = ( SELECT "auth"."uid"() AS "uid")) OR ("p"."athlete_id" = ( SELECT "auth"."uid"() AS "uid")))))));



CREATE POLICY "template_days_update_owner" ON "public"."periodization_template_days" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."periodizations" "p"
  WHERE (("p"."id" = "periodization_template_days"."periodization_id") AND ("p"."created_by" = ( SELECT "auth"."uid"() AS "uid")))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."periodizations" "p"
  WHERE (("p"."id" = "periodization_template_days"."periodization_id") AND ("p"."created_by" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "users_manage_own_push_preferences" ON "public"."notification_preferences" TO "authenticated" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid"))) WITH CHECK (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "users_manage_own_push_subscriptions" ON "public"."push_subscriptions" TO "authenticated" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid"))) WITH CHECK (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."variation_videos" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "variation_videos_modify_owner" ON "public"."variation_videos" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."variations" "v"
  WHERE (("v"."id" = "variation_videos"."variation_id") AND ("v"."user_id" = ( SELECT "auth"."uid"() AS "uid")))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."variations" "v"
  WHERE (("v"."id" = "variation_videos"."variation_id") AND ("v"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "variation_videos_select_scoped" ON "public"."variation_videos" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."variations" "v"
  WHERE (("v"."id" = "variation_videos"."variation_id") AND (("v"."user_id" IS NULL) OR ("v"."user_id" = ( SELECT "auth"."uid"() AS "uid")) OR "public"."is_active_coach_of"(( SELECT "auth"."uid"() AS "uid"), "v"."user_id") OR ("v"."id" IN ( SELECT "shared_variations"."variation_id"
           FROM "public"."shared_variations"
          WHERE ("shared_variations"."shared_with_id" = ( SELECT "auth"."uid"() AS "uid")))))))));



ALTER TABLE "public"."variations" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "variations_delete_scoped" ON "public"."variations" FOR DELETE TO "authenticated" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "variations_insert_scoped" ON "public"."variations" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "variations_select_scoped" ON "public"."variations" FOR SELECT TO "authenticated" USING ((("user_id" IS NULL) OR ("user_id" = ( SELECT "auth"."uid"() AS "uid")) OR "public"."is_active_coach_of"(( SELECT "auth"."uid"() AS "uid"), "user_id") OR ("id" IN ( SELECT "shared_variations"."variation_id"
   FROM "public"."shared_variations"
  WHERE ("shared_variations"."shared_with_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "variations_update_scoped" ON "public"."variations" FOR UPDATE TO "authenticated" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid"))) WITH CHECK (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."workout_exercise_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."workout_exercise_set_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."workout_exercises" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "workout_exercises_delete_scoped" ON "public"."workout_exercises" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."workouts" "w"
  WHERE (("w"."id" = "workout_exercises"."workout_id") AND (("w"."user_id" = ( SELECT "auth"."uid"() AS "uid")) OR "public"."is_active_coach_of"(( SELECT "auth"."uid"() AS "uid"), "w"."user_id"))))));



CREATE POLICY "workout_exercises_insert_scoped" ON "public"."workout_exercises" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."workouts" "w"
  WHERE (("w"."id" = "workout_exercises"."workout_id") AND (("w"."user_id" = ( SELECT "auth"."uid"() AS "uid")) OR "public"."is_active_coach_of"(( SELECT "auth"."uid"() AS "uid"), "w"."user_id"))))));



CREATE POLICY "workout_exercises_select_scoped" ON "public"."workout_exercises" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."workouts" "w"
  WHERE (("w"."id" = "workout_exercises"."workout_id") AND (("w"."user_id" = ( SELECT "auth"."uid"() AS "uid")) OR "public"."is_active_coach_of"(( SELECT "auth"."uid"() AS "uid"), "w"."user_id"))))));



CREATE POLICY "workout_exercises_update_scoped" ON "public"."workout_exercises" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."workouts" "w"
  WHERE (("w"."id" = "workout_exercises"."workout_id") AND (("w"."user_id" = ( SELECT "auth"."uid"() AS "uid")) OR "public"."is_active_coach_of"(( SELECT "auth"."uid"() AS "uid"), "w"."user_id")))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."workouts" "w"
  WHERE (("w"."id" = "workout_exercises"."workout_id") AND (("w"."user_id" = ( SELECT "auth"."uid"() AS "uid")) OR "public"."is_active_coach_of"(( SELECT "auth"."uid"() AS "uid"), "w"."user_id"))))));



ALTER TABLE "public"."workout_folders" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "workout_folders_delete_scoped" ON "public"."workout_folders" FOR DELETE TO "authenticated" USING ((("user_id" = ( SELECT "auth"."uid"() AS "uid")) OR "public"."is_active_coach_of"(( SELECT "auth"."uid"() AS "uid"), "user_id")));



CREATE POLICY "workout_folders_insert_scoped" ON "public"."workout_folders" FOR INSERT TO "authenticated" WITH CHECK ((("user_id" = ( SELECT "auth"."uid"() AS "uid")) OR "public"."is_active_coach_of"(( SELECT "auth"."uid"() AS "uid"), "user_id")));



CREATE POLICY "workout_folders_select_scoped" ON "public"."workout_folders" FOR SELECT TO "authenticated" USING ((("user_id" = ( SELECT "auth"."uid"() AS "uid")) OR "public"."is_active_coach_of"(( SELECT "auth"."uid"() AS "uid"), "user_id")));



CREATE POLICY "workout_folders_update_scoped" ON "public"."workout_folders" FOR UPDATE TO "authenticated" USING ((("user_id" = ( SELECT "auth"."uid"() AS "uid")) OR "public"."is_active_coach_of"(( SELECT "auth"."uid"() AS "uid"), "user_id"))) WITH CHECK ((("user_id" = ( SELECT "auth"."uid"() AS "uid")) OR "public"."is_active_coach_of"(( SELECT "auth"."uid"() AS "uid"), "user_id")));



ALTER TABLE "public"."workout_log_summaries" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "workout_log_summaries_update" ON "public"."workout_log_summaries" FOR UPDATE TO "authenticated" USING ((("user_id" = ( SELECT "auth"."uid"() AS "uid")) OR "public"."is_active_coach_of"(( SELECT "auth"."uid"() AS "uid"), "user_id"))) WITH CHECK ((("user_id" = ( SELECT "auth"."uid"() AS "uid")) OR "public"."is_active_coach_of"(( SELECT "auth"."uid"() AS "uid"), "user_id")));



ALTER TABLE "public"."workout_logs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "workout_logs_soft_delete" ON "public"."workout_logs" FOR UPDATE TO "authenticated" USING ((("user_id" = ( SELECT "auth"."uid"() AS "uid")) OR "public"."is_active_coach_of"(( SELECT "auth"."uid"() AS "uid"), "user_id"))) WITH CHECK ((("user_id" = ( SELECT "auth"."uid"() AS "uid")) OR "public"."is_active_coach_of"(( SELECT "auth"."uid"() AS "uid"), "user_id")));



ALTER TABLE "public"."workout_preparatory_exercise_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."workout_preparatory_exercises" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."workout_preparatory_set_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."workout_preparatory_sets" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."workout_sets" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "workout_sets_delete_own" ON "public"."workout_sets" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."workout_exercises" "we"
     JOIN "public"."workouts" "w" ON (("w"."id" = "we"."workout_id")))
  WHERE (("we"."id" = "workout_sets"."workout_exercise_id") AND (("w"."user_id" = ( SELECT "auth"."uid"() AS "uid")) OR "public"."is_active_coach_of"(( SELECT "auth"."uid"() AS "uid"), "w"."user_id"))))));



CREATE POLICY "workout_sets_insert_scoped" ON "public"."workout_sets" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."workout_exercises" "we"
     JOIN "public"."workouts" "w" ON (("w"."id" = "we"."workout_id")))
  WHERE (("we"."id" = "workout_sets"."workout_exercise_id") AND (("w"."user_id" = ( SELECT "auth"."uid"() AS "uid")) OR "public"."is_active_coach_of"(( SELECT "auth"."uid"() AS "uid"), "w"."user_id"))))));



CREATE POLICY "workout_sets_select_scoped" ON "public"."workout_sets" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."workout_exercises" "we"
     JOIN "public"."workouts" "w" ON (("w"."id" = "we"."workout_id")))
  WHERE (("we"."id" = "workout_sets"."workout_exercise_id") AND (("w"."user_id" = ( SELECT "auth"."uid"() AS "uid")) OR "public"."is_active_coach_of"(( SELECT "auth"."uid"() AS "uid"), "w"."user_id"))))));



CREATE POLICY "workout_sets_update_scoped" ON "public"."workout_sets" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."workout_exercises" "we"
     JOIN "public"."workouts" "w" ON (("w"."id" = "we"."workout_id")))
  WHERE (("we"."id" = "workout_sets"."workout_exercise_id") AND (("w"."user_id" = ( SELECT "auth"."uid"() AS "uid")) OR "public"."is_active_coach_of"(( SELECT "auth"."uid"() AS "uid"), "w"."user_id")))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."workout_exercises" "we"
     JOIN "public"."workouts" "w" ON (("w"."id" = "we"."workout_id")))
  WHERE (("we"."id" = "workout_sets"."workout_exercise_id") AND (("w"."user_id" = ( SELECT "auth"."uid"() AS "uid")) OR "public"."is_active_coach_of"(( SELECT "auth"."uid"() AS "uid"), "w"."user_id"))))));



ALTER TABLE "public"."workout_variation_records" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."workouts" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "workouts_delete_own" ON "public"."workouts" FOR DELETE TO "authenticated" USING ((("user_id" = ( SELECT "auth"."uid"() AS "uid")) OR "public"."is_active_coach_of"(( SELECT "auth"."uid"() AS "uid"), "user_id")));



CREATE POLICY "workouts_insert_scoped" ON "public"."workouts" FOR INSERT TO "authenticated" WITH CHECK ((("user_id" = ( SELECT "auth"."uid"() AS "uid")) OR "public"."is_active_coach_of"(( SELECT "auth"."uid"() AS "uid"), "user_id")));



CREATE POLICY "workouts_select_scoped" ON "public"."workouts" FOR SELECT TO "authenticated" USING ((("user_id" = ( SELECT "auth"."uid"() AS "uid")) OR "public"."is_active_coach_of"(( SELECT "auth"."uid"() AS "uid"), "user_id")));



CREATE POLICY "workouts_update_scoped" ON "public"."workouts" FOR UPDATE TO "authenticated" USING ((("user_id" = ( SELECT "auth"."uid"() AS "uid")) OR "public"."is_active_coach_of"(( SELECT "auth"."uid"() AS "uid"), "user_id"))) WITH CHECK ((("user_id" = ( SELECT "auth"."uid"() AS "uid")) OR "public"."is_active_coach_of"(( SELECT "auth"."uid"() AS "uid"), "user_id")));





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";






ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."notifications";









GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";
































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































GRANT ALL ON FUNCTION "public"."accept_coach_invite_with_side_effects"("p_invite_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."accept_coach_invite_with_side_effects"("p_invite_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."accept_coach_invite_with_side_effects"("p_invite_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."batch_update_summary_snapshots"("p_updates" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."batch_update_summary_snapshots"("p_updates" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."batch_update_summary_snapshots"("p_updates" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."broadcast_notification_insert"() TO "anon";
GRANT ALL ON FUNCTION "public"."broadcast_notification_insert"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."broadcast_notification_insert"() TO "service_role";



GRANT ALL ON FUNCTION "public"."check_email_exists"("p_email" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."check_email_exists"("p_email" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_email_exists"("p_email" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."claim_video_transcode"("p_variation_id" "uuid", "p_max_attempts" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."claim_video_transcode"("p_variation_id" "uuid", "p_max_attempts" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."claim_video_transcode"("p_variation_id" "uuid", "p_max_attempts" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."claim_video_transcode"("p_variation_id" "uuid", "p_max_attempts" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."copy_workout"("p_source_workout_id" "uuid", "p_target_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."copy_workout"("p_source_workout_id" "uuid", "p_target_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."copy_workout"("p_source_workout_id" "uuid", "p_target_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_email_invite_relationship"("p_coach_id" "uuid", "p_athlete_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."create_email_invite_relationship"("p_coach_id" "uuid", "p_athlete_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_email_invite_relationship"("p_coach_id" "uuid", "p_athlete_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."delete_exercise_variation"("p_variation_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."delete_exercise_variation"("p_variation_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."delete_exercise_variation"("p_variation_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."delete_exercise_variation"("p_user_id" "uuid", "p_variation_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."delete_exercise_variation"("p_user_id" "uuid", "p_variation_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."delete_exercise_variation"("p_user_id" "uuid", "p_variation_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."delete_folder"("p_folder_id" "uuid", "p_mode" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."delete_folder"("p_folder_id" "uuid", "p_mode" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."delete_folder"("p_folder_id" "uuid", "p_mode" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."dispatch_variation_video_transcode"("p_variation_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."dispatch_variation_video_transcode"("p_variation_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."dispatch_variation_video_transcode"("p_variation_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."dispatch_variation_video_transcode"("p_variation_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."enforce_workout_folder_same_owner"() TO "anon";
GRANT ALL ON FUNCTION "public"."enforce_workout_folder_same_owner"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."enforce_workout_folder_same_owner"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."enqueue_variation_video_deletion"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."enqueue_variation_video_deletion"() TO "anon";
GRANT ALL ON FUNCTION "public"."enqueue_variation_video_deletion"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."enqueue_variation_video_deletion"() TO "service_role";



GRANT ALL ON FUNCTION "public"."expand_muscle_ids"("p_muscle_ids" "uuid"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."expand_muscle_ids"("p_muscle_ids" "uuid"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."expand_muscle_ids"("p_muscle_ids" "uuid"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_coach_athlete_metrics"("p_coach_id" "uuid", "p_days" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_coach_athlete_metrics"("p_coach_id" "uuid", "p_days" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_coach_athlete_metrics"("p_coach_id" "uuid", "p_days" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_coach_occupied_slots"("p_coach_id" "uuid", "p_start_date" "date", "p_end_date" "date", "p_timezone" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_coach_occupied_slots"("p_coach_id" "uuid", "p_start_date" "date", "p_end_date" "date", "p_timezone" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_coach_occupied_slots"("p_coach_id" "uuid", "p_start_date" "date", "p_end_date" "date", "p_timezone" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_coach_testimonial_stats"("p_coach_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_coach_testimonial_stats"("p_coach_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_coach_testimonial_stats"("p_coach_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_previous_workout_log_for_summary"("p_user_id" "uuid", "p_workout_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_previous_workout_log_for_summary"("p_user_id" "uuid", "p_workout_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_previous_workout_log_for_summary"("p_user_id" "uuid", "p_workout_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_previous_workout_sets"("p_user_id" "uuid", "p_variation_ids" "uuid"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."get_previous_workout_sets"("p_user_id" "uuid", "p_variation_ids" "uuid"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_previous_workout_sets"("p_user_id" "uuid", "p_variation_ids" "uuid"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_summary_recalculation_context"("p_user_id" "uuid", "p_started_at" timestamp with time zone) TO "anon";
GRANT ALL ON FUNCTION "public"."get_summary_recalculation_context"("p_user_id" "uuid", "p_started_at" timestamp with time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_summary_recalculation_context"("p_user_id" "uuid", "p_started_at" timestamp with time zone) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_variation_history"("p_user_id" "uuid", "p_variation_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_variation_history"("p_user_id" "uuid", "p_variation_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_variation_history"("p_user_id" "uuid", "p_variation_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_variation_last"("p_user_id" "uuid", "p_variation_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_variation_last"("p_user_id" "uuid", "p_variation_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_variation_last"("p_user_id" "uuid", "p_variation_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_variation_progress"("p_user_id" "uuid", "p_variation_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_variation_progress"("p_user_id" "uuid", "p_variation_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_variation_progress"("p_user_id" "uuid", "p_variation_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_variation_records"("p_user_id" "uuid", "p_variation_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_variation_records"("p_user_id" "uuid", "p_variation_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_variation_records"("p_user_id" "uuid", "p_variation_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_variation_usage"("p_variation_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_variation_usage"("p_variation_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_variation_usage"("p_variation_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_workout"("p_workout_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_workout"("p_workout_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_workout"("p_workout_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_workout_log_summary"("p_workout_log_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_workout_log_summary"("p_workout_log_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_workout_log_summary"("p_workout_log_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_workout_variation_records"("p_user_id" "uuid", "p_variation_ids" "uuid"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."get_workout_variation_records"("p_user_id" "uuid", "p_variation_ids" "uuid"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_workout_variation_records"("p_user_id" "uuid", "p_variation_ids" "uuid"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."guard_notification_update"() TO "anon";
GRANT ALL ON FUNCTION "public"."guard_notification_update"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."guard_notification_update"() TO "service_role";



GRANT ALL ON FUNCTION "public"."guard_profile_role_transition"() TO "anon";
GRANT ALL ON FUNCTION "public"."guard_profile_role_transition"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."guard_profile_role_transition"() TO "service_role";



GRANT ALL ON FUNCTION "public"."guard_report_favorite_update"() TO "anon";
GRANT ALL ON FUNCTION "public"."guard_report_favorite_update"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."guard_report_favorite_update"() TO "service_role";



GRANT ALL ON FUNCTION "public"."guard_workout_log_soft_delete"() TO "anon";
GRANT ALL ON FUNCTION "public"."guard_workout_log_soft_delete"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."guard_workout_log_soft_delete"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_subscription"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_subscription"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_subscription"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."insert_workout_log"("payload" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."insert_workout_log"("payload" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."insert_workout_log"("payload" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."insert_workout_log_with_summary"("payload" "jsonb", "summary_snapshot" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."insert_workout_log_with_summary"("payload" "jsonb", "summary_snapshot" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."insert_workout_log_with_summary"("payload" "jsonb", "summary_snapshot" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_active_coach_of"("p_coach_id" "uuid", "p_athlete_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_active_coach_of"("p_coach_id" "uuid", "p_athlete_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_active_coach_of"("p_coach_id" "uuid", "p_athlete_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."list_periodizations"("p_created_by" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."list_periodizations"("p_created_by" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."list_periodizations"("p_created_by" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."list_variation_views_for_mobile"("p_user_id" "uuid", "p_muscle_ids" "uuid"[], "p_equipment_ids" "uuid"[], "p_visibility" "text", "p_exercise_types" "text"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."list_variation_views_for_mobile"("p_user_id" "uuid", "p_muscle_ids" "uuid"[], "p_equipment_ids" "uuid"[], "p_visibility" "text", "p_exercise_types" "text"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."list_variation_views_for_mobile"("p_user_id" "uuid", "p_muscle_ids" "uuid"[], "p_equipment_ids" "uuid"[], "p_visibility" "text", "p_exercise_types" "text"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."list_workouts_with_summary"("p_user_id" "uuid", "p_folder_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."list_workouts_with_summary"("p_user_id" "uuid", "p_folder_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."list_workouts_with_summary"("p_user_id" "uuid", "p_folder_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."on_variation_video_upsert_dispatch_transcode"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."on_variation_video_upsert_dispatch_transcode"() TO "anon";
GRANT ALL ON FUNCTION "public"."on_variation_video_upsert_dispatch_transcode"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."on_variation_video_upsert_dispatch_transcode"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."pgmq_archive"("queue_name" "text", "msg_id" bigint) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."pgmq_archive"("queue_name" "text", "msg_id" bigint) TO "anon";
GRANT ALL ON FUNCTION "public"."pgmq_archive"("queue_name" "text", "msg_id" bigint) TO "authenticated";
GRANT ALL ON FUNCTION "public"."pgmq_archive"("queue_name" "text", "msg_id" bigint) TO "service_role";



REVOKE ALL ON FUNCTION "public"."pgmq_delete"("queue_name" "text", "msg_id" bigint) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."pgmq_delete"("queue_name" "text", "msg_id" bigint) TO "anon";
GRANT ALL ON FUNCTION "public"."pgmq_delete"("queue_name" "text", "msg_id" bigint) TO "authenticated";
GRANT ALL ON FUNCTION "public"."pgmq_delete"("queue_name" "text", "msg_id" bigint) TO "service_role";



REVOKE ALL ON FUNCTION "public"."pgmq_read"("queue_name" "text", "vt" integer, "qty" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."pgmq_read"("queue_name" "text", "vt" integer, "qty" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."pgmq_read"("queue_name" "text", "vt" integer, "qty" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."pgmq_read"("queue_name" "text", "vt" integer, "qty" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."recalculate_variation_records"("p_user_id" "uuid", "p_variation_ids" "uuid"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."recalculate_variation_records"("p_user_id" "uuid", "p_variation_ids" "uuid"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."recalculate_variation_records"("p_user_id" "uuid", "p_variation_ids" "uuid"[]) TO "service_role";



REVOKE ALL ON FUNCTION "public"."recover_stuck_video_transcodes"("p_pending_after_minutes" integer, "p_processing_after_minutes" integer, "p_limit" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."recover_stuck_video_transcodes"("p_pending_after_minutes" integer, "p_processing_after_minutes" integer, "p_limit" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."recover_stuck_video_transcodes"("p_pending_after_minutes" integer, "p_processing_after_minutes" integer, "p_limit" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."recover_stuck_video_transcodes"("p_pending_after_minutes" integer, "p_processing_after_minutes" integer, "p_limit" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."replace_future_occurrences"("p_periodization_id" "uuid", "p_from_date" "date", "p_rows" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."replace_future_occurrences"("p_periodization_id" "uuid", "p_from_date" "date", "p_rows" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."replace_future_occurrences"("p_periodization_id" "uuid", "p_from_date" "date", "p_rows" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."resolve_all_feature_access"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."resolve_all_feature_access"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."resolve_all_feature_access"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."resolve_feature_access"("p_user_id" "uuid", "p_feature_key" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."resolve_feature_access"("p_user_id" "uuid", "p_feature_key" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."resolve_feature_access"("p_user_id" "uuid", "p_feature_key" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."save_periodization_edit"("p_periodization_id" "uuid", "p_start_date" "date", "p_end_date" "date", "p_adjustments_delete" "uuid"[], "p_adjustments_upsert" "jsonb", "p_occurrences_delete" "uuid"[], "p_occurrences_insert" "jsonb", "p_occurrences_update" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."save_periodization_edit"("p_periodization_id" "uuid", "p_start_date" "date", "p_end_date" "date", "p_adjustments_delete" "uuid"[], "p_adjustments_upsert" "jsonb", "p_occurrences_delete" "uuid"[], "p_occurrences_insert" "jsonb", "p_occurrences_update" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."save_periodization_edit"("p_periodization_id" "uuid", "p_start_date" "date", "p_end_date" "date", "p_adjustments_delete" "uuid"[], "p_adjustments_upsert" "jsonb", "p_occurrences_delete" "uuid"[], "p_occurrences_insert" "jsonb", "p_occurrences_update" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."search_coaches_by_gym_location"("p_lng" double precision, "p_lat" double precision, "p_radius_meters" double precision) TO "anon";
GRANT ALL ON FUNCTION "public"."search_coaches_by_gym_location"("p_lng" double precision, "p_lat" double precision, "p_radius_meters" double precision) TO "authenticated";
GRANT ALL ON FUNCTION "public"."search_coaches_by_gym_location"("p_lng" double precision, "p_lat" double precision, "p_radius_meters" double precision) TO "service_role";



GRANT ALL ON FUNCTION "public"."search_coaches_by_service_area"("p_lng" double precision, "p_lat" double precision) TO "anon";
GRANT ALL ON FUNCTION "public"."search_coaches_by_service_area"("p_lng" double precision, "p_lat" double precision) TO "authenticated";
GRANT ALL ON FUNCTION "public"."search_coaches_by_service_area"("p_lng" double precision, "p_lat" double precision) TO "service_role";



GRANT ALL ON FUNCTION "public"."search_workouts"("p_user_id" "uuid", "p_query" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."search_workouts"("p_user_id" "uuid", "p_query" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."search_workouts"("p_user_id" "uuid", "p_query" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."set_exercise_record_audit_fields"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_exercise_record_audit_fields"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_exercise_record_audit_fields"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_timestamps"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_timestamps"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_timestamps"() TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_variation_scope_with_exercise"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_variation_scope_with_exercise"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_variation_scope_with_exercise"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_subscriptions_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_subscriptions_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_subscriptions_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."upsert_exercise_variation"("p_user_id" "uuid", "p_exercise_id" "uuid", "p_name" "text", "p_variation_id" "uuid", "p_variation_name" "text", "p_muscle_id" "uuid", "p_equipment_id" "uuid", "p_video_url" "text", "p_image_url" "text", "p_new_variation" boolean, "p_secondary_muscle_id" "uuid", "p_exercise_type" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."upsert_exercise_variation"("p_user_id" "uuid", "p_exercise_id" "uuid", "p_name" "text", "p_variation_id" "uuid", "p_variation_name" "text", "p_muscle_id" "uuid", "p_equipment_id" "uuid", "p_video_url" "text", "p_image_url" "text", "p_new_variation" boolean, "p_secondary_muscle_id" "uuid", "p_exercise_type" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."upsert_exercise_variation"("p_user_id" "uuid", "p_exercise_id" "uuid", "p_name" "text", "p_variation_id" "uuid", "p_variation_name" "text", "p_muscle_id" "uuid", "p_equipment_id" "uuid", "p_video_url" "text", "p_image_url" "text", "p_new_variation" boolean, "p_secondary_muscle_id" "uuid", "p_exercise_type" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."upsert_periodization"("payload" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."upsert_periodization"("payload" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."upsert_periodization"("payload" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."upsert_push_subscription"("p_user_id" "uuid", "p_endpoint" "text", "p_p256dh_key" "text", "p_auth_key" "text", "p_user_agent" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."upsert_push_subscription"("p_user_id" "uuid", "p_endpoint" "text", "p_p256dh_key" "text", "p_auth_key" "text", "p_user_agent" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."upsert_push_subscription"("p_user_id" "uuid", "p_endpoint" "text", "p_p256dh_key" "text", "p_auth_key" "text", "p_user_agent" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."upsert_workout"("payload" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."upsert_workout"("payload" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."upsert_workout"("payload" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."validate_coach_athlete_transition"() TO "anon";
GRANT ALL ON FUNCTION "public"."validate_coach_athlete_transition"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_coach_athlete_transition"() TO "service_role";



GRANT ALL ON FUNCTION "public"."validate_muscle_hierarchy"() TO "anon";
GRANT ALL ON FUNCTION "public"."validate_muscle_hierarchy"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_muscle_hierarchy"() TO "service_role";



GRANT ALL ON FUNCTION "public"."validate_variation_muscle_level"() TO "anon";
GRANT ALL ON FUNCTION "public"."validate_variation_muscle_level"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_variation_muscle_level"() TO "service_role";





























































































GRANT ALL ON TABLE "public"."cardio_programs" TO "anon";
GRANT ALL ON TABLE "public"."cardio_programs" TO "authenticated";
GRANT ALL ON TABLE "public"."cardio_programs" TO "service_role";



GRANT ALL ON TABLE "public"."coach_athletes" TO "anon";
GRANT ALL ON TABLE "public"."coach_athletes" TO "authenticated";
GRANT ALL ON TABLE "public"."coach_athletes" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."coach_athletes_with_profiles" TO "anon";
GRANT ALL ON TABLE "public"."coach_athletes_with_profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."coach_athletes_with_profiles" TO "service_role";



GRANT ALL ON TABLE "public"."coach_availability" TO "anon";
GRANT ALL ON TABLE "public"."coach_availability" TO "authenticated";
GRANT ALL ON TABLE "public"."coach_availability" TO "service_role";



GRANT ALL ON TABLE "public"."coach_availability_overrides" TO "anon";
GRANT ALL ON TABLE "public"."coach_availability_overrides" TO "authenticated";
GRANT ALL ON TABLE "public"."coach_availability_overrides" TO "service_role";



GRANT ALL ON TABLE "public"."coach_gym_schedules" TO "anon";
GRANT ALL ON TABLE "public"."coach_gym_schedules" TO "authenticated";
GRANT ALL ON TABLE "public"."coach_gym_schedules" TO "service_role";



GRANT ALL ON TABLE "public"."coach_gyms" TO "anon";
GRANT ALL ON TABLE "public"."coach_gyms" TO "authenticated";
GRANT ALL ON TABLE "public"."coach_gyms" TO "service_role";



GRANT ALL ON TABLE "public"."coach_recurring_schedule_exceptions" TO "anon";
GRANT ALL ON TABLE "public"."coach_recurring_schedule_exceptions" TO "authenticated";
GRANT ALL ON TABLE "public"."coach_recurring_schedule_exceptions" TO "service_role";



GRANT ALL ON TABLE "public"."coach_recurring_schedules" TO "anon";
GRANT ALL ON TABLE "public"."coach_recurring_schedules" TO "authenticated";
GRANT ALL ON TABLE "public"."coach_recurring_schedules" TO "service_role";



GRANT ALL ON TABLE "public"."coach_service_area_schedules" TO "anon";
GRANT ALL ON TABLE "public"."coach_service_area_schedules" TO "authenticated";
GRANT ALL ON TABLE "public"."coach_service_area_schedules" TO "service_role";



GRANT ALL ON TABLE "public"."coach_service_areas" TO "anon";
GRANT ALL ON TABLE "public"."coach_service_areas" TO "authenticated";
GRANT ALL ON TABLE "public"."coach_service_areas" TO "service_role";



GRANT ALL ON TABLE "public"."coach_service_types" TO "anon";
GRANT ALL ON TABLE "public"."coach_service_types" TO "authenticated";
GRANT ALL ON TABLE "public"."coach_service_types" TO "service_role";



GRANT ALL ON TABLE "public"."coach_session_disputes" TO "anon";
GRANT ALL ON TABLE "public"."coach_session_disputes" TO "authenticated";
GRANT ALL ON TABLE "public"."coach_session_disputes" TO "service_role";



GRANT ALL ON TABLE "public"."coach_sessions" TO "anon";
GRANT ALL ON TABLE "public"."coach_sessions" TO "authenticated";
GRANT ALL ON TABLE "public"."coach_sessions" TO "service_role";



GRANT ALL ON TABLE "public"."coach_testimonials" TO "anon";
GRANT ALL ON TABLE "public"."coach_testimonials" TO "authenticated";
GRANT ALL ON TABLE "public"."coach_testimonials" TO "service_role";



GRANT ALL ON TABLE "public"."equipments" TO "anon";
GRANT ALL ON TABLE "public"."equipments" TO "authenticated";
GRANT ALL ON TABLE "public"."equipments" TO "service_role";



GRANT ALL ON TABLE "public"."exercises" TO "anon";
GRANT ALL ON TABLE "public"."exercises" TO "authenticated";
GRANT ALL ON TABLE "public"."exercises" TO "service_role";



GRANT ALL ON TABLE "public"."feature_keys" TO "anon";
GRANT ALL ON TABLE "public"."feature_keys" TO "authenticated";
GRANT ALL ON TABLE "public"."feature_keys" TO "service_role";



GRANT ALL ON TABLE "public"."muscles" TO "anon";
GRANT ALL ON TABLE "public"."muscles" TO "authenticated";
GRANT ALL ON TABLE "public"."muscles" TO "service_role";



GRANT ALL ON TABLE "public"."notification_preferences" TO "anon";
GRANT ALL ON TABLE "public"."notification_preferences" TO "authenticated";
GRANT ALL ON TABLE "public"."notification_preferences" TO "service_role";



GRANT ALL ON TABLE "public"."notifications" TO "anon";
GRANT ALL ON TABLE "public"."notifications" TO "authenticated";
GRANT ALL ON TABLE "public"."notifications" TO "service_role";



GRANT ALL ON TABLE "public"."payment_sessions" TO "anon";
GRANT ALL ON TABLE "public"."payment_sessions" TO "authenticated";
GRANT ALL ON TABLE "public"."payment_sessions" TO "service_role";



GRANT ALL ON TABLE "public"."payments" TO "anon";
GRANT ALL ON TABLE "public"."payments" TO "authenticated";
GRANT ALL ON TABLE "public"."payments" TO "service_role";



GRANT ALL ON TABLE "public"."periodization_adjustments" TO "anon";
GRANT ALL ON TABLE "public"."periodization_adjustments" TO "authenticated";
GRANT ALL ON TABLE "public"."periodization_adjustments" TO "service_role";



GRANT ALL ON TABLE "public"."periodization_occurrences" TO "anon";
GRANT ALL ON TABLE "public"."periodization_occurrences" TO "authenticated";
GRANT ALL ON TABLE "public"."periodization_occurrences" TO "service_role";



GRANT ALL ON TABLE "public"."periodization_template_activities" TO "anon";
GRANT ALL ON TABLE "public"."periodization_template_activities" TO "authenticated";
GRANT ALL ON TABLE "public"."periodization_template_activities" TO "service_role";



GRANT ALL ON TABLE "public"."periodization_template_days" TO "anon";
GRANT ALL ON TABLE "public"."periodization_template_days" TO "authenticated";
GRANT ALL ON TABLE "public"."periodization_template_days" TO "service_role";



GRANT ALL ON TABLE "public"."periodizations" TO "anon";
GRANT ALL ON TABLE "public"."periodizations" TO "authenticated";
GRANT ALL ON TABLE "public"."periodizations" TO "service_role";



GRANT ALL ON TABLE "public"."plan_feature_limits" TO "anon";
GRANT ALL ON TABLE "public"."plan_feature_limits" TO "authenticated";
GRANT ALL ON TABLE "public"."plan_feature_limits" TO "service_role";



GRANT ALL ON TABLE "public"."push_subscriptions" TO "anon";
GRANT ALL ON TABLE "public"."push_subscriptions" TO "authenticated";
GRANT ALL ON TABLE "public"."push_subscriptions" TO "service_role";



GRANT ALL ON TABLE "public"."report_favorites" TO "anon";
GRANT ALL ON TABLE "public"."report_favorites" TO "authenticated";
GRANT ALL ON TABLE "public"."report_favorites" TO "service_role";



GRANT ALL ON TABLE "public"."shared_variations" TO "anon";
GRANT ALL ON TABLE "public"."shared_variations" TO "authenticated";
GRANT ALL ON TABLE "public"."shared_variations" TO "service_role";



GRANT ALL ON TABLE "public"."stripe_events" TO "anon";
GRANT ALL ON TABLE "public"."stripe_events" TO "authenticated";
GRANT ALL ON TABLE "public"."stripe_events" TO "service_role";



GRANT ALL ON TABLE "public"."stripe_price_map" TO "anon";
GRANT ALL ON TABLE "public"."stripe_price_map" TO "authenticated";
GRANT ALL ON TABLE "public"."stripe_price_map" TO "service_role";



GRANT ALL ON TABLE "public"."subscription_feature_overrides" TO "anon";
GRANT ALL ON TABLE "public"."subscription_feature_overrides" TO "authenticated";
GRANT ALL ON TABLE "public"."subscription_feature_overrides" TO "service_role";



GRANT ALL ON TABLE "public"."subscription_plans" TO "anon";
GRANT ALL ON TABLE "public"."subscription_plans" TO "authenticated";
GRANT ALL ON TABLE "public"."subscription_plans" TO "service_role";



GRANT ALL ON TABLE "public"."subscriptions" TO "anon";
GRANT ALL ON TABLE "public"."subscriptions" TO "authenticated";
GRANT ALL ON TABLE "public"."subscriptions" TO "service_role";



GRANT ALL ON TABLE "public"."variation_videos" TO "anon";
GRANT ALL ON TABLE "public"."variation_videos" TO "authenticated";
GRANT ALL ON TABLE "public"."variation_videos" TO "service_role";



GRANT ALL ON TABLE "public"."variations" TO "anon";
GRANT ALL ON TABLE "public"."variations" TO "authenticated";
GRANT ALL ON TABLE "public"."variations" TO "service_role";



GRANT ALL ON TABLE "public"."variations_view" TO "anon";
GRANT ALL ON TABLE "public"."variations_view" TO "authenticated";
GRANT ALL ON TABLE "public"."variations_view" TO "service_role";



GRANT ALL ON TABLE "public"."workout_exercise_logs" TO "anon";
GRANT ALL ON TABLE "public"."workout_exercise_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."workout_exercise_logs" TO "service_role";



GRANT ALL ON TABLE "public"."workout_exercise_set_logs" TO "anon";
GRANT ALL ON TABLE "public"."workout_exercise_set_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."workout_exercise_set_logs" TO "service_role";



GRANT ALL ON TABLE "public"."workout_exercises" TO "anon";
GRANT ALL ON TABLE "public"."workout_exercises" TO "authenticated";
GRANT ALL ON TABLE "public"."workout_exercises" TO "service_role";



GRANT ALL ON TABLE "public"."workout_folders" TO "anon";
GRANT ALL ON TABLE "public"."workout_folders" TO "authenticated";
GRANT ALL ON TABLE "public"."workout_folders" TO "service_role";



GRANT ALL ON TABLE "public"."workout_log_summaries" TO "anon";
GRANT ALL ON TABLE "public"."workout_log_summaries" TO "authenticated";
GRANT ALL ON TABLE "public"."workout_log_summaries" TO "service_role";



GRANT ALL ON TABLE "public"."workout_logs" TO "anon";
GRANT ALL ON TABLE "public"."workout_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."workout_logs" TO "service_role";



GRANT ALL ON TABLE "public"."workout_preparatory_exercise_logs" TO "anon";
GRANT ALL ON TABLE "public"."workout_preparatory_exercise_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."workout_preparatory_exercise_logs" TO "service_role";



GRANT ALL ON TABLE "public"."workout_preparatory_exercises" TO "anon";
GRANT ALL ON TABLE "public"."workout_preparatory_exercises" TO "authenticated";
GRANT ALL ON TABLE "public"."workout_preparatory_exercises" TO "service_role";



GRANT ALL ON TABLE "public"."workout_preparatory_set_logs" TO "anon";
GRANT ALL ON TABLE "public"."workout_preparatory_set_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."workout_preparatory_set_logs" TO "service_role";



GRANT ALL ON TABLE "public"."workout_preparatory_sets" TO "anon";
GRANT ALL ON TABLE "public"."workout_preparatory_sets" TO "authenticated";
GRANT ALL ON TABLE "public"."workout_preparatory_sets" TO "service_role";



GRANT ALL ON TABLE "public"."workout_sets" TO "anon";
GRANT ALL ON TABLE "public"."workout_sets" TO "authenticated";
GRANT ALL ON TABLE "public"."workout_sets" TO "service_role";



GRANT ALL ON TABLE "public"."workout_variation_records" TO "anon";
GRANT ALL ON TABLE "public"."workout_variation_records" TO "authenticated";
GRANT ALL ON TABLE "public"."workout_variation_records" TO "service_role";



GRANT ALL ON TABLE "public"."workouts" TO "anon";
GRANT ALL ON TABLE "public"."workouts" TO "authenticated";
GRANT ALL ON TABLE "public"."workouts" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";






























