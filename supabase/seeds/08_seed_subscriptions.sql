-- ================================================
-- SEED: Subscriptions
--
-- Atribui planos corretos aos usuários de teste:
-- • coach1, coach2 → plano 'coach' (source: self)
-- • athlete1..4 → plano 'athlete' (source: coach_grant, vinculados ao coach1)
-- • athlete5..8 → plano 'athlete' (source: coach_grant, vinculados ao coach2)
--
-- Nota: Os planos e feature limits já foram criados no seed 00.
-- O trigger on_profile_created_subscription já criou subscriptions 'free'
-- para todos os usuários. Este seed atualiza para os planos corretos.
-- ================================================

DO $$
DECLARE
  coach1_id   uuid := '39e03cce-5ca5-46c2-b34d-92682a582f05';
  coach2_id   uuid := '32e6797e-7aba-49a7-977c-2a575060217b';
  athlete1_id uuid := 'af890a2d-f0fd-415e-b69d-2a52d061b8bc';
  athlete2_id uuid := '23d85092-0160-464d-8b31-577bcf6b563d';
  athlete3_id uuid := '9cd153b7-00e7-4f20-98f4-821b78d8d445';
  athlete4_id uuid := 'ab4519dd-7e7a-47d9-aa01-08889590ca24';
  athlete5_id uuid := 'a645596a-79d6-42f1-b221-ce9be642adfe';
  athlete6_id uuid := '2479427f-c95f-48c4-b22a-e5601c339e0e';
  athlete7_id uuid := '9010f10e-4357-487f-8e60-51eb66e5684b';
  athlete8_id uuid := 'ac352e38-b596-4367-bc00-5a60194e942d';
BEGIN
  -- Coaches → plano coach
  UPDATE public.subscriptions SET
    plan_id = 'coach_10',
    source = 'self',
    granted_by = NULL,
    started_at = now()
  WHERE user_id IN (coach1_id, coach2_id);

  -- Atletas do coach1 → plano athlete via coach_grant
  UPDATE public.subscriptions SET
    plan_id = 'athlete',
    source = 'coach_grant',
    granted_by = coach1_id,
    started_at = now()
  WHERE user_id IN (athlete1_id, athlete2_id, athlete3_id, athlete4_id);

  -- Atletas do coach2 → plano athlete via coach_grant
  UPDATE public.subscriptions SET
    plan_id = 'athlete',
    source = 'coach_grant',
    granted_by = coach2_id,
    started_at = now()
  WHERE user_id IN (athlete5_id, athlete6_id, athlete7_id, athlete8_id);
END $$;
