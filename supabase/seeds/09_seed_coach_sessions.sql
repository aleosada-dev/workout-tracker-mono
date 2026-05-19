-- ================================================
-- SEED: Coach Sessions — Disponibilidade, Aulas e Disputas
--
-- Estrutura:
-- • coach_availability: 10 faixas horárias (coach1: seg-sex, coach2: seg-qua-sex)
-- • coach_availability_overrides: 3 exceções
-- • coach_sessions: 12 sessions em diversos status e fontes
-- • coach_recurring_schedules: 4 agendamentos recorrentes
-- • coach_session_disputes: 2 disputas (1 resolvida, 1 aberta)
-- • workout_logs: 2 logs vinculados a sessions (is_coached = true)
--
-- Usuários (de 01_seed_test_users.sql):
--   coach1 = Carlos Mendes     coach2 = Ana Rodrigues
--   athlete1 = Lucas Silva     athlete2 = Fernanda Costa
--   athlete3 = Rafael Oliveira athlete4 = Juliana Pereira
--   athlete5 = Marcos Santos   athlete6 = Beatriz Lima
-- ================================================

SET session_replication_role = 'replica';

DO $$
DECLARE
  -- User IDs
  coach1_id   uuid := '39e03cce-5ca5-46c2-b34d-92682a582f05';
  coach2_id   uuid := '32e6797e-7aba-49a7-977c-2a575060217b';
  athlete1_id uuid := 'af890a2d-f0fd-415e-b69d-2a52d061b8bc';
  athlete2_id uuid := '23d85092-0160-464d-8b31-577bcf6b563d';
  athlete3_id uuid := '9cd153b7-00e7-4f20-98f4-821b78d8d445';
  athlete4_id uuid := 'ab4519dd-7e7a-47d9-aa01-08889590ca24';
  athlete5_id uuid := 'a645596a-79d6-42f1-b221-ce9be642adfe';
  athlete6_id uuid := '2479427f-c95f-48c4-b22a-e5601c339e0e';

  -- Workout log IDs existentes (de 07_seed_workout_logs.sql)
  -- Rafael Full Body sessão 1 (started_by = coach1)
  wl_rafael_coached uuid := '45ca393e-5945-4f83-8766-19f7653a8249';
  -- Lucas Treino A sessão 2
  wl_lucas_recent   uuid := 'def8c3f1-9b12-41fc-90ae-93a3e6ca7d6a';

  -- Session IDs
  sess_01 uuid := 'a1000001-0000-4000-8000-000000000001';
  sess_02 uuid := 'a1000001-0000-4000-8000-000000000002';
  sess_03 uuid := 'a1000001-0000-4000-8000-000000000003';
  sess_04 uuid := 'a1000001-0000-4000-8000-000000000004';
  sess_05 uuid := 'a1000001-0000-4000-8000-000000000005';
  sess_06 uuid := 'a1000001-0000-4000-8000-000000000006';
  sess_07 uuid := 'a1000001-0000-4000-8000-000000000007';
  sess_08 uuid := 'a1000001-0000-4000-8000-000000000008';
  sess_09 uuid := 'a1000001-0000-4000-8000-000000000009';
  sess_10 uuid := 'a1000001-0000-4000-8000-000000000010';
  sess_11 uuid := 'a1000001-0000-4000-8000-000000000011';
  sess_12 uuid := 'a1000001-0000-4000-8000-000000000012';

