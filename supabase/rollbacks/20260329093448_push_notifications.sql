-- Rollback: push_notifications migration

DROP TRIGGER IF EXISTS on_notification_insert_send_push ON public.notifications;

DROP FUNCTION IF EXISTS public.upsert_push_subscription;

DROP TRIGGER IF EXISTS push_notification_preferences_set_timestamps ON public.push_notification_preferences;

DROP POLICY IF EXISTS "users_manage_own_push_preferences" ON public.push_notification_preferences;
DROP TABLE IF EXISTS public.push_notification_preferences;

DROP POLICY IF EXISTS "users_manage_own_push_subscriptions" ON public.push_subscriptions;
ALTER TABLE public.push_subscriptions DROP CONSTRAINT IF EXISTS push_subscriptions_endpoint_unique;
DROP INDEX IF EXISTS idx_push_subscriptions_user_id;
DROP TABLE IF EXISTS public.push_subscriptions;
