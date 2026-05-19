-- ================================================
-- SCRIPT DE MIGRAÇÃO DE PRODUÇÃO: Subscriptions
--
-- Este script deve ser executado UMA VEZ após aplicar a migração
-- 20260327172623_subscription_plans.sql em produção.
--
-- O que faz:
-- 1. Insere os planos e feature limits (seed data)
-- 2. Cria subscriptions 'free' para todos os usuários existentes
-- 3. Coaches (profiles.role = 'coach') → plano 'coach', source 'self'
-- 4. Atletas com vínculo ativo a um coach → plano 'athlete', source 'coach_grant'
-- 5. Demais usuários permanecem no plano 'free'
--
-- Pré-requisitos:
-- - Migração subscription_plans já aplicada (tabelas criadas)
--
-- IMPORTANTE: Executar dentro de uma transação.
-- Revisar o resultado do SELECT de verificação antes de fazer COMMIT.
-- ================================================

BEGIN;

-- ------------------------------------------------
-- Passo 1: Seed plan data
-- ------------------------------------------------
INSERT INTO public.subscription_plans (code, name, description) VALUES
  ('free', 'Gratuito', 'Plano gratuito com funcionalidades básicas'),
  ('athlete', 'Atleta', 'Acesso completo para atletas independentes'),
  ('coach', 'Coach', 'Para profissionais que gerenciam atletas');

INSERT INTO public.plan_feature_limits (plan_id, feature_key, enabled, limit_value) VALUES
  ('free', 'max_workouts', true, 4),
  ('free', 'report_history_days', true, 30),
  ('free', 'manage_athletes', false, NULL),
  ('free', 'coach_profile', false, NULL),
  ('athlete', 'max_workouts', true, NULL),
  ('athlete', 'report_history_days', true, NULL),
  ('athlete', 'manage_athletes', false, NULL),
  ('athlete', 'coach_profile', false, NULL),
  ('coach', 'max_workouts', true, NULL),
  ('coach', 'report_history_days', true, NULL),
  ('coach', 'manage_athletes', true, 10),
  ('coach', 'coach_profile', true, NULL);

-- ------------------------------------------------
-- Passo 2: Create subscriptions 'free' para todos os usuários existentes
-- ------------------------------------------------
INSERT INTO public.subscriptions (user_id, plan_id, source)
SELECT p.id, 'free', 'self'
FROM public.profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM public.subscriptions s WHERE s.user_id = p.id
);

-- ------------------------------------------------
-- Passo 3: Coaches → plano 'coach'
-- ------------------------------------------------
UPDATE public.subscriptions s SET
  plan_id = 'coach',
  source = 'self',
  granted_by = NULL,
  started_at = now(),
  updated_at = now()
FROM public.profiles p
WHERE s.user_id = p.id
  AND p.role = 'coach'
  AND s.plan_id = 'free';

-- ------------------------------------------------
-- Passo 4: Atletas com vínculo ativo → plano 'athlete' (coach_grant)
-- ------------------------------------------------
UPDATE public.subscriptions s SET
  plan_id = 'athlete',
  source = 'coach_grant',
  granted_by = ca.coach_id,
  started_at = now(),
  updated_at = now()
FROM public.coach_athletes ca
WHERE s.user_id = ca.athlete_id
  AND ca.status = 'active'
  AND s.plan_id = 'free'
  AND s.source = 'self';

-- ------------------------------------------------
-- Verificação: resumo dos planos após migração
-- ------------------------------------------------
SELECT
  s.plan_id,
  s.source,
  COUNT(*) AS total_users
FROM public.subscriptions s
GROUP BY s.plan_id, s.source
ORDER BY s.plan_id, s.source;

-- ------------------------------------------------
-- Se o resultado estiver correto, execute:
-- COMMIT;
--
-- Caso contrário:
-- ROLLBACK;
-- ------------------------------------------------