BEGIN

  -- ================================================
  -- coach_availability — Horários recorrentes
  --
  -- Coach 1 (Carlos): seg-sex, manhã (06:00–12:00) + tarde (14:00–20:00)
  -- Coach 2 (Ana): seg/qua/sex, manhã (07:00–12:00) + tarde (15:00–19:00)
  -- ================================================
  INSERT INTO public.coach_availability
    (coach_id, day_of_week, start_time, end_time)
  VALUES
    -- Coach 1 — Segunda a Sexta
    (coach1_id, 1, '06:00', '12:00'),
    (coach1_id, 1, '14:00', '20:00'),
    (coach1_id, 2, '06:00', '12:00'),
    (coach1_id, 2, '14:00', '20:00'),
    (coach1_id, 3, '06:00', '12:00'),
    (coach1_id, 3, '14:00', '20:00'),
    (coach1_id, 4, '06:00', '12:00'),
    (coach1_id, 4, '14:00', '20:00'),
    (coach1_id, 5, '06:00', '12:00'),
    (coach1_id, 5, '14:00', '20:00'),
    -- Coach 2 — Segunda, Quarta, Sexta
    (coach2_id, 1, '07:00', '12:00'),
    (coach2_id, 1, '15:00', '19:00'),
    (coach2_id, 3, '07:00', '12:00'),
    (coach2_id, 3, '15:00', '19:00'),
    (coach2_id, 5, '07:00', '12:00'),
    (coach2_id, 5, '15:00', '19:00');

  -- ================================================
  -- coach_sessions — 12 sessions cobrindo todos os cenários
  -- ================================================
  INSERT INTO public.coach_sessions
    (id, coach_id, athlete_id, scheduled_at, duration_minutes, status, source,
     workout_log_id, requested_by, approved_at, approved_by,
     canceled_at, canceled_by, cancellation_counts, notes)
  VALUES
    -- 1. Completed (via treino) — Rafael, 11 dias atrás, vinculado ao workout_log do coach
    (sess_01, coach1_id, athlete3_id,
     now() - interval '11 days' + interval '8 hours', 60,
     'completed', 'workout', wl_rafael_coached,
     coach1_id, now() - interval '11 days', coach1_id,
     NULL, NULL, false, 'Aula presencial - Full Body'),

    -- 2. Completed (agendada) — Lucas, 7 dias atrás, vinculado ao workout_log
    (sess_02, coach1_id, athlete1_id,
     now() - interval '7 days' + interval '9 hours', 60,
     'completed', 'scheduled', wl_lucas_recent,
     coach1_id, now() - interval '8 days', coach1_id,
     NULL, NULL, false, NULL),

    -- 3. Completed (manual) — Fernanda, 6 dias atrás
    (sess_03, coach1_id, athlete2_id,
     now() - interval '6 days' + interval '10 hours', 60,
     'completed', 'manual', NULL,
     athlete2_id, now() - interval '5 days', coach1_id,
     NULL, NULL, false, 'Treino de reforço postural'),

    -- 4. Scheduled — Lucas, amanhã 08:00
    (sess_04, coach1_id, athlete1_id,
     (CURRENT_DATE + 1 + time '08:00')::timestamptz, 60,
     'scheduled', 'scheduled', NULL,
     coach1_id, now(), coach1_id,
     NULL, NULL, false, NULL),

    -- 5. Scheduled — Fernanda, amanhã 10:00
    (sess_05, coach1_id, athlete2_id,
     (CURRENT_DATE + 1 + time '10:00')::timestamptz, 60,
     'scheduled', 'scheduled', NULL,
     coach1_id, now(), coach1_id,
     NULL, NULL, false, NULL),

    -- 6. Scheduled — Rafael, depois de amanhã 14:00
    (sess_06, coach1_id, athlete3_id,
     (CURRENT_DATE + 2 + time '14:00')::timestamptz, 60,
     'scheduled', 'scheduled', NULL,
     coach1_id, now(), coach1_id,
     NULL, NULL, false, 'Revisão de técnica de agachamento'),

    -- 7. Pending approval — Juliana solicitou, daqui a 4 dias 16:00
    (sess_07, coach1_id, athlete4_id,
     (CURRENT_DATE + 4 + time '16:00')::timestamptz, 60,
     'pending_approval', 'scheduled', NULL,
     athlete4_id, NULL, NULL,
     NULL, NULL, false, 'Gostaria de iniciar os treinos'),

    -- 8. Pending approval — registro manual do coach (Marcos), 2 dias atrás
    (sess_08, coach2_id, athlete5_id,
     now() - interval '2 days' + interval '15 hours', 60,
     'pending_approval', 'manual', NULL,
     coach2_id, NULL, NULL,
     NULL, NULL, false, 'Aula avulsa não agendada previamente'),

    -- 9. Canceled (com antecedência) — Lucas, 3 dias atrás
    (sess_09, coach1_id, athlete1_id,
     now() - interval '3 days' + interval '8 hours', 60,
     'canceled', 'scheduled', NULL,
     athlete1_id, now() - interval '5 days', coach1_id,
     now() - interval '4 days', athlete1_id, false, NULL),

    -- 10. Canceled (tardio, conta como aula) — Beatriz, ontem
    (sess_10, coach2_id, athlete6_id,
     now() - interval '1 day' + interval '9 hours', 60,
     'canceled', 'scheduled', NULL,
     coach2_id, now() - interval '3 days', coach2_id,
     now() - interval '1 day' + interval '7 hours', athlete6_id, true,
     'Cancelamento dentro do prazo mínimo'),

    -- 11. Scheduled — Marcos (coach2), daqui a 6 dias 07:00
    (sess_11, coach2_id, athlete5_id,
     (CURRENT_DATE + 6 + time '07:00')::timestamptz, 60,
     'scheduled', 'scheduled', NULL,
     coach2_id, now(), coach2_id,
     NULL, NULL, false, NULL),

    -- 12. Completed (disputada e resolvida) — Beatriz, 4 dias atrás
    (sess_12, coach2_id, athlete6_id,
     now() - interval '4 days' + interval '16 hours', 60,
     'completed', 'manual', NULL,
     coach2_id, now() - interval '3 days', coach2_id,
     NULL, NULL, false, 'Treino em parque — registro manual');

  -- ================================================
  -- Registrar pagamentos (entidade separada)
  -- ================================================
  -- Pagamento 1: PIX cobrindo sess_01 (Rafael) e sess_02 (Lucas)
  INSERT INTO public.payments (id, coach_id, amount, paid_at, payment_method, notes)
  VALUES ('b2000001-0000-4000-8000-000000000001', coach1_id, 240.00, now() - interval '3 days', 'PIX', 'Pagamento de 2 aulas');

  INSERT INTO public.payment_sessions (payment_id, session_id)
  VALUES
    ('b2000001-0000-4000-8000-000000000001', sess_01),
    ('b2000001-0000-4000-8000-000000000001', sess_02);

  -- Pagamento 2: Dinheiro cobrindo sess_12 (Beatriz, coach2)
  INSERT INTO public.payments (id, coach_id, amount, paid_at, payment_method)
  VALUES ('b2000001-0000-4000-8000-000000000002', coach2_id, 120.00, now() - interval '2 days', 'Dinheiro');

  INSERT INTO public.payment_sessions (payment_id, session_id)
  VALUES ('b2000001-0000-4000-8000-000000000002', sess_12);

  -- sess_03 (completed) e sess_10 (canceled com cobrança) ficam sem pagamento

  -- ================================================
  -- Vincular workout_logs existentes às sessions (is_coached)
  -- ================================================
  UPDATE public.workout_logs
  SET coach_session_id = sess_01, is_coached = true
  WHERE id = wl_rafael_coached;

  UPDATE public.workout_logs
  SET coach_session_id = sess_02, is_coached = true
  WHERE id = wl_lucas_recent;

  -- ================================================
  -- coach_recurring_schedules — Agendamentos fixos
  -- ================================================
  INSERT INTO public.coach_recurring_schedules
    (coach_id, athlete_id, days_of_week, start_time, duration_minutes,
     effective_from, effective_until, is_active, interval_weeks, end_type, cron_expression)
  VALUES
    -- Lucas: seg e qua às 08:00 com Coach 1
    (coach1_id, athlete1_id, ARRAY[1, 3], '09:00', 60, CURRENT_DATE - 14, NULL, true, 1, 'never', '0 8 * * 1,3'),
    -- Fernanda: ter e qui às 10:00 com Coach 1
    (coach1_id, athlete2_id, ARRAY[2, 4], '11:00', 60, CURRENT_DATE - 14, NULL, true, 1, 'never', '0 10 * * 2,4'),
    -- Marcos: seg e sex às 07:00 com Coach 2
    (coach2_id, athlete5_id, ARRAY[1, 5], '09:00', 60, CURRENT_DATE - 7, NULL, true, 1, 'never', '0 7 * * 1,5');

  -- ================================================
  -- coach_session_disputes — Contestações
  -- ================================================
  INSERT INTO public.coach_session_disputes
    (session_id, author_id, message, resolution)
  VALUES
    -- Disputa resolvida (sess_12 — Beatriz): coach registrou, atleta contestou, coach respondeu com resolução
    (sess_12, athlete6_id,
     'Não lembro dessa aula no parque. Tem certeza que foi comigo?', NULL),
    (sess_12, coach2_id,
     'Sim, foi no Parque Ibirapuera, fizemos treino funcional. Tenho fotos.', NULL),
    (sess_12, athlete6_id,
     'Ah verdade, lembrei! Desculpa a confusão.', 'approved'),

    -- Disputa aberta (sess_08 — Marcos): coach registrou manualmente, atleta contesta
    (sess_08, athlete5_id,
     'Coach, essa aula foi de apenas 30 minutos, não 60. Pode corrigir?', NULL);

END $$;

SET session_replication_role = 'origin';
