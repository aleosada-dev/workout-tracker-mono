-- ============================================================================
-- User preferences: key-value store, one row per (user, preference).
-- A missing key means "not set" and the application falls back to its default.
-- Mirrors notification_preferences (RLS user_id = auth.uid(), set_timestamps).
-- ============================================================================

CREATE TABLE IF NOT EXISTS "public"."user_preferences" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "key" "text" NOT NULL,
    "value" "jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);

ALTER TABLE "public"."user_preferences" OWNER TO "postgres";

ALTER TABLE ONLY "public"."user_preferences"
    ADD CONSTRAINT "user_preferences_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."user_preferences"
    ADD CONSTRAINT "user_preferences_user_id_key_key" UNIQUE ("user_id", "key");

ALTER TABLE ONLY "public"."user_preferences"
    ADD CONSTRAINT "user_preferences_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;

CREATE OR REPLACE TRIGGER "user_preferences_set_timestamps"
    BEFORE INSERT OR UPDATE ON "public"."user_preferences"
    FOR EACH ROW
    EXECUTE FUNCTION "public"."set_timestamps"();

ALTER TABLE "public"."user_preferences" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_manage_own_preferences"
    ON "public"."user_preferences"
    TO "authenticated"
    USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")))
    WITH CHECK (("user_id" = ( SELECT "auth"."uid"() AS "uid")));

GRANT ALL ON TABLE "public"."user_preferences" TO "anon";
GRANT ALL ON TABLE "public"."user_preferences" TO "authenticated";
GRANT ALL ON TABLE "public"."user_preferences" TO "service_role";

-- ----------------------------------------------------------------------------
-- wt_set_user_preferences: persist a batch of preferences atomically.
-- p_prefs is a JSON object of { key: value }. A JSON null value resets the
-- preference (deletes the row), so the application falls back to its default.
-- Stays thin: it only persists. Key/value validation lives in the API layer
-- (zod), so adding a new preference never requires a DB migration.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION "public"."wt_set_user_preferences"("p_prefs" "jsonb")
    RETURNS SETOF "public"."user_preferences"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_uid uuid := auth.uid();
    v_key text;
    v_val jsonb;
BEGIN
    IF v_uid IS NULL THEN
        RAISE EXCEPTION 'wt_set_user_preferences called without an authenticated user'
            USING ERRCODE = '28000';
    END IF;

    FOR v_key, v_val IN SELECT key, value FROM jsonb_each(p_prefs) LOOP
        IF v_val = 'null'::jsonb THEN
            DELETE FROM public.user_preferences
            WHERE user_id = v_uid AND key = v_key;
        ELSE
            INSERT INTO public.user_preferences (user_id, key, value)
            VALUES (v_uid, v_key, v_val)
            ON CONFLICT (user_id, key) DO UPDATE SET value = EXCLUDED.value;
        END IF;
    END LOOP;

    RETURN QUERY
        SELECT * FROM public.user_preferences WHERE user_id = v_uid;
END;
$$;

ALTER FUNCTION "public"."wt_set_user_preferences"("p_prefs" "jsonb") OWNER TO "postgres";
