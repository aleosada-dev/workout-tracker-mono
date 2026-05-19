-- ================================================
-- SEED: Feature Keys + Subscription Plans + Feature Limits
--
-- DEVE rodar ANTES do seed 01 (usuarios), porque o trigger
-- on_profile_created_subscription insere plan_id = 'free'
-- e precisa que o plano 'free' ja exista.
-- ================================================

INSERT INTO public.feature_keys (key, description) VALUES
  ('max_workouts', 'Limite de treinos ativos'),
  ('manage_athletes', 'Limite de atletas gerenciados'),
  ('report_history_days', 'Dias de histórico nos relatórios'),
  ('coach_profile', 'Publicação de perfil publico de coach')
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.subscription_plans (code, name, description) VALUES
  ('free', 'Gratuito', 'Plano gratuito com funcionalidades básicas'),
  ('athlete', 'Atleta', 'Acesso completo para atletas independentes'),
  ('coach_10', 'Coach 10', 'Para coaches com ate 10 atletas'),
  ('coach_25', 'Coach 25', 'Para coaches com ate 25 atletas'),
  ('coach_50', 'Coach 50', 'Para coaches com ate 50 atletas'),
  ('coach_100', 'Coach 100', 'Para coaches com ate 100 atletas');

INSERT INTO public.plan_feature_limits (plan_id, feature_key, enabled, limit_value) VALUES
  ('free', 'max_workouts', true, 4),
  ('free', 'report_history_days', true, 30),
  ('free', 'manage_athletes', false, NULL),
  ('free', 'coach_profile', false, NULL),
  ('athlete', 'max_workouts', true, NULL),
  ('athlete', 'report_history_days', true, NULL),
  ('athlete', 'manage_athletes', false, NULL),
  ('athlete', 'coach_profile', false, NULL),
  ('coach_10', 'max_workouts', true, NULL),
  ('coach_10', 'report_history_days', true, NULL),
  ('coach_10', 'manage_athletes', true, 10),
  ('coach_10', 'coach_profile', true, NULL),
  ('coach_25', 'max_workouts', true, NULL),
  ('coach_25', 'report_history_days', true, NULL),
  ('coach_25', 'manage_athletes', true, 25),
  ('coach_25', 'coach_profile', true, NULL),
  ('coach_50', 'max_workouts', true, NULL),
  ('coach_50', 'report_history_days', true, NULL),
  ('coach_50', 'manage_athletes', true, 50),
  ('coach_50', 'coach_profile', true, NULL),
  ('coach_100', 'max_workouts', true, NULL),
  ('coach_100', 'report_history_days', true, NULL),
  ('coach_100', 'manage_athletes', true, 100),
  ('coach_100', 'coach_profile', true, NULL);
