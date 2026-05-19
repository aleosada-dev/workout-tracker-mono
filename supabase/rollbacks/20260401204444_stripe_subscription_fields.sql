-- Rollback: Remove Stripe subscription fields

-- Restore original handle_new_subscription trigger
CREATE OR REPLACE FUNCTION public.handle_new_subscription()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_plan_id text;
BEGIN
  CASE NEW.role
    WHEN 'coach' THEN v_plan_id := 'coach';
    WHEN 'athlete' THEN v_plan_id := 'athlete';
    ELSE v_plan_id := 'free';
  END CASE;

  INSERT INTO public.subscriptions (user_id, plan_id, source)
  VALUES (NEW.id, v_plan_id, 'self');
  RETURN NEW;
END;
$$;

-- Drop coach athletes subscription policy
DROP POLICY IF EXISTS "Coaches can read their athletes subscriptions"
  ON public.subscriptions;

-- Restore generic coach plan
INSERT INTO public.subscription_plans (code, name, description) VALUES
  ('coach', 'Coach', 'Para profissionais que gerenciam atletas')
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.plan_feature_limits (plan_id, feature_key, enabled, limit_value) VALUES
  ('coach', 'max_workouts', true, NULL),
  ('coach', 'report_history_days', true, NULL),
  ('coach', 'manage_athletes', true, 10),
  ('coach', 'coach_profile', true, NULL)
ON CONFLICT (plan_id, feature_key) DO NOTHING;

-- Migrate granular coach plans back to generic
UPDATE public.subscriptions SET plan_id = 'coach'
  WHERE plan_id IN ('coach_10', 'coach_25', 'coach_50', 'coach_100');

-- Remove granular plans
DELETE FROM public.plan_feature_limits
  WHERE plan_id IN ('coach_10', 'coach_25', 'coach_50', 'coach_100');
DELETE FROM public.subscription_plans
  WHERE code IN ('coach_10', 'coach_25', 'coach_50', 'coach_100');

-- Drop FK constraints
ALTER TABLE public.plan_feature_limits
  DROP CONSTRAINT IF EXISTS plan_feature_limits_feature_key_fk;
ALTER TABLE public.subscription_feature_overrides
  DROP CONSTRAINT IF EXISTS subscription_feature_overrides_feature_key_fk;

-- Drop feature_keys table
DROP TABLE IF EXISTS public.feature_keys;

-- Drop stripe_price_map table
DROP TABLE IF EXISTS public.stripe_price_map;

-- Drop stripe_events table
DROP TABLE IF EXISTS public.stripe_events;

-- Remove stripe_customer_id from profiles
ALTER TABLE public.profiles
  DROP COLUMN IF EXISTS stripe_customer_id;

-- Remove Stripe fields from subscriptions
DROP INDEX IF EXISTS subscriptions_stripe_subscription_id_idx;

ALTER TABLE public.subscriptions
  ADD COLUMN stripe_customer_id text,
  DROP COLUMN IF EXISTS stripe_subscription_id,
  DROP COLUMN IF EXISTS stripe_price_id,
  DROP COLUMN IF EXISTS stripe_status,
  DROP COLUMN IF EXISTS trial_ends_at,
  DROP COLUMN IF EXISTS current_period_end;

CREATE INDEX subscriptions_stripe_customer_id_idx
  ON public.subscriptions (stripe_customer_id);
