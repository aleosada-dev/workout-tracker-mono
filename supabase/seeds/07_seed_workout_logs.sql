-- ================================================
-- SEED: Workout Logs, Exercise Logs, Set Logs e Summaries
--
-- Estrutura:
-- • 30+ workout_logs (6 sessões por treino × 5 atletas + 3 para athlete4)
-- • workout_exercise_logs (com supersets, skipped exercises, etc.)
-- • workout_exercise_set_logs (com reps_min/reps_max, fora da faixa, etc.)
-- • workout_log_summaries (gerados dinamicamente dos logs)
--
-- Dados de treinos (de 06_seed_coach_athletes_workouts.sql):
--   wk1: Lucas  — Treino A Peito/Tríceps
--   wk2: Lucas  — Treino B Costas/Bíceps
--   wk3: Fernanda — Treino A Inferiores
--   wk4: Rafael — Full Body Iniciante
--   wk5: Marcos — Treino A Empurrar
--   wk6: athlete4 — Treino A Peito/Tríceps (criado aqui)
-- ================================================

SET session_replication_role = 'replica';

DO $$
DECLARE
  -- User IDs (de 01_seed_test_users.sql)
  coach1_id   uuid := '39e03cce-5ca5-46c2-b34d-92682a582f05';
  athlete1_id uuid := 'af890a2d-f0fd-415e-b69d-2a52d061b8bc';
  athlete2_id uuid := '23d85092-0160-464d-8b31-577bcf6b563d';
  athlete3_id uuid := '9cd153b7-00e7-4f20-98f4-821b78d8d445';
  athlete4_id uuid := 'ab4519dd-7e7a-47d9-aa01-08889590ca24';
  athlete5_id uuid := 'a645596a-79d6-42f1-b221-ce9be642adfe';
  athlete6_id uuid := '2479427f-c95f-48c4-b22a-e5601c339e0e';
  athlete7_id uuid := '9010f10e-4357-487f-8e60-51eb66e5684b';

  -- Workout IDs (de 06_seed_coach_athletes_workouts.sql)
  wk1 uuid := '52f2bbe7-0c3f-4728-b7c9-34a2223cf0b8';
  wk2 uuid := 'd94823aa-e98d-4516-9088-eee775693846';
  wk3 uuid := 'fe83e1d8-6a4f-4809-a12c-dd3d4d986d29';
  wk4 uuid := '78eca90c-cc5b-46b5-93db-c6f7eed696ce';
  wk5 uuid := '42cbdc7d-b0fe-4fdd-9690-51489d05fbc0';
  wk6 uuid := 'c3a9f0b2-1d4e-4a7c-8f5b-6e2d3c4a5b6c'; -- athlete4 Treino A
  wk7 uuid := '7a9e42d1-5c8b-4f0e-a6c2-9d1b3e4f7a10';
  wk8 uuid := '8b1f53e2-6d9c-4a1f-b7d3-a2c4e5f6b821';
  wk9 uuid := '9c2a64f3-7e0d-4b2a-8ce4-b3d5f607c932';
  wk10 uuid := 'ad3b75a4-8f1e-4c3b-9df5-c4e6a718da43';
  wk11 uuid := 'be4c86b5-9a2f-4d4c-ae86-d5f7b829eb54';

  -- Variation IDs (lookup dinâmico por nome)
  var_supino_reto      uuid;
  var_supino_inclinado uuid;
  var_agachamento      uuid;
  var_puxada_barra     uuid;
  var_puxada_cabo      uuid;
  var_remada_cabo      uuid;
  var_desenvolvimento  uuid;
  var_elevacao_lat     uuid;
  var_rosca_direta     uuid;
  var_triceps_corda    uuid;
  var_leg_press        uuid;
  var_mesa_flexora     uuid;
  var_elevacao_pelv    uuid;

  -- IDs dinâmicos para novas sessões
  wl_id  uuid;
  el_id1 uuid;
  el_id2 uuid;
  el_id3 uuid;
  el_id4 uuid;
  el_id5 uuid;

BEGIN

  -- ------------------------------------------------
  -- Lookup de variações
  -- ------------------------------------------------
  SELECT id INTO var_supino_reto      FROM public.variations WHERE exercise_id = (SELECT id FROM public.exercises WHERE name = 'Supino'              LIMIT 1) LIMIT 1;
  SELECT id INTO var_supino_inclinado FROM public.variations WHERE exercise_id = (SELECT id FROM public.exercises WHERE name = 'Supino Inclinado'    LIMIT 1) LIMIT 1;
  SELECT id INTO var_agachamento      FROM public.variations WHERE exercise_id = (SELECT id FROM public.exercises WHERE name = 'Agachamento'          LIMIT 1) LIMIT 1;
  SELECT id INTO var_puxada_barra     FROM public.variations WHERE exercise_id = (SELECT id FROM public.exercises WHERE name = 'Barra Fixa'           LIMIT 1) LIMIT 1;
  SELECT id INTO var_puxada_cabo      FROM public.variations WHERE exercise_id = (SELECT id FROM public.exercises WHERE name = 'Puxada Frontal'       LIMIT 1) LIMIT 1;
  SELECT id INTO var_remada_cabo      FROM public.variations WHERE exercise_id = (SELECT id FROM public.exercises WHERE name = 'Remada Baixa'         LIMIT 1) LIMIT 1;
  SELECT id INTO var_desenvolvimento  FROM public.variations WHERE exercise_id = (SELECT id FROM public.exercises WHERE name = 'Desenvolvimento Militar' LIMIT 1) LIMIT 1;
  SELECT id INTO var_elevacao_lat     FROM public.variations WHERE exercise_id = (SELECT id FROM public.exercises WHERE name = 'Elevação Lateral'     LIMIT 1) LIMIT 1;
  SELECT id INTO var_rosca_direta     FROM public.variations WHERE exercise_id = (SELECT id FROM public.exercises WHERE name = 'Rosca Direta'         LIMIT 1) LIMIT 1;
  SELECT id INTO var_triceps_corda    FROM public.variations WHERE exercise_id = (SELECT id FROM public.exercises WHERE name = 'Tríceps Corda'        LIMIT 1) LIMIT 1;
  SELECT id INTO var_leg_press        FROM public.variations WHERE exercise_id = (SELECT id FROM public.exercises WHERE name = 'Leg Press 45'         LIMIT 1) LIMIT 1;
  SELECT id INTO var_mesa_flexora     FROM public.variations WHERE exercise_id = (SELECT id FROM public.exercises WHERE name = 'Mesa Flexora'         LIMIT 1) LIMIT 1;
  SELECT id INTO var_elevacao_pelv    FROM public.variations WHERE exercise_id = (SELECT id FROM public.exercises WHERE name = 'Elevação Pélvica'     LIMIT 1) LIMIT 1;

  -- ------------------------------------------------
  -- Criar workout para athlete4 (mesmo template de wk1)
  -- ------------------------------------------------
  INSERT INTO public.workouts
    (id, user_id, name, description, created_by, updated_by)
  VALUES
    (wk6, athlete4_id,
     'Treino A — Peito e Tríceps',
     'Foco em supino e extensores do cotovelo com biset finalizador',
     coach1_id, coach1_id)
  ON CONFLICT DO NOTHING;

  -- Criar workout_exercises para athlete4's workout (mesma estrutura de wk1)
  INSERT INTO public.workout_exercises
    (id, workout_id, variation_id, note, rest_seconds, position, superset_group_id, superset_order)
  VALUES
    ('d1a2b3c4-e5f6-4a7b-8c9d-0e1f2a3b4c5d'::uuid, wk6, var_supino_reto,      NULL, 90, 0,
     'd1a2b3c4-e5f6-4a7b-8c9d-0e1f2a3b4c5d'::uuid, 0),
    ('e2b3c4d5-f6a7-4b8c-9d0e-1f2a3b4c5d6e'::uuid, wk6, var_supino_inclinado, NULL, 60, 1,
     'e2b3c4d5-f6a7-4b8c-9d0e-1f2a3b4c5d6e'::uuid, 0),
    ('f3c4d5e6-a7b8-4c9d-ae1f-2a3b4c5d6e7f'::uuid, wk6, var_triceps_corda,    NULL, 60, 1,
     'e2b3c4d5-f6a7-4b8c-9d0e-1f2a3b4c5d6e'::uuid, 1)
  ON CONFLICT DO NOTHING;

  -- Criar workout_sets para athlete4's workout exercises
  INSERT INTO public.workout_sets
    (id, workout_exercise_id, set_order, set_type, reps_min, reps_max, linked_set_id, load_percent_of_previous)
  VALUES
    -- Supino Reto: warmup + 3 normal
    ('d1a20001-e5f6-4a7b-8c9d-0e1f2a3b4c5d'::uuid, 'd1a2b3c4-e5f6-4a7b-8c9d-0e1f2a3b4c5d'::uuid, 0, 'warmup', 12, 15, NULL, NULL),
    ('d1a20002-e5f6-4a7b-8c9d-0e1f2a3b4c5d'::uuid, 'd1a2b3c4-e5f6-4a7b-8c9d-0e1f2a3b4c5d'::uuid, 1, 'normal',  8, 12, NULL, NULL),
    ('d1a20003-e5f6-4a7b-8c9d-0e1f2a3b4c5d'::uuid, 'd1a2b3c4-e5f6-4a7b-8c9d-0e1f2a3b4c5d'::uuid, 2, 'normal',  8, 12, NULL, NULL),
    ('d1a20004-e5f6-4a7b-8c9d-0e1f2a3b4c5d'::uuid, 'd1a2b3c4-e5f6-4a7b-8c9d-0e1f2a3b4c5d'::uuid, 3, 'normal',  8, 12, NULL, NULL),
    -- Supino Inclinado: 3 normal
    ('e2b30001-f6a7-4b8c-9d0e-1f2a3b4c5d6e'::uuid, 'e2b3c4d5-f6a7-4b8c-9d0e-1f2a3b4c5d6e'::uuid, 0, 'normal', 10, 15, NULL, NULL),
    ('e2b30002-f6a7-4b8c-9d0e-1f2a3b4c5d6e'::uuid, 'e2b3c4d5-f6a7-4b8c-9d0e-1f2a3b4c5d6e'::uuid, 1, 'normal', 10, 15, NULL, NULL),
    ('e2b30003-f6a7-4b8c-9d0e-1f2a3b4c5d6e'::uuid, 'e2b3c4d5-f6a7-4b8c-9d0e-1f2a3b4c5d6e'::uuid, 2, 'normal', 10, 15, NULL, NULL),
    -- Tríceps Corda: 3 normal
    ('f3c40001-a7b8-4c9d-ae1f-2a3b4c5d6e7f'::uuid, 'f3c4d5e6-a7b8-4c9d-ae1f-2a3b4c5d6e7f'::uuid, 0, 'normal', 12, 15, NULL, NULL),
    ('f3c40002-a7b8-4c9d-ae1f-2a3b4c5d6e7f'::uuid, 'f3c4d5e6-a7b8-4c9d-ae1f-2a3b4c5d6e7f'::uuid, 1, 'normal', 12, 15, NULL, NULL),
    ('f3c40003-a7b8-4c9d-ae1f-2a3b4c5d6e7f'::uuid, 'f3c4d5e6-a7b8-4c9d-ae1f-2a3b4c5d6e7f'::uuid, 2, 'normal', 12, 15, NULL, NULL)
  ON CONFLICT DO NOTHING;

  -- ================================================
  -- workout_logs
  --
  -- Original 10 sessions (wl001-wl010)
  -- + 4 more Lucas Treino A (wl011-wl014)
  -- + 4 more Lucas Treino B (wl015-wl018)
  -- + 4 more Fernanda (wl019-wl022)
  -- + 4 more Rafael (wl023-wl026)
  -- + 4 more Marcos (wl027-wl030)
  -- + 3 athlete4 (wl031-wl033)
  -- ================================================
  INSERT INTO public.workout_logs
    (id, workout_id, user_id, started_by, started_at, finished_at)
  VALUES
    -- ── Lucas — Treino A (6 sessões) ──
    ('94a18a75-21df-47dc-8001-9927acd51d2b'::uuid, wk1, athlete1_id, athlete1_id,
     now() - interval '28 days',
     now() - interval '28 days' + interval '75 minutes'),
    ('def8c3f1-9b12-41fc-90ae-93a3e6ca7d6a'::uuid, wk1, athlete1_id, athlete1_id,
     now() - interval '24 days',
     now() - interval '24 days' + interval '70 minutes'),
    ('a1b2c3d4-1111-4aaa-b111-111111111101'::uuid, wk1, athlete1_id, athlete1_id,
     now() - interval '20 days',
     now() - interval '20 days' + interval '72 minutes'),
    ('a1b2c3d4-1111-4aaa-b111-111111111102'::uuid, wk1, athlete1_id, athlete1_id,
     now() - interval '16 days',
     now() - interval '16 days' + interval '68 minutes'),
    ('a1b2c3d4-1111-4aaa-b111-111111111103'::uuid, wk1, athlete1_id, athlete1_id,
     now() - interval '11 days',
     now() - interval '11 days' + interval '78 minutes'),
    ('a1b2c3d4-1111-4aaa-b111-111111111104'::uuid, wk1, athlete1_id, athlete1_id,
     now() - interval '4 days',
     now() - interval '4 days'  + interval '65 minutes'),

    -- ── Lucas — Treino B (6 sessões) ──
    ('8a5d0046-d981-4289-ac03-bcb8110a7f1a'::uuid, wk2, athlete1_id, athlete1_id,
     now() - interval '27 days',
     now() - interval '27 days' + interval '90 minutes'),
    ('5964b795-79bc-46a6-9549-7c11607ba937'::uuid, wk2, athlete1_id, athlete1_id,
     now() - interval '22 days',
     now() - interval '22 days' + interval '85 minutes'),
    ('a1b2c3d4-2222-4bbb-b222-222222222201'::uuid, wk2, athlete1_id, athlete1_id,
     now() - interval '18 days',
     now() - interval '18 days' + interval '88 minutes'),
    ('a1b2c3d4-2222-4bbb-b222-222222222202'::uuid, wk2, athlete1_id, athlete1_id,
     now() - interval '13 days',
     now() - interval '13 days' + interval '82 minutes'),
    ('a1b2c3d4-2222-4bbb-b222-222222222203'::uuid, wk2, athlete1_id, athlete1_id,
     now() - interval '9 days',
     now() - interval '9 days'  + interval '92 minutes'),
    ('a1b2c3d4-2222-4bbb-b222-222222222204'::uuid, wk2, athlete1_id, athlete1_id,
     now() - interval '3 days',
     now() - interval '3 days'  + interval '80 minutes'),

    -- ── Fernanda — Treino A Inferiores (6 sessões) ──
    ('e00cd2fe-9a8c-4418-9a7c-1ca6694ddb66'::uuid, wk3, athlete2_id, athlete2_id,
     now() - interval '29 days',
     now() - interval '29 days' + interval '80 minutes'),
    ('869e32ae-e449-4a92-92a1-878c2df396e3'::uuid, wk3, athlete2_id, athlete2_id,
     now() - interval '25 days',
     now() - interval '25 days' + interval '75 minutes'),
    ('a1b2c3d4-3333-4ccc-b333-333333333301'::uuid, wk3, athlete2_id, athlete2_id,
     now() - interval '21 days',
     now() - interval '21 days' + interval '82 minutes'),
    ('a1b2c3d4-3333-4ccc-b333-333333333302'::uuid, wk3, athlete2_id, athlete2_id,
     now() - interval '15 days',
     now() - interval '15 days' + interval '78 minutes'),
    ('a1b2c3d4-3333-4ccc-b333-333333333303'::uuid, wk3, athlete2_id, athlete2_id,
     now() - interval '10 days',
     now() - interval '10 days' + interval '85 minutes'),
    ('a1b2c3d4-3333-4ccc-b333-333333333304'::uuid, wk3, athlete2_id, athlete2_id,
     now() - interval '4 days',
     now() - interval '4 days'  + interval '70 minutes'),

    -- ── Rafael — Full Body (6 sessões, 1ª com coach) ──
    ('45ca393e-5945-4f83-8766-19f7653a8249'::uuid, wk4, athlete3_id, coach1_id,
     now() - interval '30 days',
     now() - interval '30 days' + interval '60 minutes'),
    ('25e4cfc1-456a-4c36-acb7-4a725884c83d'::uuid, wk4, athlete3_id, athlete3_id,
     now() - interval '26 days',
     now() - interval '26 days' + interval '65 minutes'),
    ('a1b2c3d4-4444-4ddd-b444-444444444401'::uuid, wk4, athlete3_id, athlete3_id,
     now() - interval '22 days',
     now() - interval '22 days' + interval '55 minutes'),
    ('a1b2c3d4-4444-4ddd-b444-444444444402'::uuid, wk4, athlete3_id, athlete3_id,
     now() - interval '17 days',
     now() - interval '17 days' + interval '62 minutes'),
    ('a1b2c3d4-4444-4ddd-b444-444444444403'::uuid, wk4, athlete3_id, athlete3_id,
     now() - interval '12 days',
     now() - interval '12 days' + interval '58 minutes'),
    ('a1b2c3d4-4444-4ddd-b444-444444444404'::uuid, wk4, athlete3_id, athlete3_id,
     now() - interval '5 days',
     now() - interval '5 days'  + interval '68 minutes'),

    -- ── Marcos — Treino A Empurrar (6 sessões) ──
    ('d55628a0-a5cd-4648-97bd-ab5719948167'::uuid, wk5, athlete5_id, athlete5_id,
     now() - interval '28 days',
     now() - interval '28 days' + interval '90 minutes'),
    ('fe3ca6d0-70b9-4ab6-a84b-98976fb80d44'::uuid, wk5, athlete5_id, athlete5_id,
     now() - interval '23 days',
     now() - interval '23 days' + interval '95 minutes'),
    ('a1b2c3d4-5555-4eee-b555-555555555501'::uuid, wk5, athlete5_id, athlete5_id,
     now() - interval '19 days',
     now() - interval '19 days' + interval '88 minutes'),
    ('a1b2c3d4-5555-4eee-b555-555555555502'::uuid, wk5, athlete5_id, athlete5_id,
     now() - interval '14 days',
     now() - interval '14 days' + interval '92 minutes'),
    ('a1b2c3d4-5555-4eee-b555-555555555503'::uuid, wk5, athlete5_id, athlete5_id,
     now() - interval '8 days',
     now() - interval '8 days'  + interval '85 minutes'),
    ('a1b2c3d4-5555-4eee-b555-555555555504'::uuid, wk5, athlete5_id, athlete5_id,
     now() - interval '2 days',
     now() - interval '2 days'  + interval '100 minutes'),

    -- ── Athlete4 — Treino A Peito/Tríceps (3 sessões, NO previous logs) ──
    ('a1b2c3d4-6666-4fff-b666-666666666601'::uuid, wk6, athlete4_id, athlete4_id,
     now() - interval '12 days',
     now() - interval '12 days' + interval '80 minutes'),
    ('a1b2c3d4-6666-4fff-b666-666666666602'::uuid, wk6, athlete4_id, athlete4_id,
     now() - interval '8 days',
     now() - interval '8 days'  + interval '75 minutes'),
    ('a1b2c3d4-6666-4fff-b666-666666666603'::uuid, wk6, athlete4_id, athlete4_id,
     now() - interval '3 days',
     now() - interval '3 days'  + interval '70 minutes')
  ON CONFLICT DO NOTHING;

  INSERT INTO public.workout_logs
    (id, workout_id, user_id, started_by, started_at, finished_at)
  VALUES
    ('7d910001-aaaa-4bbb-8ccc-100000000001'::uuid, wk7, athlete2_id, athlete2_id,
     now() - interval '18 days',
     now() - interval '18 days' + interval '72 minutes'),
    ('7d910002-aaaa-4bbb-8ccc-100000000002'::uuid, wk7, athlete2_id, athlete2_id,
     now() - interval '11 days',
     now() - interval '11 days' + interval '70 minutes'),
    ('7d910003-aaaa-4bbb-8ccc-100000000003'::uuid, wk7, athlete2_id, athlete2_id,
     now() - interval '5 days',
     now() - interval '5 days' + interval '68 minutes'),

    ('8e920001-bbbb-4ccc-8ddd-200000000001'::uuid, wk8, athlete5_id, athlete5_id,
     now() - interval '17 days',
     now() - interval '17 days' + interval '88 minutes'),
    ('8e920002-bbbb-4ccc-8ddd-200000000002'::uuid, wk8, athlete5_id, athlete5_id,
     now() - interval '9 days',
     now() - interval '9 days' + interval '85 minutes'),
    ('8e920003-bbbb-4ccc-8ddd-200000000003'::uuid, wk8, athlete5_id, athlete5_id,
     now() - interval '4 days',
     now() - interval '4 days' + interval '84 minutes'),

    ('9f930001-cccc-4ddd-8eee-300000000001'::uuid, wk9, athlete6_id, athlete6_id,
     now() - interval '12 days',
     now() - interval '12 days' + interval '66 minutes'),
    ('9f930002-cccc-4ddd-8eee-300000000002'::uuid, wk9, athlete6_id, athlete6_id,
     now() - interval '6 days',
     now() - interval '6 days' + interval '64 minutes'),
    ('a0940001-dddd-4eee-8fff-400000000001'::uuid, wk10, athlete6_id, athlete6_id,
     now() - interval '10 days',
     now() - interval '10 days' + interval '74 minutes'),
    ('a0940002-dddd-4eee-8fff-400000000002'::uuid, wk10, athlete6_id, athlete6_id,
     now() - interval '3 days',
     now() - interval '3 days' + interval '76 minutes'),

    ('b1a50001-eeee-4fff-8aaa-500000000001'::uuid, wk11, athlete7_id, athlete7_id,
     now() - interval '8 days',
     now() - interval '8 days' + interval '62 minutes'),
    ('b1a50002-eeee-4fff-8aaa-500000000002'::uuid, wk11, athlete7_id, athlete7_id,
     now() - interval '2 days',
     now() - interval '2 days' + interval '58 minutes')
  ON CONFLICT DO NOTHING;

  -- ================================================
  -- workout_exercise_logs
  --
  -- Regras de superset (espelhando o treino de origem):
  --   • Isolado  → superset_group_id = id próprio
  --   • Biset 1° → superset_group_id = id próprio
  --   • Biset 2° → superset_group_id = id do 1° do par
  -- ================================================
  INSERT INTO public.workout_exercise_logs
    (id, workout_log_id, variation_id, position, note, rest_seconds, superset_group_id)
  VALUES

    -- ══════════════════════════════════════════════════════
    -- LUCAS — TREINO A (wk1): 6 sessões
    -- Exercises: Supino Reto (isolated), Supino Inclinado + Tríceps Corda (biset)
    -- ══════════════════════════════════════════════════════

    -- ── wl001: Lucas Treino A sessão 1 ──
    ('85efd923-920d-45a3-bfa0-8d0475268185'::uuid, '94a18a75-21df-47dc-8001-9927acd51d2b'::uuid, var_supino_reto,      0, NULL,  90, '85efd923-920d-45a3-bfa0-8d0475268185'::uuid),
    ('67e3cea7-f95c-4dc3-a15f-bc0128f70aa7'::uuid, '94a18a75-21df-47dc-8001-9927acd51d2b'::uuid, var_supino_inclinado, 1, NULL,  60, '67e3cea7-f95c-4dc3-a15f-bc0128f70aa7'::uuid),
    ('e80e7718-7809-4749-98bc-5cfb89ac7cad'::uuid, '94a18a75-21df-47dc-8001-9927acd51d2b'::uuid, var_triceps_corda,    1, NULL,  60, '67e3cea7-f95c-4dc3-a15f-bc0128f70aa7'::uuid),

    -- ── wl003: Lucas Treino A sessão 2 ──
    ('b3ad0bf4-bce8-491c-a1e3-ba48346b498e'::uuid, 'def8c3f1-9b12-41fc-90ae-93a3e6ca7d6a'::uuid, var_supino_reto,      0, NULL,  90, 'b3ad0bf4-bce8-491c-a1e3-ba48346b498e'::uuid),
    ('a4c9b456-ce86-459c-8af3-0e9c1a40359e'::uuid, 'def8c3f1-9b12-41fc-90ae-93a3e6ca7d6a'::uuid, var_supino_inclinado, 1, NULL,  60, 'a4c9b456-ce86-459c-8af3-0e9c1a40359e'::uuid),
    ('ca36e734-d656-430a-8a23-c63a3518bc48'::uuid, 'def8c3f1-9b12-41fc-90ae-93a3e6ca7d6a'::uuid, var_triceps_corda,    1, NULL,  60, 'a4c9b456-ce86-459c-8af3-0e9c1a40359e'::uuid),

    -- ── wl011: Lucas Treino A sessão 3 ──
    ('a1110001-0001-4000-a001-000000000001'::uuid, 'a1b2c3d4-1111-4aaa-b111-111111111101'::uuid, var_supino_reto,      0, NULL,  90, 'a1110001-0001-4000-a001-000000000001'::uuid),
    ('a1110001-0001-4000-a001-000000000002'::uuid, 'a1b2c3d4-1111-4aaa-b111-111111111101'::uuid, var_supino_inclinado, 1, NULL,  60, 'a1110001-0001-4000-a001-000000000002'::uuid),
    ('a1110001-0001-4000-a001-000000000003'::uuid, 'a1b2c3d4-1111-4aaa-b111-111111111101'::uuid, var_triceps_corda,    1, NULL,  60, 'a1110001-0001-4000-a001-000000000002'::uuid),

    -- ── wl012: Lucas Treino A sessão 4 ──
    ('a1110002-0001-4000-a001-000000000001'::uuid, 'a1b2c3d4-1111-4aaa-b111-111111111102'::uuid, var_supino_reto,      0, NULL,  90, 'a1110002-0001-4000-a001-000000000001'::uuid),
    ('a1110002-0001-4000-a001-000000000002'::uuid, 'a1b2c3d4-1111-4aaa-b111-111111111102'::uuid, var_supino_inclinado, 1, NULL,  60, 'a1110002-0001-4000-a001-000000000002'::uuid),
    ('a1110002-0001-4000-a001-000000000003'::uuid, 'a1b2c3d4-1111-4aaa-b111-111111111102'::uuid, var_triceps_corda,    1, NULL,  60, 'a1110002-0001-4000-a001-000000000002'::uuid),

    -- ── wl013: Lucas Treino A sessão 5 ──
    ('a1110003-0001-4000-a001-000000000001'::uuid, 'a1b2c3d4-1111-4aaa-b111-111111111103'::uuid, var_supino_reto,      0, NULL,  90, 'a1110003-0001-4000-a001-000000000001'::uuid),
    ('a1110003-0001-4000-a001-000000000002'::uuid, 'a1b2c3d4-1111-4aaa-b111-111111111103'::uuid, var_supino_inclinado, 1, NULL,  60, 'a1110003-0001-4000-a001-000000000002'::uuid),
    ('a1110003-0001-4000-a001-000000000003'::uuid, 'a1b2c3d4-1111-4aaa-b111-111111111103'::uuid, var_triceps_corda,    1, NULL,  60, 'a1110003-0001-4000-a001-000000000002'::uuid),

    -- ── wl014: Lucas Treino A sessão 6 (skips biset — only Supino Reto) ──
    ('a1110004-0001-4000-a001-000000000001'::uuid, 'a1b2c3d4-1111-4aaa-b111-111111111104'::uuid, var_supino_reto,      0, NULL,  90, 'a1110004-0001-4000-a001-000000000001'::uuid),

    -- ══════════════════════════════════════════════════════
    -- LUCAS — TREINO B (wk2): 6 sessões
    -- Exercises: Puxada Barra (isolated), Remada Cabo (isolated), Puxada Cabo + Rosca Direta (biset)
    -- ══════════════════════════════════════════════════════

    -- ── wl002: Lucas Treino B sessão 1 ──
    ('21d44743-a3a2-464f-8a48-ac5c00b47cad'::uuid, '8a5d0046-d981-4289-ac03-bcb8110a7f1a'::uuid, var_puxada_barra,     0, NULL,  90, '21d44743-a3a2-464f-8a48-ac5c00b47cad'::uuid),
    ('abc9cd53-bf72-46d1-ab3c-b8c1562bc0c5'::uuid, '8a5d0046-d981-4289-ac03-bcb8110a7f1a'::uuid, var_remada_cabo,      1, NULL,  90, 'abc9cd53-bf72-46d1-ab3c-b8c1562bc0c5'::uuid),
    ('140ecc09-fafe-48aa-b8c7-36c014243ce1'::uuid, '8a5d0046-d981-4289-ac03-bcb8110a7f1a'::uuid, var_puxada_cabo,      2, NULL,  60, '140ecc09-fafe-48aa-b8c7-36c014243ce1'::uuid),
    ('6959cef5-7f38-41a6-923c-aa29c29a91da'::uuid, '8a5d0046-d981-4289-ac03-bcb8110a7f1a'::uuid, var_rosca_direta,     2, NULL,  60, '140ecc09-fafe-48aa-b8c7-36c014243ce1'::uuid),

    -- ── wl004: Lucas Treino B sessão 2 ──
    ('25d76453-1dcc-46e3-b0ed-e59f0700bd49'::uuid, '5964b795-79bc-46a6-9549-7c11607ba937'::uuid, var_puxada_barra,     0, NULL,  90, '25d76453-1dcc-46e3-b0ed-e59f0700bd49'::uuid),
    ('cb17a3af-a346-46a8-aa71-bee25254fad5'::uuid, '5964b795-79bc-46a6-9549-7c11607ba937'::uuid, var_remada_cabo,      1, NULL,  90, 'cb17a3af-a346-46a8-aa71-bee25254fad5'::uuid),
    ('822afae6-29d9-4f16-af94-2d6b14d17180'::uuid, '5964b795-79bc-46a6-9549-7c11607ba937'::uuid, var_puxada_cabo,      2, NULL,  60, '822afae6-29d9-4f16-af94-2d6b14d17180'::uuid),
    ('0d8a8864-bac8-4080-878a-3027c9e0cf41'::uuid, '5964b795-79bc-46a6-9549-7c11607ba937'::uuid, var_rosca_direta,     2, NULL,  60, '822afae6-29d9-4f16-af94-2d6b14d17180'::uuid),

    -- ── wl015: Lucas Treino B sessão 3 ──
    ('a2220001-0001-4000-a001-000000000001'::uuid, 'a1b2c3d4-2222-4bbb-b222-222222222201'::uuid, var_puxada_barra,     0, NULL,  90, 'a2220001-0001-4000-a001-000000000001'::uuid),
    ('a2220001-0001-4000-a001-000000000002'::uuid, 'a1b2c3d4-2222-4bbb-b222-222222222201'::uuid, var_remada_cabo,      1, NULL,  90, 'a2220001-0001-4000-a001-000000000002'::uuid),
    ('a2220001-0001-4000-a001-000000000003'::uuid, 'a1b2c3d4-2222-4bbb-b222-222222222201'::uuid, var_puxada_cabo,      2, NULL,  60, 'a2220001-0001-4000-a001-000000000003'::uuid),
    ('a2220001-0001-4000-a001-000000000004'::uuid, 'a1b2c3d4-2222-4bbb-b222-222222222201'::uuid, var_rosca_direta,     2, NULL,  60, 'a2220001-0001-4000-a001-000000000003'::uuid),

    -- ── wl016: Lucas Treino B sessão 4 ──
    ('a2220002-0001-4000-a001-000000000001'::uuid, 'a1b2c3d4-2222-4bbb-b222-222222222202'::uuid, var_puxada_barra,     0, NULL,  90, 'a2220002-0001-4000-a001-000000000001'::uuid),
    ('a2220002-0001-4000-a001-000000000002'::uuid, 'a1b2c3d4-2222-4bbb-b222-222222222202'::uuid, var_remada_cabo,      1, NULL,  90, 'a2220002-0001-4000-a001-000000000002'::uuid),
    ('a2220002-0001-4000-a001-000000000003'::uuid, 'a1b2c3d4-2222-4bbb-b222-222222222202'::uuid, var_puxada_cabo,      2, NULL,  60, 'a2220002-0001-4000-a001-000000000003'::uuid),
    ('a2220002-0001-4000-a001-000000000004'::uuid, 'a1b2c3d4-2222-4bbb-b222-222222222202'::uuid, var_rosca_direta,     2, NULL,  60, 'a2220002-0001-4000-a001-000000000003'::uuid),

    -- ── wl017: Lucas Treino B sessão 5 (skips Remada Cabo) ──
    ('a2220003-0001-4000-a001-000000000001'::uuid, 'a1b2c3d4-2222-4bbb-b222-222222222203'::uuid, var_puxada_barra,     0, NULL,  90, 'a2220003-0001-4000-a001-000000000001'::uuid),
    ('a2220003-0001-4000-a001-000000000003'::uuid, 'a1b2c3d4-2222-4bbb-b222-222222222203'::uuid, var_puxada_cabo,      2, NULL,  60, 'a2220003-0001-4000-a001-000000000003'::uuid),
    ('a2220003-0001-4000-a001-000000000004'::uuid, 'a1b2c3d4-2222-4bbb-b222-222222222203'::uuid, var_rosca_direta,     2, NULL,  60, 'a2220003-0001-4000-a001-000000000003'::uuid),

    -- ── wl018: Lucas Treino B sessão 6 ──
    ('a2220004-0001-4000-a001-000000000001'::uuid, 'a1b2c3d4-2222-4bbb-b222-222222222204'::uuid, var_puxada_barra,     0, NULL,  90, 'a2220004-0001-4000-a001-000000000001'::uuid),
    ('a2220004-0001-4000-a001-000000000002'::uuid, 'a1b2c3d4-2222-4bbb-b222-222222222204'::uuid, var_remada_cabo,      1, NULL,  90, 'a2220004-0001-4000-a001-000000000002'::uuid),
    ('a2220004-0001-4000-a001-000000000003'::uuid, 'a1b2c3d4-2222-4bbb-b222-222222222204'::uuid, var_puxada_cabo,      2, NULL,  60, 'a2220004-0001-4000-a001-000000000003'::uuid),
    ('a2220004-0001-4000-a001-000000000004'::uuid, 'a1b2c3d4-2222-4bbb-b222-222222222204'::uuid, var_rosca_direta,     2, NULL,  60, 'a2220004-0001-4000-a001-000000000003'::uuid),

    -- ══════════════════════════════════════════════════════
    -- FERNANDA — TREINO A (wk3): 6 sessões
    -- Exercises: Agachamento (isolated), Leg Press (isolated), Mesa Flexora + Elevação Pélvica (biset)
    -- ══════════════════════════════════════════════════════

    -- ── wl005: Fernanda sessão 1 ──
    ('194ec4de-ce8b-4597-b437-0c36393baac1'::uuid, 'e00cd2fe-9a8c-4418-9a7c-1ca6694ddb66'::uuid, var_agachamento,      0, NULL, 120, '194ec4de-ce8b-4597-b437-0c36393baac1'::uuid),
    ('8e645813-67bd-4237-b07a-61c1754f4855'::uuid, 'e00cd2fe-9a8c-4418-9a7c-1ca6694ddb66'::uuid, var_leg_press,        1, NULL,  90, '8e645813-67bd-4237-b07a-61c1754f4855'::uuid),
    ('b1edc853-8859-4271-8a47-2c4f58b919f2'::uuid, 'e00cd2fe-9a8c-4418-9a7c-1ca6694ddb66'::uuid, var_mesa_flexora,     2, NULL,  60, 'b1edc853-8859-4271-8a47-2c4f58b919f2'::uuid),
    ('6e8f26a7-ac30-4f79-a254-a12387857682'::uuid, 'e00cd2fe-9a8c-4418-9a7c-1ca6694ddb66'::uuid, var_elevacao_pelv,    2, NULL,  60, 'b1edc853-8859-4271-8a47-2c4f58b919f2'::uuid),

    -- ── wl006: Fernanda sessão 2 ──
    ('5a5d649f-3aa8-49e3-9314-d2b31dc22f2f'::uuid, '869e32ae-e449-4a92-92a1-878c2df396e3'::uuid, var_agachamento,      0, NULL, 120, '5a5d649f-3aa8-49e3-9314-d2b31dc22f2f'::uuid),
    ('5728db97-1cde-49f4-bf95-c15249902133'::uuid, '869e32ae-e449-4a92-92a1-878c2df396e3'::uuid, var_leg_press,        1, NULL,  90, '5728db97-1cde-49f4-bf95-c15249902133'::uuid),
    ('696df333-ee82-437e-aaeb-5629ac2c7cf1'::uuid, '869e32ae-e449-4a92-92a1-878c2df396e3'::uuid, var_mesa_flexora,     2, NULL,  60, '696df333-ee82-437e-aaeb-5629ac2c7cf1'::uuid),
    ('e1ba4250-5c26-4673-8a25-d1c4e7cf81d4'::uuid, '869e32ae-e449-4a92-92a1-878c2df396e3'::uuid, var_elevacao_pelv,    2, NULL,  60, '696df333-ee82-437e-aaeb-5629ac2c7cf1'::uuid),

    -- ── wl019: Fernanda sessão 3 ──
    ('a3330001-0001-4000-a001-000000000001'::uuid, 'a1b2c3d4-3333-4ccc-b333-333333333301'::uuid, var_agachamento,      0, NULL, 120, 'a3330001-0001-4000-a001-000000000001'::uuid),
    ('a3330001-0001-4000-a001-000000000002'::uuid, 'a1b2c3d4-3333-4ccc-b333-333333333301'::uuid, var_leg_press,        1, NULL,  90, 'a3330001-0001-4000-a001-000000000002'::uuid),
    ('a3330001-0001-4000-a001-000000000003'::uuid, 'a1b2c3d4-3333-4ccc-b333-333333333301'::uuid, var_mesa_flexora,     2, NULL,  60, 'a3330001-0001-4000-a001-000000000003'::uuid),
    ('a3330001-0001-4000-a001-000000000004'::uuid, 'a1b2c3d4-3333-4ccc-b333-333333333301'::uuid, var_elevacao_pelv,    2, NULL,  60, 'a3330001-0001-4000-a001-000000000003'::uuid),

    -- ── wl020: Fernanda sessão 4 (skips Leg Press) ──
    ('a3330002-0001-4000-a001-000000000001'::uuid, 'a1b2c3d4-3333-4ccc-b333-333333333302'::uuid, var_agachamento,      0, NULL, 120, 'a3330002-0001-4000-a001-000000000001'::uuid),
    ('a3330002-0001-4000-a001-000000000003'::uuid, 'a1b2c3d4-3333-4ccc-b333-333333333302'::uuid, var_mesa_flexora,     2, NULL,  60, 'a3330002-0001-4000-a001-000000000003'::uuid),
    ('a3330002-0001-4000-a001-000000000004'::uuid, 'a1b2c3d4-3333-4ccc-b333-333333333302'::uuid, var_elevacao_pelv,    2, NULL,  60, 'a3330002-0001-4000-a001-000000000003'::uuid),

    -- ── wl021: Fernanda sessão 5 ──
    ('a3330003-0001-4000-a001-000000000001'::uuid, 'a1b2c3d4-3333-4ccc-b333-333333333303'::uuid, var_agachamento,      0, NULL, 120, 'a3330003-0001-4000-a001-000000000001'::uuid),
    ('a3330003-0001-4000-a001-000000000002'::uuid, 'a1b2c3d4-3333-4ccc-b333-333333333303'::uuid, var_leg_press,        1, NULL,  90, 'a3330003-0001-4000-a001-000000000002'::uuid),
    ('a3330003-0001-4000-a001-000000000003'::uuid, 'a1b2c3d4-3333-4ccc-b333-333333333303'::uuid, var_mesa_flexora,     2, NULL,  60, 'a3330003-0001-4000-a001-000000000003'::uuid),
    ('a3330003-0001-4000-a001-000000000004'::uuid, 'a1b2c3d4-3333-4ccc-b333-333333333303'::uuid, var_elevacao_pelv,    2, NULL,  60, 'a3330003-0001-4000-a001-000000000003'::uuid),

    -- ── wl022: Fernanda sessão 6 ──
    ('a3330004-0001-4000-a001-000000000001'::uuid, 'a1b2c3d4-3333-4ccc-b333-333333333304'::uuid, var_agachamento,      0, NULL, 120, 'a3330004-0001-4000-a001-000000000001'::uuid),
    ('a3330004-0001-4000-a001-000000000002'::uuid, 'a1b2c3d4-3333-4ccc-b333-333333333304'::uuid, var_leg_press,        1, NULL,  90, 'a3330004-0001-4000-a001-000000000002'::uuid),
    ('a3330004-0001-4000-a001-000000000003'::uuid, 'a1b2c3d4-3333-4ccc-b333-333333333304'::uuid, var_mesa_flexora,     2, NULL,  60, 'a3330004-0001-4000-a001-000000000003'::uuid),
    ('a3330004-0001-4000-a001-000000000004'::uuid, 'a1b2c3d4-3333-4ccc-b333-333333333304'::uuid, var_elevacao_pelv,    2, NULL,  60, 'a3330004-0001-4000-a001-000000000003'::uuid),

    -- ══════════════════════════════════════════════════════
    -- RAFAEL — FULL BODY (wk4): 6 sessões (all isolated)
    -- Exercises: Supino Reto, Agachamento, Remada Cabo, Desenvolvimento Militar
    -- ══════════════════════════════════════════════════════

    -- ── wl007: Rafael sessão 1 (com coach) ──
    ('a9324f5a-9922-47e2-bf51-6e54fe046677'::uuid, '45ca393e-5945-4f83-8766-19f7653a8249'::uuid, var_supino_reto,      0, NULL,  90, 'a9324f5a-9922-47e2-bf51-6e54fe046677'::uuid),
    ('65b5d710-68b1-467f-b7db-cd24d60376ea'::uuid, '45ca393e-5945-4f83-8766-19f7653a8249'::uuid, var_agachamento,      1, NULL, 120, '65b5d710-68b1-467f-b7db-cd24d60376ea'::uuid),
    ('fa1c30b3-199c-4bee-b1ca-6f93490ba8f4'::uuid, '45ca393e-5945-4f83-8766-19f7653a8249'::uuid, var_remada_cabo,      2, NULL,  90, 'fa1c30b3-199c-4bee-b1ca-6f93490ba8f4'::uuid),
    ('5ef75836-176d-4527-aa6f-eb68cf3b5ed2'::uuid, '45ca393e-5945-4f83-8766-19f7653a8249'::uuid, var_desenvolvimento,  3, NULL,  90, '5ef75836-176d-4527-aa6f-eb68cf3b5ed2'::uuid),

    -- ── wl008: Rafael sessão 2 ──
    ('1e1fff87-731b-4b65-a1b7-979ad31fc489'::uuid, '25e4cfc1-456a-4c36-acb7-4a725884c83d'::uuid, var_supino_reto,      0, NULL,  90, '1e1fff87-731b-4b65-a1b7-979ad31fc489'::uuid),
    ('fb4c66b9-ff9b-45da-b2a8-3dfe2e6693e4'::uuid, '25e4cfc1-456a-4c36-acb7-4a725884c83d'::uuid, var_agachamento,      1, NULL, 120, 'fb4c66b9-ff9b-45da-b2a8-3dfe2e6693e4'::uuid),
    ('cbe92783-197e-4097-abbd-8b4bf0af23e7'::uuid, '25e4cfc1-456a-4c36-acb7-4a725884c83d'::uuid, var_remada_cabo,      2, NULL,  90, 'cbe92783-197e-4097-abbd-8b4bf0af23e7'::uuid),
    ('c01ca9d1-7550-4192-9ccb-d123edfc6104'::uuid, '25e4cfc1-456a-4c36-acb7-4a725884c83d'::uuid, var_desenvolvimento,  3, NULL,  90, 'c01ca9d1-7550-4192-9ccb-d123edfc6104'::uuid),

    -- ── wl023: Rafael sessão 3 ──
    ('a4440001-0001-4000-a001-000000000001'::uuid, 'a1b2c3d4-4444-4ddd-b444-444444444401'::uuid, var_supino_reto,      0, NULL,  90, 'a4440001-0001-4000-a001-000000000001'::uuid),
    ('a4440001-0001-4000-a001-000000000002'::uuid, 'a1b2c3d4-4444-4ddd-b444-444444444401'::uuid, var_agachamento,      1, NULL, 120, 'a4440001-0001-4000-a001-000000000002'::uuid),
    ('a4440001-0001-4000-a001-000000000003'::uuid, 'a1b2c3d4-4444-4ddd-b444-444444444401'::uuid, var_remada_cabo,      2, NULL,  90, 'a4440001-0001-4000-a001-000000000003'::uuid),
    ('a4440001-0001-4000-a001-000000000004'::uuid, 'a1b2c3d4-4444-4ddd-b444-444444444401'::uuid, var_desenvolvimento,  3, NULL,  90, 'a4440001-0001-4000-a001-000000000004'::uuid),

    -- ── wl024: Rafael sessão 4 (skips Desenvolvimento) ──
    ('a4440002-0001-4000-a001-000000000001'::uuid, 'a1b2c3d4-4444-4ddd-b444-444444444402'::uuid, var_supino_reto,      0, NULL,  90, 'a4440002-0001-4000-a001-000000000001'::uuid),
    ('a4440002-0001-4000-a001-000000000002'::uuid, 'a1b2c3d4-4444-4ddd-b444-444444444402'::uuid, var_agachamento,      1, NULL, 120, 'a4440002-0001-4000-a001-000000000002'::uuid),
    ('a4440002-0001-4000-a001-000000000003'::uuid, 'a1b2c3d4-4444-4ddd-b444-444444444402'::uuid, var_remada_cabo,      2, NULL,  90, 'a4440002-0001-4000-a001-000000000003'::uuid),

    -- ── wl025: Rafael sessão 5 ──
    ('a4440003-0001-4000-a001-000000000001'::uuid, 'a1b2c3d4-4444-4ddd-b444-444444444403'::uuid, var_supino_reto,      0, NULL,  90, 'a4440003-0001-4000-a001-000000000001'::uuid),
    ('a4440003-0001-4000-a001-000000000002'::uuid, 'a1b2c3d4-4444-4ddd-b444-444444444403'::uuid, var_agachamento,      1, NULL, 120, 'a4440003-0001-4000-a001-000000000002'::uuid),
    ('a4440003-0001-4000-a001-000000000003'::uuid, 'a1b2c3d4-4444-4ddd-b444-444444444403'::uuid, var_remada_cabo,      2, NULL,  90, 'a4440003-0001-4000-a001-000000000003'::uuid),
    ('a4440003-0001-4000-a001-000000000004'::uuid, 'a1b2c3d4-4444-4ddd-b444-444444444403'::uuid, var_desenvolvimento,  3, NULL,  90, 'a4440003-0001-4000-a001-000000000004'::uuid),

    -- ── wl026: Rafael sessão 6 ──
    ('a4440004-0001-4000-a001-000000000001'::uuid, 'a1b2c3d4-4444-4ddd-b444-444444444404'::uuid, var_supino_reto,      0, NULL,  90, 'a4440004-0001-4000-a001-000000000001'::uuid),
    ('a4440004-0001-4000-a001-000000000002'::uuid, 'a1b2c3d4-4444-4ddd-b444-444444444404'::uuid, var_agachamento,      1, NULL, 120, 'a4440004-0001-4000-a001-000000000002'::uuid),
    ('a4440004-0001-4000-a001-000000000003'::uuid, 'a1b2c3d4-4444-4ddd-b444-444444444404'::uuid, var_remada_cabo,      2, NULL,  90, 'a4440004-0001-4000-a001-000000000003'::uuid),
    ('a4440004-0001-4000-a001-000000000004'::uuid, 'a1b2c3d4-4444-4ddd-b444-444444444404'::uuid, var_desenvolvimento,  3, NULL,  90, 'a4440004-0001-4000-a001-000000000004'::uuid),

    -- ══════════════════════════════════════════════════════
    -- MARCOS — TREINO A EMPURRAR (wk5): 6 sessões
    -- Exercises: Supino Reto (isolated), Supino Inclinado (isolated),
    --            Desenvolvimento Militar (isolated), Elevação Lateral + Tríceps Corda (biset)
    -- ══════════════════════════════════════════════════════

    -- ── wl009: Marcos sessão 1 ──
    ('bf43f866-3a33-4242-8a5f-8044b0db12a4'::uuid, 'd55628a0-a5cd-4648-97bd-ab5719948167'::uuid, var_supino_reto,      0, NULL,  90, 'bf43f866-3a33-4242-8a5f-8044b0db12a4'::uuid),
    ('184332cc-9e46-4101-912b-2de76124b902'::uuid, 'd55628a0-a5cd-4648-97bd-ab5719948167'::uuid, var_supino_inclinado, 1, NULL,  90, '184332cc-9e46-4101-912b-2de76124b902'::uuid),
    ('316d986a-ae32-415c-9f32-adfc6f33535a'::uuid, 'd55628a0-a5cd-4648-97bd-ab5719948167'::uuid, var_desenvolvimento,  2, NULL,  90, '316d986a-ae32-415c-9f32-adfc6f33535a'::uuid),
    ('7a1b338a-9d92-4a9e-a10b-aa8d7a2761a7'::uuid, 'd55628a0-a5cd-4648-97bd-ab5719948167'::uuid, var_elevacao_lat,     3, NULL,  60, '7a1b338a-9d92-4a9e-a10b-aa8d7a2761a7'::uuid),
    ('817d5416-e41e-4f5e-b569-54ae81766086'::uuid, 'd55628a0-a5cd-4648-97bd-ab5719948167'::uuid, var_triceps_corda,    3, NULL,  60, '7a1b338a-9d92-4a9e-a10b-aa8d7a2761a7'::uuid),

    -- ── wl010: Marcos sessão 2 ──
    ('d943fdf2-f1db-4582-b64c-1a6a9b761ca4'::uuid, 'fe3ca6d0-70b9-4ab6-a84b-98976fb80d44'::uuid, var_supino_reto,      0, NULL,  90, 'd943fdf2-f1db-4582-b64c-1a6a9b761ca4'::uuid),
    ('bf29a470-5efc-4d42-bb41-bec943b5799f'::uuid, 'fe3ca6d0-70b9-4ab6-a84b-98976fb80d44'::uuid, var_supino_inclinado, 1, NULL,  90, 'bf29a470-5efc-4d42-bb41-bec943b5799f'::uuid),
    ('2275403b-1848-4ffc-8b6c-d6b3cfd12a14'::uuid, 'fe3ca6d0-70b9-4ab6-a84b-98976fb80d44'::uuid, var_desenvolvimento,  2, NULL,  90, '2275403b-1848-4ffc-8b6c-d6b3cfd12a14'::uuid),
    ('2aae4fe5-57de-4bce-815f-9615350d8e7d'::uuid, 'fe3ca6d0-70b9-4ab6-a84b-98976fb80d44'::uuid, var_elevacao_lat,     3, NULL,  60, '2aae4fe5-57de-4bce-815f-9615350d8e7d'::uuid),
    ('102958d6-7067-445e-9827-0b84ef7cf5a6'::uuid, 'fe3ca6d0-70b9-4ab6-a84b-98976fb80d44'::uuid, var_triceps_corda,    3, NULL,  60, '2aae4fe5-57de-4bce-815f-9615350d8e7d'::uuid),

    -- ── wl027: Marcos sessão 3 ──
    ('a5550001-0001-4000-a001-000000000001'::uuid, 'a1b2c3d4-5555-4eee-b555-555555555501'::uuid, var_supino_reto,      0, NULL,  90, 'a5550001-0001-4000-a001-000000000001'::uuid),
    ('a5550001-0001-4000-a001-000000000002'::uuid, 'a1b2c3d4-5555-4eee-b555-555555555501'::uuid, var_supino_inclinado, 1, NULL,  90, 'a5550001-0001-4000-a001-000000000002'::uuid),
    ('a5550001-0001-4000-a001-000000000003'::uuid, 'a1b2c3d4-5555-4eee-b555-555555555501'::uuid, var_desenvolvimento,  2, NULL,  90, 'a5550001-0001-4000-a001-000000000003'::uuid),
    ('a5550001-0001-4000-a001-000000000004'::uuid, 'a1b2c3d4-5555-4eee-b555-555555555501'::uuid, var_elevacao_lat,     3, NULL,  60, 'a5550001-0001-4000-a001-000000000004'::uuid),
    ('a5550001-0001-4000-a001-000000000005'::uuid, 'a1b2c3d4-5555-4eee-b555-555555555501'::uuid, var_triceps_corda,    3, NULL,  60, 'a5550001-0001-4000-a001-000000000004'::uuid),

    -- ── wl028: Marcos sessão 4 ──
    ('a5550002-0001-4000-a001-000000000001'::uuid, 'a1b2c3d4-5555-4eee-b555-555555555502'::uuid, var_supino_reto,      0, NULL,  90, 'a5550002-0001-4000-a001-000000000001'::uuid),
    ('a5550002-0001-4000-a001-000000000002'::uuid, 'a1b2c3d4-5555-4eee-b555-555555555502'::uuid, var_supino_inclinado, 1, NULL,  90, 'a5550002-0001-4000-a001-000000000002'::uuid),
    ('a5550002-0001-4000-a001-000000000003'::uuid, 'a1b2c3d4-5555-4eee-b555-555555555502'::uuid, var_desenvolvimento,  2, NULL,  90, 'a5550002-0001-4000-a001-000000000003'::uuid),
    ('a5550002-0001-4000-a001-000000000004'::uuid, 'a1b2c3d4-5555-4eee-b555-555555555502'::uuid, var_elevacao_lat,     3, NULL,  60, 'a5550002-0001-4000-a001-000000000004'::uuid),
    ('a5550002-0001-4000-a001-000000000005'::uuid, 'a1b2c3d4-5555-4eee-b555-555555555502'::uuid, var_triceps_corda,    3, NULL,  60, 'a5550002-0001-4000-a001-000000000004'::uuid),

    -- ── wl029: Marcos sessão 5 (skips Supino Inclinado) ──
    ('a5550003-0001-4000-a001-000000000001'::uuid, 'a1b2c3d4-5555-4eee-b555-555555555503'::uuid, var_supino_reto,      0, NULL,  90, 'a5550003-0001-4000-a001-000000000001'::uuid),
    ('a5550003-0001-4000-a001-000000000003'::uuid, 'a1b2c3d4-5555-4eee-b555-555555555503'::uuid, var_desenvolvimento,  2, NULL,  90, 'a5550003-0001-4000-a001-000000000003'::uuid),
    ('a5550003-0001-4000-a001-000000000004'::uuid, 'a1b2c3d4-5555-4eee-b555-555555555503'::uuid, var_elevacao_lat,     3, NULL,  60, 'a5550003-0001-4000-a001-000000000004'::uuid),
    ('a5550003-0001-4000-a001-000000000005'::uuid, 'a1b2c3d4-5555-4eee-b555-555555555503'::uuid, var_triceps_corda,    3, NULL,  60, 'a5550003-0001-4000-a001-000000000004'::uuid),

    -- ── wl030: Marcos sessão 6 ──
    ('a5550004-0001-4000-a001-000000000001'::uuid, 'a1b2c3d4-5555-4eee-b555-555555555504'::uuid, var_supino_reto,      0, NULL,  90, 'a5550004-0001-4000-a001-000000000001'::uuid),
    ('a5550004-0001-4000-a001-000000000002'::uuid, 'a1b2c3d4-5555-4eee-b555-555555555504'::uuid, var_supino_inclinado, 1, NULL,  90, 'a5550004-0001-4000-a001-000000000002'::uuid),
    ('a5550004-0001-4000-a001-000000000003'::uuid, 'a1b2c3d4-5555-4eee-b555-555555555504'::uuid, var_desenvolvimento,  2, NULL,  90, 'a5550004-0001-4000-a001-000000000003'::uuid),
    ('a5550004-0001-4000-a001-000000000004'::uuid, 'a1b2c3d4-5555-4eee-b555-555555555504'::uuid, var_elevacao_lat,     3, NULL,  60, 'a5550004-0001-4000-a001-000000000004'::uuid),
    ('a5550004-0001-4000-a001-000000000005'::uuid, 'a1b2c3d4-5555-4eee-b555-555555555504'::uuid, var_triceps_corda,    3, NULL,  60, 'a5550004-0001-4000-a001-000000000004'::uuid),

    -- ══════════════════════════════════════════════════════
    -- ATHLETE4 — TREINO A PEITO/TRÍCEPS (wk6): 3 sessões
    -- Same structure as wk1: Supino Reto (isolated), Supino Inclinado + Tríceps Corda (biset)
    -- ══════════════════════════════════════════════════════

    -- ── wl031: Athlete4 sessão 1 ──
    ('a6660001-0001-4000-a001-000000000001'::uuid, 'a1b2c3d4-6666-4fff-b666-666666666601'::uuid, var_supino_reto,      0, NULL,  90, 'a6660001-0001-4000-a001-000000000001'::uuid),
    ('a6660001-0001-4000-a001-000000000002'::uuid, 'a1b2c3d4-6666-4fff-b666-666666666601'::uuid, var_supino_inclinado, 1, NULL,  60, 'a6660001-0001-4000-a001-000000000002'::uuid),
    ('a6660001-0001-4000-a001-000000000003'::uuid, 'a1b2c3d4-6666-4fff-b666-666666666601'::uuid, var_triceps_corda,    1, NULL,  60, 'a6660001-0001-4000-a001-000000000002'::uuid),

    -- ── wl032: Athlete4 sessão 2 ──
    ('a6660002-0001-4000-a001-000000000001'::uuid, 'a1b2c3d4-6666-4fff-b666-666666666602'::uuid, var_supino_reto,      0, NULL,  90, 'a6660002-0001-4000-a001-000000000001'::uuid),
    ('a6660002-0001-4000-a001-000000000002'::uuid, 'a1b2c3d4-6666-4fff-b666-666666666602'::uuid, var_supino_inclinado, 1, NULL,  60, 'a6660002-0001-4000-a001-000000000002'::uuid),
    ('a6660002-0001-4000-a001-000000000003'::uuid, 'a1b2c3d4-6666-4fff-b666-666666666602'::uuid, var_triceps_corda,    1, NULL,  60, 'a6660002-0001-4000-a001-000000000002'::uuid),

    -- ── wl033: Athlete4 sessão 3 (skips biset — only Supino Reto) ──
    ('a6660003-0001-4000-a001-000000000001'::uuid, 'a1b2c3d4-6666-4fff-b666-666666666603'::uuid, var_supino_reto,      0, NULL,  90, 'a6660003-0001-4000-a001-000000000001'::uuid)

  ON CONFLICT DO NOTHING;

  WITH generated_logs AS (
    SELECT
      gen_random_uuid() AS id,
      wl.id AS workout_log_id,
      we.variation_id,
      we.position,
      we.note,
      we.rest_seconds
    FROM public.workout_logs wl
    JOIN public.workout_exercises we ON we.workout_id = wl.workout_id
    WHERE wl.id IN (
      '7d910001-aaaa-4bbb-8ccc-100000000001'::uuid,
      '7d910002-aaaa-4bbb-8ccc-100000000002'::uuid,
      '7d910003-aaaa-4bbb-8ccc-100000000003'::uuid,
      '8e920001-bbbb-4ccc-8ddd-200000000001'::uuid,
      '8e920002-bbbb-4ccc-8ddd-200000000002'::uuid,
      '8e920003-bbbb-4ccc-8ddd-200000000003'::uuid,
      '9f930001-cccc-4ddd-8eee-300000000001'::uuid,
      '9f930002-cccc-4ddd-8eee-300000000002'::uuid,
      'a0940001-dddd-4eee-8fff-400000000001'::uuid,
      'a0940002-dddd-4eee-8fff-400000000002'::uuid,
      'b1a50001-eeee-4fff-8aaa-500000000001'::uuid,
      'b1a50002-eeee-4fff-8aaa-500000000002'::uuid
    )
      AND NOT (
        (wl.id = '8e920002-bbbb-4ccc-8ddd-200000000002'::uuid AND we.position = 3)
        OR (wl.id = 'b1a50002-eeee-4fff-8aaa-500000000002'::uuid AND we.position = 1)
      )
  )
  INSERT INTO public.workout_exercise_logs
    (id, workout_log_id, variation_id, position, note, rest_seconds, superset_group_id)
  SELECT
    id,
    workout_log_id,
    variation_id,
    position,
    note,
    rest_seconds,
    id
  FROM generated_logs
  ON CONFLICT DO NOTHING;

  -- Snapshot exercise_name / variation_name a partir das tabelas de exercícios
  UPDATE public.workout_exercise_logs wel
  SET exercise_name = e.name,
      variation_name = v.name
  FROM public.variations v
  JOIN public.exercises e ON e.id = v.exercise_id
  WHERE wel.variation_id = v.id
    AND wel.exercise_name IS NULL;

  -- ================================================
  -- workout_exercise_set_logs
  --
  -- Sessões mais antigas: cargas iniciais
  -- Sessões mais recentes: progressive overload (cargas maiores)
  -- reps_min/reps_max espelham o template de cada exercício
  -- Algumas séries fora da faixa para testar "% na faixa"
  --
  -- Regras:
  --   • Biset → apenas 'normal', mesma quantidade por par
  --   • Isolado → 1 'warmup' (carga ~50%) + N 'normal'
  --   • Puxada na Barra Fixa → peso corporal (weight_kg NULL)
  -- ================================================
  INSERT INTO public.workout_exercise_set_logs
    (id, workout_exercise_log_id, set_order, set_type, weight_kg, reps, reps_min, reps_max)
  VALUES

    -- ════════════════════════════════════════════════
    -- wl001: Lucas Treino A — sessão 1 (75 kg supino)
    -- ════════════════════════════════════════════════

    -- Supino Reto: warmup + 3 normal (range 8-12)
    ('ba5d33e9-ace5-4326-8828-c2d76e17800d'::uuid, '85efd923-920d-45a3-bfa0-8d0475268185'::uuid, 0, 'warmup', 40.00, 15, 12, 15),
    ('d8025625-e26f-4350-833e-987b74c918c3'::uuid, '85efd923-920d-45a3-bfa0-8d0475268185'::uuid, 1, 'normal', 75.00, 10,  8, 12),
    ('280a8ad3-2d06-49a4-abf6-f08f4a31c6f4'::uuid, '85efd923-920d-45a3-bfa0-8d0475268185'::uuid, 2, 'normal', 75.00, 11,  8, 12),
    ('4077ba59-f174-4f1a-9bd1-294752ec082e'::uuid, '85efd923-920d-45a3-bfa0-8d0475268185'::uuid, 3, 'normal', 75.00, 10,  8, 12),
    -- Supino Inclinado (biset) — 3 normal (range 10-15)
    ('5a3fa8a3-5ba2-4f4f-843f-b2f218bfdac3'::uuid, '67e3cea7-f95c-4dc3-a15f-bc0128f70aa7'::uuid, 0, 'normal', 55.00, 13, 10, 15),
    ('5f0a077c-17b0-4500-a201-afd7968bed7a'::uuid, '67e3cea7-f95c-4dc3-a15f-bc0128f70aa7'::uuid, 1, 'normal', 55.00, 14, 10, 15),
    ('e8192a79-1671-49f0-9c1f-c88ad18c757f'::uuid, '67e3cea7-f95c-4dc3-a15f-bc0128f70aa7'::uuid, 2, 'normal', 55.00, 13, 10, 15),
    -- Tríceps Corda (biset) — 3 normal (range 12-15)
    ('4816d259-54fd-4019-a3da-8f250e8e5998'::uuid, 'e80e7718-7809-4749-98bc-5cfb89ac7cad'::uuid, 0, 'normal', 28.00, 13, 12, 15),
    ('03a4c4d5-3350-41a6-8cfd-b502471d45dd'::uuid, 'e80e7718-7809-4749-98bc-5cfb89ac7cad'::uuid, 1, 'normal', 28.00, 14, 12, 15),
    ('a4957ec8-d9e3-46ef-9c00-105fce978b75'::uuid, 'e80e7718-7809-4749-98bc-5cfb89ac7cad'::uuid, 2, 'normal', 28.00, 14, 12, 15),

    -- ════════════════════════════════════════════════
    -- wl003: Lucas Treino A — sessão 2 (PR: 80 kg supino)
    -- ════════════════════════════════════════════════

    -- Supino Reto: warmup + 3 normal (range 8-12)
    ('fd1ef122-1adb-4f7b-9719-b9252415017f'::uuid, 'b3ad0bf4-bce8-491c-a1e3-ba48346b498e'::uuid, 0, 'warmup', 40.00, 15, 12, 15),
    ('d8c18e59-cd54-45f2-a39e-5cb6a52af995'::uuid, 'b3ad0bf4-bce8-491c-a1e3-ba48346b498e'::uuid, 1, 'normal', 80.00, 12,  8, 12),
    ('38a819b7-cd08-44e3-a6ac-d8ec2d265a69'::uuid, 'b3ad0bf4-bce8-491c-a1e3-ba48346b498e'::uuid, 2, 'normal', 80.00, 11,  8, 12),
    ('d2ad6798-5860-4162-bf8c-71439575da33'::uuid, 'b3ad0bf4-bce8-491c-a1e3-ba48346b498e'::uuid, 3, 'normal', 80.00, 10,  8, 12),
    -- Supino Inclinado (biset) — 3 normal (range 10-15)
    ('6899ef9d-c4ac-40eb-87f9-eff43b7f9b12'::uuid, 'a4c9b456-ce86-459c-8af3-0e9c1a40359e'::uuid, 0, 'normal', 60.00, 15, 10, 15),
    ('73f5eade-8081-41e8-9fff-e3d0781048f0'::uuid, 'a4c9b456-ce86-459c-8af3-0e9c1a40359e'::uuid, 1, 'normal', 60.00, 14, 10, 15),
    ('b87ad8be-8f3d-491f-8d7c-36e601690fb8'::uuid, 'a4c9b456-ce86-459c-8af3-0e9c1a40359e'::uuid, 2, 'normal', 60.00, 14, 10, 15),
    -- Tríceps Corda (biset) — 3 normal (range 12-15)
    ('2947653a-c568-4bc1-8ef4-b769c69197cf'::uuid, 'ca36e734-d656-430a-8a23-c63a3518bc48'::uuid, 0, 'normal', 30.00, 15, 12, 15),
    ('416bd895-6ad8-434f-919f-ace67b055b83'::uuid, 'ca36e734-d656-430a-8a23-c63a3518bc48'::uuid, 1, 'normal', 30.00, 14, 12, 15),
    ('f84aae60-8b76-4c99-a77b-6bb1e121f830'::uuid, 'ca36e734-d656-430a-8a23-c63a3518bc48'::uuid, 2, 'normal', 30.00, 15, 12, 15),

    -- ════════════════════════════════════════════════
    -- wl011: Lucas Treino A — sessão 3 (82 kg supino, progressive)
    -- ════════════════════════════════════════════════

    -- Supino Reto: warmup + 3 normal
    ('b1010001-0001-4000-a001-000000000001'::uuid, 'a1110001-0001-4000-a001-000000000001'::uuid, 0, 'warmup', 40.00, 14, 12, 15),
    ('b1010001-0001-4000-a001-000000000002'::uuid, 'a1110001-0001-4000-a001-000000000001'::uuid, 1, 'normal', 82.00, 10,  8, 12),
    ('b1010001-0001-4000-a001-000000000003'::uuid, 'a1110001-0001-4000-a001-000000000001'::uuid, 2, 'normal', 82.00,  9,  8, 12),
    ('b1010001-0001-4000-a001-000000000004'::uuid, 'a1110001-0001-4000-a001-000000000001'::uuid, 3, 'normal', 82.00,  8,  8, 12),
    -- Supino Inclinado (biset)
    ('b1010001-0001-4000-a001-000000000005'::uuid, 'a1110001-0001-4000-a001-000000000002'::uuid, 0, 'normal', 62.00, 12, 10, 15),
    ('b1010001-0001-4000-a001-000000000006'::uuid, 'a1110001-0001-4000-a001-000000000002'::uuid, 1, 'normal', 62.00, 11, 10, 15),
    ('b1010001-0001-4000-a001-000000000007'::uuid, 'a1110001-0001-4000-a001-000000000002'::uuid, 2, 'normal', 62.00, 10, 10, 15),
    -- Tríceps Corda (biset)
    ('b1010001-0001-4000-a001-000000000008'::uuid, 'a1110001-0001-4000-a001-000000000003'::uuid, 0, 'normal', 30.00, 14, 12, 15),
    ('b1010001-0001-4000-a001-000000000009'::uuid, 'a1110001-0001-4000-a001-000000000003'::uuid, 1, 'normal', 30.00, 13, 12, 15),
    ('b1010001-0001-4000-a001-00000000000a'::uuid, 'a1110001-0001-4000-a001-000000000003'::uuid, 2, 'normal', 30.00, 13, 12, 15),

    -- ════════════════════════════════════════════════
    -- wl012: Lucas Treino A — sessão 4 (82 kg, reps fora da faixa)
    -- ════════════════════════════════════════════════

    -- Supino Reto: warmup + 3 normal (one set below range: 7 reps)
    ('b1020001-0001-4000-a001-000000000001'::uuid, 'a1110002-0001-4000-a001-000000000001'::uuid, 0, 'warmup', 40.00, 13, 12, 15),
    ('b1020001-0001-4000-a001-000000000002'::uuid, 'a1110002-0001-4000-a001-000000000001'::uuid, 1, 'normal', 85.00,  9,  8, 12),
    ('b1020001-0001-4000-a001-000000000003'::uuid, 'a1110002-0001-4000-a001-000000000001'::uuid, 2, 'normal', 85.00,  7,  8, 12),
    ('b1020001-0001-4000-a001-000000000004'::uuid, 'a1110002-0001-4000-a001-000000000001'::uuid, 3, 'normal', 85.00,  8,  8, 12),
    -- Supino Inclinado (biset) — one set above range: 16 reps
    ('b1020001-0001-4000-a001-000000000005'::uuid, 'a1110002-0001-4000-a001-000000000002'::uuid, 0, 'normal', 55.00, 16, 10, 15),
    ('b1020001-0001-4000-a001-000000000006'::uuid, 'a1110002-0001-4000-a001-000000000002'::uuid, 1, 'normal', 55.00, 14, 10, 15),
    ('b1020001-0001-4000-a001-000000000007'::uuid, 'a1110002-0001-4000-a001-000000000002'::uuid, 2, 'normal', 55.00, 13, 10, 15),
    -- Tríceps Corda (biset) — one set below range: 11 reps
    ('b1020001-0001-4000-a001-000000000008'::uuid, 'a1110002-0001-4000-a001-000000000003'::uuid, 0, 'normal', 32.00, 11, 12, 15),
    ('b1020001-0001-4000-a001-000000000009'::uuid, 'a1110002-0001-4000-a001-000000000003'::uuid, 1, 'normal', 32.00, 13, 12, 15),
    ('b1020001-0001-4000-a001-00000000000a'::uuid, 'a1110002-0001-4000-a001-000000000003'::uuid, 2, 'normal', 32.00, 12, 12, 15),

    -- ════════════════════════════════════════════════
    -- wl013: Lucas Treino A — sessão 5 (85 kg, strong session)
    -- ════════════════════════════════════════════════

    -- Supino Reto: warmup + 3 normal
    ('b1030001-0001-4000-a001-000000000001'::uuid, 'a1110003-0001-4000-a001-000000000001'::uuid, 0, 'warmup', 45.00, 12, 12, 15),
    ('b1030001-0001-4000-a001-000000000002'::uuid, 'a1110003-0001-4000-a001-000000000001'::uuid, 1, 'normal', 85.00, 11,  8, 12),
    ('b1030001-0001-4000-a001-000000000003'::uuid, 'a1110003-0001-4000-a001-000000000001'::uuid, 2, 'normal', 85.00, 10,  8, 12),
    ('b1030001-0001-4000-a001-000000000004'::uuid, 'a1110003-0001-4000-a001-000000000001'::uuid, 3, 'normal', 85.00, 10,  8, 12),
    -- Supino Inclinado (biset)
    ('b1030001-0001-4000-a001-000000000005'::uuid, 'a1110003-0001-4000-a001-000000000002'::uuid, 0, 'normal', 62.00, 14, 10, 15),
    ('b1030001-0001-4000-a001-000000000006'::uuid, 'a1110003-0001-4000-a001-000000000002'::uuid, 1, 'normal', 62.00, 13, 10, 15),
    ('b1030001-0001-4000-a001-000000000007'::uuid, 'a1110003-0001-4000-a001-000000000002'::uuid, 2, 'normal', 62.00, 12, 10, 15),
    -- Tríceps Corda (biset)
    ('b1030001-0001-4000-a001-000000000008'::uuid, 'a1110003-0001-4000-a001-000000000003'::uuid, 0, 'normal', 32.00, 15, 12, 15),
    ('b1030001-0001-4000-a001-000000000009'::uuid, 'a1110003-0001-4000-a001-000000000003'::uuid, 1, 'normal', 32.00, 14, 12, 15),
    ('b1030001-0001-4000-a001-00000000000a'::uuid, 'a1110003-0001-4000-a001-000000000003'::uuid, 2, 'normal', 32.00, 14, 12, 15),

    -- ════════════════════════════════════════════════
    -- wl014: Lucas Treino A — sessão 6 (skips biset, only Supino Reto 87 kg)
    -- ════════════════════════════════════════════════

    -- Supino Reto: warmup + 3 normal
    ('b1040001-0001-4000-a001-000000000001'::uuid, 'a1110004-0001-4000-a001-000000000001'::uuid, 0, 'warmup', 45.00, 13, 12, 15),
    ('b1040001-0001-4000-a001-000000000002'::uuid, 'a1110004-0001-4000-a001-000000000001'::uuid, 1, 'normal', 87.00, 10,  8, 12),
    ('b1040001-0001-4000-a001-000000000003'::uuid, 'a1110004-0001-4000-a001-000000000001'::uuid, 2, 'normal', 87.00,  9,  8, 12),
    ('b1040001-0001-4000-a001-000000000004'::uuid, 'a1110004-0001-4000-a001-000000000001'::uuid, 3, 'normal', 87.00,  8,  8, 12),

    -- ════════════════════════════════════════════════
    -- wl002: Lucas Treino B — sessão 1
    -- ════════════════════════════════════════════════

    -- Puxada na Barra Fixa: warmup + 3 normal (range 6-10)
    ('5ae62253-3339-4683-8daa-dc52b4c66956'::uuid, '21d44743-a3a2-464f-8a48-ac5c00b47cad'::uuid, 0, 'warmup', NULL,  5,  5,  8),
    ('a6d5be76-3a7d-402c-9734-dc82a8fdca9c'::uuid, '21d44743-a3a2-464f-8a48-ac5c00b47cad'::uuid, 1, 'normal', NULL,  8,  6, 10),
    ('f3c11043-988f-4616-8607-e0a6dc69539b'::uuid, '21d44743-a3a2-464f-8a48-ac5c00b47cad'::uuid, 2, 'normal', NULL,  9,  6, 10),
    ('2b073af6-cc46-4a47-af01-79e6d8f13e83'::uuid, '21d44743-a3a2-464f-8a48-ac5c00b47cad'::uuid, 3, 'normal', NULL,  9,  6, 10),
    -- Remada Sentada no Cabo — 3 normal (range 10-12)
    ('eb7307d4-6b0f-47c3-b65a-3287fa1c1938'::uuid, 'abc9cd53-bf72-46d1-ab3c-b8c1562bc0c5'::uuid, 0, 'normal', 45.00, 10, 10, 12),
    ('fa76348a-f968-432e-86b3-57928d4a262c'::uuid, 'abc9cd53-bf72-46d1-ab3c-b8c1562bc0c5'::uuid, 1, 'normal', 45.00, 11, 10, 12),
    ('2254b3e9-ebd8-4841-bdd2-a24066f4c5f7'::uuid, 'abc9cd53-bf72-46d1-ab3c-b8c1562bc0c5'::uuid, 2, 'normal', 45.00, 10, 10, 12),
    -- Puxada Frontal no Cabo (biset) — 3 normal (range 10-15)
    ('38371d9e-c34d-463b-be42-b67f93561caa'::uuid, '140ecc09-fafe-48aa-b8c7-36c014243ce1'::uuid, 0, 'normal', 42.00, 13, 10, 15),
    ('4bf6b01e-6f65-40c6-8781-c9ce305b3212'::uuid, '140ecc09-fafe-48aa-b8c7-36c014243ce1'::uuid, 1, 'normal', 42.00, 14, 10, 15),
    ('497364b4-5bf2-445c-a76f-1c649942b080'::uuid, '140ecc09-fafe-48aa-b8c7-36c014243ce1'::uuid, 2, 'normal', 42.00, 13, 10, 15),
    -- Rosca Direta (biset) — 3 normal (range 10-12)
    ('7cda7c94-746e-4229-bd5a-4c8720b48ebd'::uuid, '6959cef5-7f38-41a6-923c-aa29c29a91da'::uuid, 0, 'normal', 22.00, 11, 10, 12),
    ('7d4bce9c-9507-4abf-b519-cfdd3d929e57'::uuid, '6959cef5-7f38-41a6-923c-aa29c29a91da'::uuid, 1, 'normal', 22.00, 11, 10, 12),
    ('03cae84c-f231-466d-9207-e2a81cffb1f9'::uuid, '6959cef5-7f38-41a6-923c-aa29c29a91da'::uuid, 2, 'normal', 22.00, 12, 10, 12),

    -- ════════════════════════════════════════════════
    -- wl004: Lucas Treino B — sessão 2
    -- ════════════════════════════════════════════════

    -- Puxada na Barra Fixa: warmup + 3 normal
    ('107facfd-1753-4edb-a7df-0524d36b68d1'::uuid, '25d76453-1dcc-46e3-b0ed-e59f0700bd49'::uuid, 0, 'warmup', NULL,  5,  5,  8),
    ('38e7a836-f79f-400e-a186-84a6d057691b'::uuid, '25d76453-1dcc-46e3-b0ed-e59f0700bd49'::uuid, 1, 'normal', NULL,  9,  6, 10),
    ('70356d9d-c2f6-425b-97d7-8e33f38b34ae'::uuid, '25d76453-1dcc-46e3-b0ed-e59f0700bd49'::uuid, 2, 'normal', NULL, 10,  6, 10),
    ('aa22c8c1-2375-4aa2-bfef-959e6caf07d3'::uuid, '25d76453-1dcc-46e3-b0ed-e59f0700bd49'::uuid, 3, 'normal', NULL, 10,  6, 10),
    -- Remada Sentada no Cabo — 3 normal
    ('51f53438-9221-4156-9d35-79db0f65de0e'::uuid, 'cb17a3af-a346-46a8-aa71-bee25254fad5'::uuid, 0, 'normal', 50.00, 12, 10, 12),
    ('af4e1f57-d4b4-4b09-8298-9204e36cf5e6'::uuid, 'cb17a3af-a346-46a8-aa71-bee25254fad5'::uuid, 1, 'normal', 50.00, 11, 10, 12),
    ('9bfb339f-f003-43be-92f5-3beebb18cbfc'::uuid, 'cb17a3af-a346-46a8-aa71-bee25254fad5'::uuid, 2, 'normal', 50.00, 12, 10, 12),
    -- Puxada Frontal no Cabo (biset) — 3 normal
    ('911fde84-42ed-44cf-b339-b334698ab82c'::uuid, '822afae6-29d9-4f16-af94-2d6b14d17180'::uuid, 0, 'normal', 45.00, 15, 10, 15),
    ('5e366006-4d57-4689-80a9-63b6d93e332b'::uuid, '822afae6-29d9-4f16-af94-2d6b14d17180'::uuid, 1, 'normal', 45.00, 14, 10, 15),
    ('27dc5082-34fa-468f-82da-cff946784692'::uuid, '822afae6-29d9-4f16-af94-2d6b14d17180'::uuid, 2, 'normal', 45.00, 14, 10, 15),
    -- Rosca Direta (biset) — 3 normal
    ('f6e53e58-4a99-4107-9b1f-078d86d4bdb0'::uuid, '0d8a8864-bac8-4080-878a-3027c9e0cf41'::uuid, 0, 'normal', 25.00, 12, 10, 12),
    ('36f75c95-ae95-439e-9419-79021ea51f8c'::uuid, '0d8a8864-bac8-4080-878a-3027c9e0cf41'::uuid, 1, 'normal', 25.00, 12, 10, 12),
    ('6b9967e0-ab27-4889-89e3-c7e25bcf243d'::uuid, '0d8a8864-bac8-4080-878a-3027c9e0cf41'::uuid, 2, 'normal', 25.00, 12, 10, 12),

    -- ════════════════════════════════════════════════
    -- wl015: Lucas Treino B — sessão 3
    -- ════════════════════════════════════════════════

    -- Puxada na Barra Fixa: warmup + 3 normal
    ('b2010001-0001-4000-a001-000000000001'::uuid, 'a2220001-0001-4000-a001-000000000001'::uuid, 0, 'warmup', NULL,  6,  5,  8),
    ('b2010001-0001-4000-a001-000000000002'::uuid, 'a2220001-0001-4000-a001-000000000001'::uuid, 1, 'normal', NULL,  9,  6, 10),
    ('b2010001-0001-4000-a001-000000000003'::uuid, 'a2220001-0001-4000-a001-000000000001'::uuid, 2, 'normal', NULL, 10,  6, 10),
    ('b2010001-0001-4000-a001-000000000004'::uuid, 'a2220001-0001-4000-a001-000000000001'::uuid, 3, 'normal', NULL,  8,  6, 10),
    -- Remada Sentada no Cabo — 3 normal
    ('b2010001-0001-4000-a001-000000000005'::uuid, 'a2220001-0001-4000-a001-000000000002'::uuid, 0, 'normal', 47.00, 11, 10, 12),
    ('b2010001-0001-4000-a001-000000000006'::uuid, 'a2220001-0001-4000-a001-000000000002'::uuid, 1, 'normal', 47.00, 10, 10, 12),
    ('b2010001-0001-4000-a001-000000000007'::uuid, 'a2220001-0001-4000-a001-000000000002'::uuid, 2, 'normal', 47.00, 11, 10, 12),
    -- Puxada Frontal no Cabo (biset)
    ('b2010001-0001-4000-a001-000000000008'::uuid, 'a2220001-0001-4000-a001-000000000003'::uuid, 0, 'normal', 43.00, 14, 10, 15),
    ('b2010001-0001-4000-a001-000000000009'::uuid, 'a2220001-0001-4000-a001-000000000003'::uuid, 1, 'normal', 43.00, 13, 10, 15),
    ('b2010001-0001-4000-a001-00000000000a'::uuid, 'a2220001-0001-4000-a001-000000000003'::uuid, 2, 'normal', 43.00, 12, 10, 15),
    -- Rosca Direta (biset)
    ('b2010001-0001-4000-a001-00000000000b'::uuid, 'a2220001-0001-4000-a001-000000000004'::uuid, 0, 'normal', 23.00, 11, 10, 12),
    ('b2010001-0001-4000-a001-00000000000c'::uuid, 'a2220001-0001-4000-a001-000000000004'::uuid, 1, 'normal', 23.00, 10, 10, 12),
    ('b2010001-0001-4000-a001-00000000000d'::uuid, 'a2220001-0001-4000-a001-000000000004'::uuid, 2, 'normal', 23.00, 12, 10, 12),

    -- ════════════════════════════════════════════════
    -- wl016: Lucas Treino B — sessão 4 (fora da faixa em rosca)
    -- ════════════════════════════════════════════════

    -- Puxada na Barra Fixa: warmup + 3 normal
    ('b2020001-0001-4000-a001-000000000001'::uuid, 'a2220002-0001-4000-a001-000000000001'::uuid, 0, 'warmup', NULL,  7,  5,  8),
    ('b2020001-0001-4000-a001-000000000002'::uuid, 'a2220002-0001-4000-a001-000000000001'::uuid, 1, 'normal', NULL, 10,  6, 10),
    ('b2020001-0001-4000-a001-000000000003'::uuid, 'a2220002-0001-4000-a001-000000000001'::uuid, 2, 'normal', NULL,  9,  6, 10),
    ('b2020001-0001-4000-a001-000000000004'::uuid, 'a2220002-0001-4000-a001-000000000001'::uuid, 3, 'normal', NULL,  8,  6, 10),
    -- Remada Sentada no Cabo
    ('b2020001-0001-4000-a001-000000000005'::uuid, 'a2220002-0001-4000-a001-000000000002'::uuid, 0, 'normal', 50.00, 12, 10, 12),
    ('b2020001-0001-4000-a001-000000000006'::uuid, 'a2220002-0001-4000-a001-000000000002'::uuid, 1, 'normal', 50.00, 11, 10, 12),
    ('b2020001-0001-4000-a001-000000000007'::uuid, 'a2220002-0001-4000-a001-000000000002'::uuid, 2, 'normal', 50.00, 10, 10, 12),
    -- Puxada Frontal no Cabo (biset)
    ('b2020001-0001-4000-a001-000000000008'::uuid, 'a2220002-0001-4000-a001-000000000003'::uuid, 0, 'normal', 45.00, 14, 10, 15),
    ('b2020001-0001-4000-a001-000000000009'::uuid, 'a2220002-0001-4000-a001-000000000003'::uuid, 1, 'normal', 45.00, 13, 10, 15),
    ('b2020001-0001-4000-a001-00000000000a'::uuid, 'a2220002-0001-4000-a001-000000000003'::uuid, 2, 'normal', 45.00, 15, 10, 15),
    -- Rosca Direta (biset) — reps=9 below range 10-12
    ('b2020001-0001-4000-a001-00000000000b'::uuid, 'a2220002-0001-4000-a001-000000000004'::uuid, 0, 'normal', 26.00,  9, 10, 12),
    ('b2020001-0001-4000-a001-00000000000c'::uuid, 'a2220002-0001-4000-a001-000000000004'::uuid, 1, 'normal', 26.00, 10, 10, 12),
    ('b2020001-0001-4000-a001-00000000000d'::uuid, 'a2220002-0001-4000-a001-000000000004'::uuid, 2, 'normal', 26.00, 11, 10, 12),

    -- ════════════════════════════════════════════════
    -- wl017: Lucas Treino B — sessão 5 (skips Remada)
    -- ════════════════════════════════════════════════

    -- Puxada na Barra Fixa: warmup + 3 normal
    ('b2030001-0001-4000-a001-000000000001'::uuid, 'a2220003-0001-4000-a001-000000000001'::uuid, 0, 'warmup', NULL,  7,  5,  8),
    ('b2030001-0001-4000-a001-000000000002'::uuid, 'a2220003-0001-4000-a001-000000000001'::uuid, 1, 'normal', NULL, 10,  6, 10),
    ('b2030001-0001-4000-a001-000000000003'::uuid, 'a2220003-0001-4000-a001-000000000001'::uuid, 2, 'normal', NULL, 10,  6, 10),
    ('b2030001-0001-4000-a001-000000000004'::uuid, 'a2220003-0001-4000-a001-000000000001'::uuid, 3, 'normal', NULL, 11,  6, 10),
    -- Puxada Frontal no Cabo (biset) — reps=16 above range
    ('b2030001-0001-4000-a001-000000000005'::uuid, 'a2220003-0001-4000-a001-000000000003'::uuid, 0, 'normal', 42.00, 16, 10, 15),
    ('b2030001-0001-4000-a001-000000000006'::uuid, 'a2220003-0001-4000-a001-000000000003'::uuid, 1, 'normal', 42.00, 14, 10, 15),
    ('b2030001-0001-4000-a001-000000000007'::uuid, 'a2220003-0001-4000-a001-000000000003'::uuid, 2, 'normal', 42.00, 13, 10, 15),
    -- Rosca Direta (biset)
    ('b2030001-0001-4000-a001-000000000008'::uuid, 'a2220003-0001-4000-a001-000000000004'::uuid, 0, 'normal', 25.00, 12, 10, 12),
    ('b2030001-0001-4000-a001-000000000009'::uuid, 'a2220003-0001-4000-a001-000000000004'::uuid, 1, 'normal', 25.00, 11, 10, 12),
    ('b2030001-0001-4000-a001-00000000000a'::uuid, 'a2220003-0001-4000-a001-000000000004'::uuid, 2, 'normal', 25.00, 10, 10, 12),

    -- ════════════════════════════════════════════════
    -- wl018: Lucas Treino B — sessão 6 (PR session)
    -- ════════════════════════════════════════════════

    -- Puxada na Barra Fixa: warmup + 3 normal (PR: 11 reps - above range)
    ('b2040001-0001-4000-a001-000000000001'::uuid, 'a2220004-0001-4000-a001-000000000001'::uuid, 0, 'warmup', NULL,  8,  5,  8),
    ('b2040001-0001-4000-a001-000000000002'::uuid, 'a2220004-0001-4000-a001-000000000001'::uuid, 1, 'normal', NULL, 11,  6, 10),
    ('b2040001-0001-4000-a001-000000000003'::uuid, 'a2220004-0001-4000-a001-000000000001'::uuid, 2, 'normal', NULL, 10,  6, 10),
    ('b2040001-0001-4000-a001-000000000004'::uuid, 'a2220004-0001-4000-a001-000000000001'::uuid, 3, 'normal', NULL, 10,  6, 10),
    -- Remada Sentada no Cabo (PR 55 kg)
    ('b2040001-0001-4000-a001-000000000005'::uuid, 'a2220004-0001-4000-a001-000000000002'::uuid, 0, 'normal', 55.00, 12, 10, 12),
    ('b2040001-0001-4000-a001-000000000006'::uuid, 'a2220004-0001-4000-a001-000000000002'::uuid, 1, 'normal', 55.00, 11, 10, 12),
    ('b2040001-0001-4000-a001-000000000007'::uuid, 'a2220004-0001-4000-a001-000000000002'::uuid, 2, 'normal', 55.00, 10, 10, 12),
    -- Puxada Frontal no Cabo (biset)
    ('b2040001-0001-4000-a001-000000000008'::uuid, 'a2220004-0001-4000-a001-000000000003'::uuid, 0, 'normal', 48.00, 14, 10, 15),
    ('b2040001-0001-4000-a001-000000000009'::uuid, 'a2220004-0001-4000-a001-000000000003'::uuid, 1, 'normal', 48.00, 13, 10, 15),
    ('b2040001-0001-4000-a001-00000000000a'::uuid, 'a2220004-0001-4000-a001-000000000003'::uuid, 2, 'normal', 48.00, 12, 10, 15),
    -- Rosca Direta (biset)
    ('b2040001-0001-4000-a001-00000000000b'::uuid, 'a2220004-0001-4000-a001-000000000004'::uuid, 0, 'normal', 27.00, 12, 10, 12),
    ('b2040001-0001-4000-a001-00000000000c'::uuid, 'a2220004-0001-4000-a001-000000000004'::uuid, 1, 'normal', 27.00, 11, 10, 12),
    ('b2040001-0001-4000-a001-00000000000d'::uuid, 'a2220004-0001-4000-a001-000000000004'::uuid, 2, 'normal', 27.00, 12, 10, 12),

    -- ════════════════════════════════════════════════
    -- wl005: Fernanda — sessão 1 (50 kg agachamento)
    -- ════════════════════════════════════════════════

    -- Agachamento: warmup + 4 normal (range 8-12)
    ('672e6ec0-5bb9-4eae-b5fa-862a214b3c33'::uuid, '194ec4de-ce8b-4597-b437-0c36393baac1'::uuid, 0, 'warmup', 30.00, 15, 12, 15),
    ('51c6794f-f541-4c94-a481-27df7c3411cd'::uuid, '194ec4de-ce8b-4597-b437-0c36393baac1'::uuid, 1, 'normal', 50.00, 10,  8, 12),
    ('8d0961a4-1734-4199-a542-34e7258f57e5'::uuid, '194ec4de-ce8b-4597-b437-0c36393baac1'::uuid, 2, 'normal', 50.00, 11,  8, 12),
    ('7592d949-f652-4da4-b39c-2211a16de9fa'::uuid, '194ec4de-ce8b-4597-b437-0c36393baac1'::uuid, 3, 'normal', 50.00, 10,  8, 12),
    ('2ca260cc-068d-4b0c-89a5-167aea3899b5'::uuid, '194ec4de-ce8b-4597-b437-0c36393baac1'::uuid, 4, 'normal', 55.00,  9,  8, 12),
    -- Leg Press — 3 normal (range 10-15)
    ('33548d71-9bb9-4ac6-8cd0-e283c93dfb4d'::uuid, '8e645813-67bd-4237-b07a-61c1754f4855'::uuid, 0, 'normal', 90.00, 13, 10, 15),
    ('6180ff8b-2d56-424a-aa84-afca82f4cf56'::uuid, '8e645813-67bd-4237-b07a-61c1754f4855'::uuid, 1, 'normal', 90.00, 14, 10, 15),
    ('99da7d79-318b-418b-a154-8d3c25cab333'::uuid, '8e645813-67bd-4237-b07a-61c1754f4855'::uuid, 2, 'normal', 90.00, 13, 10, 15),
    -- Mesa Flexora (biset) — 3 normal (range 10-15)
    ('1d3a97ef-c9ea-4e78-be1a-88db34edce86'::uuid, 'b1edc853-8859-4271-8a47-2c4f58b919f2'::uuid, 0, 'normal', 22.00, 13, 10, 15),
    ('2179e3fe-5983-44ee-b050-59634219e5e7'::uuid, 'b1edc853-8859-4271-8a47-2c4f58b919f2'::uuid, 1, 'normal', 22.00, 13, 10, 15),
    ('987b97ad-09db-42a0-a693-365615b9bfd9'::uuid, 'b1edc853-8859-4271-8a47-2c4f58b919f2'::uuid, 2, 'normal', 22.00, 14, 10, 15),
    -- Elevação Pélvica (biset) — 3 normal (range 12-15)
    ('e85942cd-6463-4566-90a5-3eada9f4772f'::uuid, '6e8f26a7-ac30-4f79-a254-a12387857682'::uuid, 0, 'normal', 35.00, 13, 12, 15),
    ('26bbe0ab-1288-4c6f-b42d-692e6c8705ac'::uuid, '6e8f26a7-ac30-4f79-a254-a12387857682'::uuid, 1, 'normal', 35.00, 14, 12, 15),
    ('3de099c4-40b0-41fb-b823-5fd19eb1d8bc'::uuid, '6e8f26a7-ac30-4f79-a254-a12387857682'::uuid, 2, 'normal', 35.00, 13, 12, 15),

    -- ════════════════════════════════════════════════
    -- wl006: Fernanda — sessão 2 (PR: 60 kg agachamento)
    -- ════════════════════════════════════════════════

    -- Agachamento: warmup + 4 normal
    ('96322464-818c-4e45-8452-bcc9439510ba'::uuid, '5a5d649f-3aa8-49e3-9314-d2b31dc22f2f'::uuid, 0, 'warmup', 30.00, 15, 12, 15),
    ('98d3646b-d797-42ca-8e89-97e502c4151f'::uuid, '5a5d649f-3aa8-49e3-9314-d2b31dc22f2f'::uuid, 1, 'normal', 60.00, 12,  8, 12),
    ('80d59291-2ea9-46fb-81f9-c9495efdcc94'::uuid, '5a5d649f-3aa8-49e3-9314-d2b31dc22f2f'::uuid, 2, 'normal', 60.00, 11,  8, 12),
    ('fc348258-ee39-4b05-a5ef-f082db586c10'::uuid, '5a5d649f-3aa8-49e3-9314-d2b31dc22f2f'::uuid, 3, 'normal', 60.00, 11,  8, 12),
    ('565b3e14-453e-4fa9-933c-b865a781795b'::uuid, '5a5d649f-3aa8-49e3-9314-d2b31dc22f2f'::uuid, 4, 'normal', 60.00, 10,  8, 12),
    -- Leg Press — 3 normal
    ('1f4caf0f-e4b4-410b-9c1d-c657e3b4a1ae'::uuid, '5728db97-1cde-49f4-bf95-c15249902133'::uuid, 0, 'normal', 100.00, 15, 10, 15),
    ('260bff56-3207-4d19-b7a4-e86603d9e45f'::uuid, '5728db97-1cde-49f4-bf95-c15249902133'::uuid, 1, 'normal', 100.00, 14, 10, 15),
    ('440c915f-86a5-467e-9769-528b67fb9641'::uuid, '5728db97-1cde-49f4-bf95-c15249902133'::uuid, 2, 'normal', 100.00, 14, 10, 15),
    -- Mesa Flexora (biset) — 3 normal
    ('60c0e7dc-512a-4d00-b37e-386d55dc0491'::uuid, '696df333-ee82-437e-aaeb-5629ac2c7cf1'::uuid, 0, 'normal', 25.00, 15, 10, 15),
    ('02c09dc1-0c44-481a-a884-66a870b6d575'::uuid, '696df333-ee82-437e-aaeb-5629ac2c7cf1'::uuid, 1, 'normal', 25.00, 14, 10, 15),
    ('24aee016-826f-4b24-951a-4ed5034d3ee6'::uuid, '696df333-ee82-437e-aaeb-5629ac2c7cf1'::uuid, 2, 'normal', 25.00, 14, 10, 15),
    -- Elevação Pélvica (biset) — 3 normal
    ('fbae4a0d-8dc3-40fa-a485-497ecbdec2b4'::uuid, 'e1ba4250-5c26-4673-8a25-d1c4e7cf81d4'::uuid, 0, 'normal', 40.00, 15, 12, 15),
    ('79676c85-3bc1-4c3b-8556-d93f064f21c3'::uuid, 'e1ba4250-5c26-4673-8a25-d1c4e7cf81d4'::uuid, 1, 'normal', 40.00, 14, 12, 15),
    ('313c188e-e654-4ec0-b174-91f20fac946f'::uuid, 'e1ba4250-5c26-4673-8a25-d1c4e7cf81d4'::uuid, 2, 'normal', 40.00, 14, 12, 15),

    -- ════════════════════════════════════════════════
    -- wl019: Fernanda — sessão 3 (62 kg agachamento)
    -- ════════════════════════════════════════════════

    -- Agachamento: warmup + 4 normal
    ('b3010001-0001-4000-a001-000000000001'::uuid, 'a3330001-0001-4000-a001-000000000001'::uuid, 0, 'warmup', 30.00, 14, 12, 15),
    ('b3010001-0001-4000-a001-000000000002'::uuid, 'a3330001-0001-4000-a001-000000000001'::uuid, 1, 'normal', 62.00, 10,  8, 12),
    ('b3010001-0001-4000-a001-000000000003'::uuid, 'a3330001-0001-4000-a001-000000000001'::uuid, 2, 'normal', 62.00,  9,  8, 12),
    ('b3010001-0001-4000-a001-000000000004'::uuid, 'a3330001-0001-4000-a001-000000000001'::uuid, 3, 'normal', 62.00,  9,  8, 12),
    ('b3010001-0001-4000-a001-000000000005'::uuid, 'a3330001-0001-4000-a001-000000000001'::uuid, 4, 'normal', 62.00,  8,  8, 12),
    -- Leg Press — 3 normal
    ('b3010001-0001-4000-a001-000000000006'::uuid, 'a3330001-0001-4000-a001-000000000002'::uuid, 0, 'normal', 105.00, 12, 10, 15),
    ('b3010001-0001-4000-a001-000000000007'::uuid, 'a3330001-0001-4000-a001-000000000002'::uuid, 1, 'normal', 105.00, 11, 10, 15),
    ('b3010001-0001-4000-a001-000000000008'::uuid, 'a3330001-0001-4000-a001-000000000002'::uuid, 2, 'normal', 105.00, 10, 10, 15),
    -- Mesa Flexora (biset) — 3 normal
    ('b3010001-0001-4000-a001-000000000009'::uuid, 'a3330001-0001-4000-a001-000000000003'::uuid, 0, 'normal', 27.00, 14, 10, 15),
    ('b3010001-0001-4000-a001-00000000000a'::uuid, 'a3330001-0001-4000-a001-000000000003'::uuid, 1, 'normal', 27.00, 13, 10, 15),
    ('b3010001-0001-4000-a001-00000000000b'::uuid, 'a3330001-0001-4000-a001-000000000003'::uuid, 2, 'normal', 27.00, 12, 10, 15),
    -- Elevação Pélvica (biset) — 3 normal
    ('b3010001-0001-4000-a001-00000000000c'::uuid, 'a3330001-0001-4000-a001-000000000004'::uuid, 0, 'normal', 42.00, 14, 12, 15),
    ('b3010001-0001-4000-a001-00000000000d'::uuid, 'a3330001-0001-4000-a001-000000000004'::uuid, 1, 'normal', 42.00, 13, 12, 15),
    ('b3010001-0001-4000-a001-00000000000e'::uuid, 'a3330001-0001-4000-a001-000000000004'::uuid, 2, 'normal', 42.00, 15, 12, 15),

    -- ════════════════════════════════════════════════
    -- wl020: Fernanda — sessão 4 (skips Leg Press, reps fora da faixa)
    -- ════════════════════════════════════════════════

    -- Agachamento: warmup + 4 normal (reps=7 below range)
    ('b3020001-0001-4000-a001-000000000001'::uuid, 'a3330002-0001-4000-a001-000000000001'::uuid, 0, 'warmup', 30.00, 13, 12, 15),
    ('b3020001-0001-4000-a001-000000000002'::uuid, 'a3330002-0001-4000-a001-000000000001'::uuid, 1, 'normal', 65.00,  9,  8, 12),
    ('b3020001-0001-4000-a001-000000000003'::uuid, 'a3330002-0001-4000-a001-000000000001'::uuid, 2, 'normal', 65.00,  8,  8, 12),
    ('b3020001-0001-4000-a001-000000000004'::uuid, 'a3330002-0001-4000-a001-000000000001'::uuid, 3, 'normal', 65.00,  7,  8, 12),
    ('b3020001-0001-4000-a001-000000000005'::uuid, 'a3330002-0001-4000-a001-000000000001'::uuid, 4, 'normal', 65.00,  8,  8, 12),
    -- Mesa Flexora (biset) — 3 normal
    ('b3020001-0001-4000-a001-000000000006'::uuid, 'a3330002-0001-4000-a001-000000000003'::uuid, 0, 'normal', 27.00, 13, 10, 15),
    ('b3020001-0001-4000-a001-000000000007'::uuid, 'a3330002-0001-4000-a001-000000000003'::uuid, 1, 'normal', 27.00, 12, 10, 15),
    ('b3020001-0001-4000-a001-000000000008'::uuid, 'a3330002-0001-4000-a001-000000000003'::uuid, 2, 'normal', 27.00, 14, 10, 15),
    -- Elevação Pélvica (biset) — 3 normal (reps=11 below range 12-15)
    ('b3020001-0001-4000-a001-000000000009'::uuid, 'a3330002-0001-4000-a001-000000000004'::uuid, 0, 'normal', 42.00, 11, 12, 15),
    ('b3020001-0001-4000-a001-00000000000a'::uuid, 'a3330002-0001-4000-a001-000000000004'::uuid, 1, 'normal', 42.00, 13, 12, 15),
    ('b3020001-0001-4000-a001-00000000000b'::uuid, 'a3330002-0001-4000-a001-000000000004'::uuid, 2, 'normal', 42.00, 14, 12, 15),

    -- ════════════════════════════════════════════════
    -- wl021: Fernanda — sessão 5 (65 kg agachamento)
    -- ════════════════════════════════════════════════

    -- Agachamento: warmup + 4 normal
    ('b3030001-0001-4000-a001-000000000001'::uuid, 'a3330003-0001-4000-a001-000000000001'::uuid, 0, 'warmup', 35.00, 12, 12, 15),
    ('b3030001-0001-4000-a001-000000000002'::uuid, 'a3330003-0001-4000-a001-000000000001'::uuid, 1, 'normal', 65.00, 11,  8, 12),
    ('b3030001-0001-4000-a001-000000000003'::uuid, 'a3330003-0001-4000-a001-000000000001'::uuid, 2, 'normal', 65.00, 10,  8, 12),
    ('b3030001-0001-4000-a001-000000000004'::uuid, 'a3330003-0001-4000-a001-000000000001'::uuid, 3, 'normal', 65.00,  9,  8, 12),
    ('b3030001-0001-4000-a001-000000000005'::uuid, 'a3330003-0001-4000-a001-000000000001'::uuid, 4, 'normal', 65.00, 10,  8, 12),
    -- Leg Press — 3 normal
    ('b3030001-0001-4000-a001-000000000006'::uuid, 'a3330003-0001-4000-a001-000000000002'::uuid, 0, 'normal', 110.00, 13, 10, 15),
    ('b3030001-0001-4000-a001-000000000007'::uuid, 'a3330003-0001-4000-a001-000000000002'::uuid, 1, 'normal', 110.00, 12, 10, 15),
    ('b3030001-0001-4000-a001-000000000008'::uuid, 'a3330003-0001-4000-a001-000000000002'::uuid, 2, 'normal', 110.00, 11, 10, 15),
    -- Mesa Flexora (biset) — 3 normal (reps=16 above range)
    ('b3030001-0001-4000-a001-000000000009'::uuid, 'a3330003-0001-4000-a001-000000000003'::uuid, 0, 'normal', 25.00, 16, 10, 15),
    ('b3030001-0001-4000-a001-00000000000a'::uuid, 'a3330003-0001-4000-a001-000000000003'::uuid, 1, 'normal', 25.00, 14, 10, 15),
    ('b3030001-0001-4000-a001-00000000000b'::uuid, 'a3330003-0001-4000-a001-000000000003'::uuid, 2, 'normal', 25.00, 13, 10, 15),
    -- Elevação Pélvica (biset) — 3 normal
    ('b3030001-0001-4000-a001-00000000000c'::uuid, 'a3330003-0001-4000-a001-000000000004'::uuid, 0, 'normal', 45.00, 15, 12, 15),
    ('b3030001-0001-4000-a001-00000000000d'::uuid, 'a3330003-0001-4000-a001-000000000004'::uuid, 1, 'normal', 45.00, 14, 12, 15),
    ('b3030001-0001-4000-a001-00000000000e'::uuid, 'a3330003-0001-4000-a001-000000000004'::uuid, 2, 'normal', 45.00, 13, 12, 15),

    -- ════════════════════════════════════════════════
    -- wl022: Fernanda — sessão 6 (PR: 70 kg agachamento)
    -- ════════════════════════════════════════════════

    -- Agachamento: warmup + 4 normal
    ('b3040001-0001-4000-a001-000000000001'::uuid, 'a3330004-0001-4000-a001-000000000001'::uuid, 0, 'warmup', 35.00, 15, 12, 15),
    ('b3040001-0001-4000-a001-000000000002'::uuid, 'a3330004-0001-4000-a001-000000000001'::uuid, 1, 'normal', 70.00, 10,  8, 12),
    ('b3040001-0001-4000-a001-000000000003'::uuid, 'a3330004-0001-4000-a001-000000000001'::uuid, 2, 'normal', 70.00,  9,  8, 12),
    ('b3040001-0001-4000-a001-000000000004'::uuid, 'a3330004-0001-4000-a001-000000000001'::uuid, 3, 'normal', 70.00,  8,  8, 12),
    ('b3040001-0001-4000-a001-000000000005'::uuid, 'a3330004-0001-4000-a001-000000000001'::uuid, 4, 'normal', 70.00,  8,  8, 12),
    -- Leg Press — 3 normal
    ('b3040001-0001-4000-a001-000000000006'::uuid, 'a3330004-0001-4000-a001-000000000002'::uuid, 0, 'normal', 115.00, 12, 10, 15),
    ('b3040001-0001-4000-a001-000000000007'::uuid, 'a3330004-0001-4000-a001-000000000002'::uuid, 1, 'normal', 115.00, 11, 10, 15),
    ('b3040001-0001-4000-a001-000000000008'::uuid, 'a3330004-0001-4000-a001-000000000002'::uuid, 2, 'normal', 115.00, 10, 10, 15),
    -- Mesa Flexora (biset) — 3 normal
    ('b3040001-0001-4000-a001-000000000009'::uuid, 'a3330004-0001-4000-a001-000000000003'::uuid, 0, 'normal', 28.00, 14, 10, 15),
    ('b3040001-0001-4000-a001-00000000000a'::uuid, 'a3330004-0001-4000-a001-000000000003'::uuid, 1, 'normal', 28.00, 13, 10, 15),
    ('b3040001-0001-4000-a001-00000000000b'::uuid, 'a3330004-0001-4000-a001-000000000003'::uuid, 2, 'normal', 28.00, 15, 10, 15),
    -- Elevação Pélvica (biset) — 3 normal
    ('b3040001-0001-4000-a001-00000000000c'::uuid, 'a3330004-0001-4000-a001-000000000004'::uuid, 0, 'normal', 48.00, 14, 12, 15),
    ('b3040001-0001-4000-a001-00000000000d'::uuid, 'a3330004-0001-4000-a001-000000000004'::uuid, 1, 'normal', 48.00, 15, 12, 15),
    ('b3040001-0001-4000-a001-00000000000e'::uuid, 'a3330004-0001-4000-a001-000000000004'::uuid, 2, 'normal', 48.00, 13, 12, 15),

    -- ════════════════════════════════════════════════
    -- wl007: Rafael Full Body — sessão 1 (com coach)
    -- ════════════════════════════════════════════════

    -- Supino Reto: warmup + 3 normal (range 8-12)
    ('bfc9836c-8adc-47bb-99f0-af31a613bc00'::uuid, 'a9324f5a-9922-47e2-bf51-6e54fe046677'::uuid, 0, 'warmup', 25.00, 15, 12, 15),
    ('fbf350a5-ed3a-4acf-9e9f-02b07067c314'::uuid, 'a9324f5a-9922-47e2-bf51-6e54fe046677'::uuid, 1, 'normal', 45.00, 10,  8, 12),
    ('3c46e87b-408a-4de7-b04e-2d45f95915cb'::uuid, 'a9324f5a-9922-47e2-bf51-6e54fe046677'::uuid, 2, 'normal', 45.00, 10,  8, 12),
    ('c801234f-7a22-4d99-b681-cb975f3d2730'::uuid, 'a9324f5a-9922-47e2-bf51-6e54fe046677'::uuid, 3, 'normal', 45.00, 10,  8, 12),
    -- Agachamento: warmup + 3 normal (range 8-12)
    ('f9dcb182-48c2-4c2e-a5b6-68d017b895d8'::uuid, '65b5d710-68b1-467f-b7db-cd24d60376ea'::uuid, 0, 'warmup', 30.00, 15, 12, 15),
    ('732d1a37-29f2-4712-8571-1d92952dd85c'::uuid, '65b5d710-68b1-467f-b7db-cd24d60376ea'::uuid, 1, 'normal', 50.00, 10,  8, 12),
    ('63a36b6f-483c-4137-9ccf-61b2915a4489'::uuid, '65b5d710-68b1-467f-b7db-cd24d60376ea'::uuid, 2, 'normal', 50.00, 10,  8, 12),
    ('fad3ccb2-6d84-4d3f-86c0-75fa5cb6a978'::uuid, '65b5d710-68b1-467f-b7db-cd24d60376ea'::uuid, 3, 'normal', 50.00, 10,  8, 12),
    -- Remada Sentada no Cabo — 3 normal (range 10-12)
    ('e1f9e48f-01ed-46b7-933e-2afde856d50a'::uuid, 'fa1c30b3-199c-4bee-b1ca-6f93490ba8f4'::uuid, 0, 'normal', 30.00, 10, 10, 12),
    ('04fa1840-926d-4c1d-8e1a-3770101bff9d'::uuid, 'fa1c30b3-199c-4bee-b1ca-6f93490ba8f4'::uuid, 1, 'normal', 30.00, 10, 10, 12),
    ('54fce0bd-ba48-4061-8bf0-300eb6f4b0ff'::uuid, 'fa1c30b3-199c-4bee-b1ca-6f93490ba8f4'::uuid, 2, 'normal', 30.00, 10, 10, 12),
    -- Desenvolvimento Militar: warmup + 3 normal (range 8-12)
    ('eeeaab86-3f24-4547-870c-e4e1b9614ca4'::uuid, '5ef75836-176d-4527-aa6f-eb68cf3b5ed2'::uuid, 0, 'warmup', 15.00, 15, 12, 15),
    ('aca9f463-5e4c-442e-8276-68f6d1080e1b'::uuid, '5ef75836-176d-4527-aa6f-eb68cf3b5ed2'::uuid, 1, 'normal', 25.00,  9,  8, 12),
    ('09ee8329-649e-4739-aafe-80bc1b2e6669'::uuid, '5ef75836-176d-4527-aa6f-eb68cf3b5ed2'::uuid, 2, 'normal', 25.00, 10,  8, 12),
    ('e3710fb5-846e-4e04-9047-32b8c21e5a21'::uuid, '5ef75836-176d-4527-aa6f-eb68cf3b5ed2'::uuid, 3, 'normal', 25.00,  9,  8, 12),

    -- ════════════════════════════════════════════════
    -- wl008: Rafael Full Body — sessão 2 (PRs)
    -- ════════════════════════════════════════════════

    -- Supino Reto: warmup + 3 normal
    ('29b3bcd7-d2ee-43c3-9020-22bee0cd77b0'::uuid, '1e1fff87-731b-4b65-a1b7-979ad31fc489'::uuid, 0, 'warmup', 25.00, 15, 12, 15),
    ('2b64813b-9ec6-4033-a092-34e15a487c04'::uuid, '1e1fff87-731b-4b65-a1b7-979ad31fc489'::uuid, 1, 'normal', 50.00, 12,  8, 12),
    ('ae87dcdb-8e2f-45f6-bb31-140e1f453e77'::uuid, '1e1fff87-731b-4b65-a1b7-979ad31fc489'::uuid, 2, 'normal', 50.00, 11,  8, 12),
    ('f2e26a6c-3c1f-4d84-91ef-ccaca2575b3c'::uuid, '1e1fff87-731b-4b65-a1b7-979ad31fc489'::uuid, 3, 'normal', 50.00, 11,  8, 12),
    -- Agachamento: warmup + 3 normal
    ('5a39c434-fb09-4426-b598-c849bb468baf'::uuid, 'fb4c66b9-ff9b-45da-b2a8-3dfe2e6693e4'::uuid, 0, 'warmup', 30.00, 15, 12, 15),
    ('790735ef-8612-4907-843d-9951d14b7363'::uuid, 'fb4c66b9-ff9b-45da-b2a8-3dfe2e6693e4'::uuid, 1, 'normal', 60.00, 12,  8, 12),
    ('52c4d311-a9a5-4fbc-a926-716a694463bc'::uuid, 'fb4c66b9-ff9b-45da-b2a8-3dfe2e6693e4'::uuid, 2, 'normal', 60.00, 11,  8, 12),
    ('55d6cbc5-2352-4ba6-9f3b-f3d2210a77f9'::uuid, 'fb4c66b9-ff9b-45da-b2a8-3dfe2e6693e4'::uuid, 3, 'normal', 60.00, 10,  8, 12),
    -- Remada Sentada no Cabo — 3 normal
    ('9af89246-8cec-4fa5-a4c7-731650e5c235'::uuid, 'cbe92783-197e-4097-abbd-8b4bf0af23e7'::uuid, 0, 'normal', 35.00, 12, 10, 12),
    ('c37c8588-7265-40c5-b0bd-34c61a6b9f1e'::uuid, 'cbe92783-197e-4097-abbd-8b4bf0af23e7'::uuid, 1, 'normal', 35.00, 11, 10, 12),
    ('174f71de-d466-4bbd-a29c-276b513f8669'::uuid, 'cbe92783-197e-4097-abbd-8b4bf0af23e7'::uuid, 2, 'normal', 35.00, 12, 10, 12),
    -- Desenvolvimento Militar: warmup + 3 normal
    ('410a6f0e-27fa-4af3-9ee0-029461db5ad6'::uuid, 'c01ca9d1-7550-4192-9ccb-d123edfc6104'::uuid, 0, 'warmup', 15.00, 15, 12, 15),
    ('098183c4-48a2-4649-a6da-5c4a5f84b8c6'::uuid, 'c01ca9d1-7550-4192-9ccb-d123edfc6104'::uuid, 1, 'normal', 30.00, 12,  8, 12),
    ('97682d40-52cd-487b-b2f8-3308ec638e64'::uuid, 'c01ca9d1-7550-4192-9ccb-d123edfc6104'::uuid, 2, 'normal', 30.00, 10,  8, 12),
    ('4bb69391-5616-409d-b899-c1054e7e962b'::uuid, 'c01ca9d1-7550-4192-9ccb-d123edfc6104'::uuid, 3, 'normal', 30.00, 10,  8, 12),

    -- ════════════════════════════════════════════════
    -- wl023: Rafael Full Body — sessão 3 (progressive)
    -- ════════════════════════════════════════════════

    -- Supino Reto: warmup + 3 normal
    ('b4010001-0001-4000-a001-000000000001'::uuid, 'a4440001-0001-4000-a001-000000000001'::uuid, 0, 'warmup', 25.00, 14, 12, 15),
    ('b4010001-0001-4000-a001-000000000002'::uuid, 'a4440001-0001-4000-a001-000000000001'::uuid, 1, 'normal', 52.00, 10,  8, 12),
    ('b4010001-0001-4000-a001-000000000003'::uuid, 'a4440001-0001-4000-a001-000000000001'::uuid, 2, 'normal', 52.00,  9,  8, 12),
    ('b4010001-0001-4000-a001-000000000004'::uuid, 'a4440001-0001-4000-a001-000000000001'::uuid, 3, 'normal', 52.00,  9,  8, 12),
    -- Agachamento: warmup + 3 normal
    ('b4010001-0001-4000-a001-000000000005'::uuid, 'a4440001-0001-4000-a001-000000000002'::uuid, 0, 'warmup', 30.00, 14, 12, 15),
    ('b4010001-0001-4000-a001-000000000006'::uuid, 'a4440001-0001-4000-a001-000000000002'::uuid, 1, 'normal', 62.00, 10,  8, 12),
    ('b4010001-0001-4000-a001-000000000007'::uuid, 'a4440001-0001-4000-a001-000000000002'::uuid, 2, 'normal', 62.00,  9,  8, 12),
    ('b4010001-0001-4000-a001-000000000008'::uuid, 'a4440001-0001-4000-a001-000000000002'::uuid, 3, 'normal', 62.00, 10,  8, 12),
    -- Remada Sentada no Cabo — 3 normal
    ('b4010001-0001-4000-a001-000000000009'::uuid, 'a4440001-0001-4000-a001-000000000003'::uuid, 0, 'normal', 37.00, 11, 10, 12),
    ('b4010001-0001-4000-a001-00000000000a'::uuid, 'a4440001-0001-4000-a001-000000000003'::uuid, 1, 'normal', 37.00, 10, 10, 12),
    ('b4010001-0001-4000-a001-00000000000b'::uuid, 'a4440001-0001-4000-a001-000000000003'::uuid, 2, 'normal', 37.00, 11, 10, 12),
    -- Desenvolvimento Militar: warmup + 3 normal
    ('b4010001-0001-4000-a001-00000000000c'::uuid, 'a4440001-0001-4000-a001-000000000004'::uuid, 0, 'warmup', 15.00, 14, 12, 15),
    ('b4010001-0001-4000-a001-00000000000d'::uuid, 'a4440001-0001-4000-a001-000000000004'::uuid, 1, 'normal', 32.00, 10,  8, 12),
    ('b4010001-0001-4000-a001-00000000000e'::uuid, 'a4440001-0001-4000-a001-000000000004'::uuid, 2, 'normal', 32.00,  9,  8, 12),
    ('b4010001-0001-4000-a001-00000000000f'::uuid, 'a4440001-0001-4000-a001-000000000004'::uuid, 3, 'normal', 32.00, 10,  8, 12),

    -- ════════════════════════════════════════════════
    -- wl024: Rafael Full Body — sessão 4 (skips Desenvolvimento, reps fora)
    -- ════════════════════════════════════════════════

    -- Supino Reto: warmup + 3 normal (reps=7 below range)
    ('b4020001-0001-4000-a001-000000000001'::uuid, 'a4440002-0001-4000-a001-000000000001'::uuid, 0, 'warmup', 30.00, 12, 12, 15),
    ('b4020001-0001-4000-a001-000000000002'::uuid, 'a4440002-0001-4000-a001-000000000001'::uuid, 1, 'normal', 55.00,  9,  8, 12),
    ('b4020001-0001-4000-a001-000000000003'::uuid, 'a4440002-0001-4000-a001-000000000001'::uuid, 2, 'normal', 55.00,  7,  8, 12),
    ('b4020001-0001-4000-a001-000000000004'::uuid, 'a4440002-0001-4000-a001-000000000001'::uuid, 3, 'normal', 55.00,  8,  8, 12),
    -- Agachamento: warmup + 3 normal
    ('b4020001-0001-4000-a001-000000000005'::uuid, 'a4440002-0001-4000-a001-000000000002'::uuid, 0, 'warmup', 30.00, 13, 12, 15),
    ('b4020001-0001-4000-a001-000000000006'::uuid, 'a4440002-0001-4000-a001-000000000002'::uuid, 1, 'normal', 65.00, 10,  8, 12),
    ('b4020001-0001-4000-a001-000000000007'::uuid, 'a4440002-0001-4000-a001-000000000002'::uuid, 2, 'normal', 65.00,  9,  8, 12),
    ('b4020001-0001-4000-a001-000000000008'::uuid, 'a4440002-0001-4000-a001-000000000002'::uuid, 3, 'normal', 65.00,  8,  8, 12),
    -- Remada Sentada no Cabo — 3 normal
    ('b4020001-0001-4000-a001-000000000009'::uuid, 'a4440002-0001-4000-a001-000000000003'::uuid, 0, 'normal', 38.00, 11, 10, 12),
    ('b4020001-0001-4000-a001-00000000000a'::uuid, 'a4440002-0001-4000-a001-000000000003'::uuid, 1, 'normal', 38.00, 10, 10, 12),
    ('b4020001-0001-4000-a001-00000000000b'::uuid, 'a4440002-0001-4000-a001-000000000003'::uuid, 2, 'normal', 38.00, 12, 10, 12),

    -- ════════════════════════════════════════════════
    -- wl025: Rafael Full Body — sessão 5
    -- ════════════════════════════════════════════════

    -- Supino Reto: warmup + 3 normal
    ('b4030001-0001-4000-a001-000000000001'::uuid, 'a4440003-0001-4000-a001-000000000001'::uuid, 0, 'warmup', 30.00, 15, 12, 15),
    ('b4030001-0001-4000-a001-000000000002'::uuid, 'a4440003-0001-4000-a001-000000000001'::uuid, 1, 'normal', 55.00, 11,  8, 12),
    ('b4030001-0001-4000-a001-000000000003'::uuid, 'a4440003-0001-4000-a001-000000000001'::uuid, 2, 'normal', 55.00, 10,  8, 12),
    ('b4030001-0001-4000-a001-000000000004'::uuid, 'a4440003-0001-4000-a001-000000000001'::uuid, 3, 'normal', 55.00, 10,  8, 12),
    -- Agachamento: warmup + 3 normal
    ('b4030001-0001-4000-a001-000000000005'::uuid, 'a4440003-0001-4000-a001-000000000002'::uuid, 0, 'warmup', 35.00, 14, 12, 15),
    ('b4030001-0001-4000-a001-000000000006'::uuid, 'a4440003-0001-4000-a001-000000000002'::uuid, 1, 'normal', 67.00, 10,  8, 12),
    ('b4030001-0001-4000-a001-000000000007'::uuid, 'a4440003-0001-4000-a001-000000000002'::uuid, 2, 'normal', 67.00,  9,  8, 12),
    ('b4030001-0001-4000-a001-000000000008'::uuid, 'a4440003-0001-4000-a001-000000000002'::uuid, 3, 'normal', 67.00,  9,  8, 12),
    -- Remada Sentada no Cabo — 3 normal
    ('b4030001-0001-4000-a001-000000000009'::uuid, 'a4440003-0001-4000-a001-000000000003'::uuid, 0, 'normal', 40.00, 12, 10, 12),
    ('b4030001-0001-4000-a001-00000000000a'::uuid, 'a4440003-0001-4000-a001-000000000003'::uuid, 1, 'normal', 40.00, 11, 10, 12),
    ('b4030001-0001-4000-a001-00000000000b'::uuid, 'a4440003-0001-4000-a001-000000000003'::uuid, 2, 'normal', 40.00, 10, 10, 12),
    -- Desenvolvimento Militar: warmup + 3 normal
    ('b4030001-0001-4000-a001-00000000000c'::uuid, 'a4440003-0001-4000-a001-000000000004'::uuid, 0, 'warmup', 15.00, 13, 12, 15),
    ('b4030001-0001-4000-a001-00000000000d'::uuid, 'a4440003-0001-4000-a001-000000000004'::uuid, 1, 'normal', 35.00, 11,  8, 12),
    ('b4030001-0001-4000-a001-00000000000e'::uuid, 'a4440003-0001-4000-a001-000000000004'::uuid, 2, 'normal', 35.00, 10,  8, 12),
    ('b4030001-0001-4000-a001-00000000000f'::uuid, 'a4440003-0001-4000-a001-000000000004'::uuid, 3, 'normal', 35.00,  9,  8, 12),

    -- ════════════════════════════════════════════════
    -- wl026: Rafael Full Body — sessão 6 (PR session)
    -- ════════════════════════════════════════════════

    -- Supino Reto: warmup + 3 normal (PR 60 kg)
    ('b4040001-0001-4000-a001-000000000001'::uuid, 'a4440004-0001-4000-a001-000000000001'::uuid, 0, 'warmup', 30.00, 15, 12, 15),
    ('b4040001-0001-4000-a001-000000000002'::uuid, 'a4440004-0001-4000-a001-000000000001'::uuid, 1, 'normal', 60.00, 12,  8, 12),
    ('b4040001-0001-4000-a001-000000000003'::uuid, 'a4440004-0001-4000-a001-000000000001'::uuid, 2, 'normal', 60.00, 10,  8, 12),
    ('b4040001-0001-4000-a001-000000000004'::uuid, 'a4440004-0001-4000-a001-000000000001'::uuid, 3, 'normal', 60.00, 10,  8, 12),
    -- Agachamento: warmup + 3 normal (PR 70 kg)
    ('b4040001-0001-4000-a001-000000000005'::uuid, 'a4440004-0001-4000-a001-000000000002'::uuid, 0, 'warmup', 35.00, 14, 12, 15),
    ('b4040001-0001-4000-a001-000000000006'::uuid, 'a4440004-0001-4000-a001-000000000002'::uuid, 1, 'normal', 70.00, 11,  8, 12),
    ('b4040001-0001-4000-a001-000000000007'::uuid, 'a4440004-0001-4000-a001-000000000002'::uuid, 2, 'normal', 70.00, 10,  8, 12),
    ('b4040001-0001-4000-a001-000000000008'::uuid, 'a4440004-0001-4000-a001-000000000002'::uuid, 3, 'normal', 70.00,  9,  8, 12),
    -- Remada Sentada no Cabo (PR 42 kg)
    ('b4040001-0001-4000-a001-000000000009'::uuid, 'a4440004-0001-4000-a001-000000000003'::uuid, 0, 'normal', 42.00, 12, 10, 12),
    ('b4040001-0001-4000-a001-00000000000a'::uuid, 'a4440004-0001-4000-a001-000000000003'::uuid, 1, 'normal', 42.00, 11, 10, 12),
    ('b4040001-0001-4000-a001-00000000000b'::uuid, 'a4440004-0001-4000-a001-000000000003'::uuid, 2, 'normal', 42.00, 12, 10, 12),
    -- Desenvolvimento Militar: warmup + 3 normal (PR 37 kg)
    ('b4040001-0001-4000-a001-00000000000c'::uuid, 'a4440004-0001-4000-a001-000000000004'::uuid, 0, 'warmup', 20.00, 15, 12, 15),
    ('b4040001-0001-4000-a001-00000000000d'::uuid, 'a4440004-0001-4000-a001-000000000004'::uuid, 1, 'normal', 37.00, 12,  8, 12),
    ('b4040001-0001-4000-a001-00000000000e'::uuid, 'a4440004-0001-4000-a001-000000000004'::uuid, 2, 'normal', 37.00, 11,  8, 12),
    ('b4040001-0001-4000-a001-00000000000f'::uuid, 'a4440004-0001-4000-a001-000000000004'::uuid, 3, 'normal', 37.00, 10,  8, 12),

    -- ════════════════════════════════════════════════
    -- wl009: Marcos Treino A — sessão 1
    -- ════════════════════════════════════════════════

    -- Supino Reto: warmup + 4 normal (90 kg, range 8-12)
    ('9e789e4e-a03b-43f5-bbeb-8e4cfabd2f35'::uuid, 'bf43f866-3a33-4242-8a5f-8044b0db12a4'::uuid, 0, 'warmup',  50.00, 15, 12, 15),
    ('2d2ed9c1-ee11-4ae7-81cb-f59ae9f7635d'::uuid, 'bf43f866-3a33-4242-8a5f-8044b0db12a4'::uuid, 1, 'normal',  90.00, 10,  8, 12),
    ('fa5c70b5-bbe0-4cfc-a867-1f162ea6aab5'::uuid, 'bf43f866-3a33-4242-8a5f-8044b0db12a4'::uuid, 2, 'normal',  90.00, 11,  8, 12),
    ('0d97771c-0048-4678-8c72-bf482e9d4c63'::uuid, 'bf43f866-3a33-4242-8a5f-8044b0db12a4'::uuid, 3, 'normal',  90.00, 10,  8, 12),
    ('247328d6-e8e4-494f-ba99-c417d48f64cf'::uuid, 'bf43f866-3a33-4242-8a5f-8044b0db12a4'::uuid, 4, 'normal',  90.00, 10,  8, 12),
    -- Supino Inclinado — 4 normal (75 kg, range 10-15)
    ('7a97878d-3954-44d8-808d-bb5b07cca451'::uuid, '184332cc-9e46-4101-912b-2de76124b902'::uuid, 0, 'normal',  75.00, 13, 10, 15),
    ('1b5c49b2-3e7c-4360-8e45-88ff1a3da441'::uuid, '184332cc-9e46-4101-912b-2de76124b902'::uuid, 1, 'normal',  75.00, 13, 10, 15),
    ('7b5508fa-5f21-4b31-a5e5-99e3201f04cf'::uuid, '184332cc-9e46-4101-912b-2de76124b902'::uuid, 2, 'normal',  75.00, 14, 10, 15),
    ('dd42127d-eeaf-41b7-8b09-b6c2f4ec1af6'::uuid, '184332cc-9e46-4101-912b-2de76124b902'::uuid, 3, 'normal',  75.00, 13, 10, 15),
    -- Desenvolvimento Militar: warmup + 3 normal (55 kg, range 8-12)
    ('bd6134d6-bf49-4d20-9201-87afef1a1139'::uuid, '316d986a-ae32-415c-9f32-adfc6f33535a'::uuid, 0, 'warmup',  30.00, 15, 12, 15),
    ('cf2638dd-e2df-46ea-83b3-38f00380338c'::uuid, '316d986a-ae32-415c-9f32-adfc6f33535a'::uuid, 1, 'normal',  55.00, 10,  8, 12),
    ('6a9d4657-50c9-4bb2-b399-a17a419e9556'::uuid, '316d986a-ae32-415c-9f32-adfc6f33535a'::uuid, 2, 'normal',  55.00, 10,  8, 12),
    ('1fd90eb7-2161-478e-beb5-98619d63f94a'::uuid, '316d986a-ae32-415c-9f32-adfc6f33535a'::uuid, 3, 'normal',  55.00, 10,  8, 12),
    -- Elevação Lateral (biset) — 3 normal (13 kg, range 12-15)
    ('bc01a163-0de6-4ecf-a15a-c3372ab91d74'::uuid, '7a1b338a-9d92-4a9e-a10b-aa8d7a2761a7'::uuid, 0, 'normal',  13.00, 13, 12, 15),
    ('09a7a819-d8ea-4507-b88f-a0df06ff1990'::uuid, '7a1b338a-9d92-4a9e-a10b-aa8d7a2761a7'::uuid, 1, 'normal',  13.00, 14, 12, 15),
    ('c15e55e0-5c60-457b-b27c-4a2eb28d02fa'::uuid, '7a1b338a-9d92-4a9e-a10b-aa8d7a2761a7'::uuid, 2, 'normal',  13.00, 13, 12, 15),
    -- Tríceps Corda (biset) — 3 normal (35 kg, range 12-15)
    ('cf3cdd03-1349-433d-b510-bc6cfe7f6685'::uuid, '817d5416-e41e-4f5e-b569-54ae81766086'::uuid, 0, 'normal',  35.00, 13, 12, 15),
    ('89419226-2656-4a1e-a3ec-94ec1eac6fd8'::uuid, '817d5416-e41e-4f5e-b569-54ae81766086'::uuid, 1, 'normal',  35.00, 14, 12, 15),
    ('59c9079d-e923-46a2-94e1-766b5a191622'::uuid, '817d5416-e41e-4f5e-b569-54ae81766086'::uuid, 2, 'normal',  35.00, 14, 12, 15),

    -- ════════════════════════════════════════════════
    -- wl010: Marcos Treino A — sessão 2 (PRs)
    -- ════════════════════════════════════════════════

    -- Supino Reto: warmup + 4 normal (PR 100 kg)
    ('993ed688-82b4-4031-9b17-40d827d139fd'::uuid, 'd943fdf2-f1db-4582-b64c-1a6a9b761ca4'::uuid, 0, 'warmup',  50.00, 15, 12, 15),
    ('3e3812b3-4df8-46c1-bdd3-f29871bae3ad'::uuid, 'd943fdf2-f1db-4582-b64c-1a6a9b761ca4'::uuid, 1, 'normal', 100.00, 12,  8, 12),
    ('eb52d1bb-3163-43d2-9635-892c91d59c0c'::uuid, 'd943fdf2-f1db-4582-b64c-1a6a9b761ca4'::uuid, 2, 'normal', 100.00, 11,  8, 12),
    ('47842bce-a580-4802-aedc-034ac59c3082'::uuid, 'd943fdf2-f1db-4582-b64c-1a6a9b761ca4'::uuid, 3, 'normal', 100.00, 11,  8, 12),
    ('4ab94ec2-6c65-43b4-a7fb-69811a0ec707'::uuid, 'd943fdf2-f1db-4582-b64c-1a6a9b761ca4'::uuid, 4, 'normal', 100.00, 10,  8, 12),
    -- Supino Inclinado — 4 normal (PR 80 kg)
    ('1b119930-25af-418d-b4fb-c0dba97d4371'::uuid, 'bf29a470-5efc-4d42-bb41-bec943b5799f'::uuid, 0, 'normal',  80.00, 15, 10, 15),
    ('be0bb23d-12ee-443e-b099-3dffe69004cd'::uuid, 'bf29a470-5efc-4d42-bb41-bec943b5799f'::uuid, 1, 'normal',  80.00, 14, 10, 15),
    ('0021eeeb-a968-4c9f-ba36-b7b3311e99e1'::uuid, 'bf29a470-5efc-4d42-bb41-bec943b5799f'::uuid, 2, 'normal',  80.00, 14, 10, 15),
    ('f0e27fc9-e39b-4ba1-a32b-81523f88cb57'::uuid, 'bf29a470-5efc-4d42-bb41-bec943b5799f'::uuid, 3, 'normal',  80.00, 13, 10, 15),
    -- Desenvolvimento Militar: warmup + 3 normal (PR 60 kg)
    ('1873a0d5-4706-4192-adde-80b774f2a910'::uuid, '2275403b-1848-4ffc-8b6c-d6b3cfd12a14'::uuid, 0, 'warmup',  30.00, 15, 12, 15),
    ('d075d6fd-ac34-4f85-bcda-31faec01dad3'::uuid, '2275403b-1848-4ffc-8b6c-d6b3cfd12a14'::uuid, 1, 'normal',  60.00, 12,  8, 12),
    ('8dda29b9-ef11-4934-b0e2-fd0a9e91ef27'::uuid, '2275403b-1848-4ffc-8b6c-d6b3cfd12a14'::uuid, 2, 'normal',  60.00, 11,  8, 12),
    ('11fd79d9-8a8a-4f69-9828-7447805ec07e'::uuid, '2275403b-1848-4ffc-8b6c-d6b3cfd12a14'::uuid, 3, 'normal',  60.00, 10,  8, 12),
    -- Elevação Lateral (biset) — 3 normal (PR 15 kg)
    ('2b8b1302-a233-4c81-ae87-4c4b88ddbc94'::uuid, '2aae4fe5-57de-4bce-815f-9615350d8e7d'::uuid, 0, 'normal',  15.00, 15, 12, 15),
    ('e7ea0be2-f692-4dcd-bd15-2106c7911a98'::uuid, '2aae4fe5-57de-4bce-815f-9615350d8e7d'::uuid, 1, 'normal',  15.00, 14, 12, 15),
    ('2f5d54b8-a631-4c21-a111-3fa9d333021e'::uuid, '2aae4fe5-57de-4bce-815f-9615350d8e7d'::uuid, 2, 'normal',  15.00, 14, 12, 15),
    -- Tríceps Corda (biset) — 3 normal (PR 40 kg)
    ('b19eacfd-a9ad-4fb5-8918-a8b93ee3a169'::uuid, '102958d6-7067-445e-9827-0b84ef7cf5a6'::uuid, 0, 'normal',  40.00, 15, 12, 15),
    ('60f8f884-0e67-40b6-ab93-cceda98e09a6'::uuid, '102958d6-7067-445e-9827-0b84ef7cf5a6'::uuid, 1, 'normal',  40.00, 14, 12, 15),
    ('a800fbd1-5ead-4e28-9883-418995f84d6f'::uuid, '102958d6-7067-445e-9827-0b84ef7cf5a6'::uuid, 2, 'normal',  40.00, 14, 12, 15),

    -- ════════════════════════════════════════════════
    -- wl027: Marcos sessão 3 (95 kg supino)
    -- ════════════════════════════════════════════════

    -- Supino Reto: warmup + 4 normal
    ('b5010001-0001-4000-a001-000000000001'::uuid, 'a5550001-0001-4000-a001-000000000001'::uuid, 0, 'warmup',  50.00, 14, 12, 15),
    ('b5010001-0001-4000-a001-000000000002'::uuid, 'a5550001-0001-4000-a001-000000000001'::uuid, 1, 'normal',  95.00, 10,  8, 12),
    ('b5010001-0001-4000-a001-000000000003'::uuid, 'a5550001-0001-4000-a001-000000000001'::uuid, 2, 'normal',  95.00, 10,  8, 12),
    ('b5010001-0001-4000-a001-000000000004'::uuid, 'a5550001-0001-4000-a001-000000000001'::uuid, 3, 'normal',  95.00,  9,  8, 12),
    ('b5010001-0001-4000-a001-000000000005'::uuid, 'a5550001-0001-4000-a001-000000000001'::uuid, 4, 'normal',  95.00,  9,  8, 12),
    -- Supino Inclinado — 4 normal (77 kg)
    ('b5010001-0001-4000-a001-000000000006'::uuid, 'a5550001-0001-4000-a001-000000000002'::uuid, 0, 'normal',  77.00, 13, 10, 15),
    ('b5010001-0001-4000-a001-000000000007'::uuid, 'a5550001-0001-4000-a001-000000000002'::uuid, 1, 'normal',  77.00, 12, 10, 15),
    ('b5010001-0001-4000-a001-000000000008'::uuid, 'a5550001-0001-4000-a001-000000000002'::uuid, 2, 'normal',  77.00, 13, 10, 15),
    ('b5010001-0001-4000-a001-000000000009'::uuid, 'a5550001-0001-4000-a001-000000000002'::uuid, 3, 'normal',  77.00, 12, 10, 15),
    -- Desenvolvimento Militar: warmup + 3 normal (57 kg)
    ('b5010001-0001-4000-a001-00000000000a'::uuid, 'a5550001-0001-4000-a001-000000000003'::uuid, 0, 'warmup',  30.00, 14, 12, 15),
    ('b5010001-0001-4000-a001-00000000000b'::uuid, 'a5550001-0001-4000-a001-000000000003'::uuid, 1, 'normal',  57.00, 10,  8, 12),
    ('b5010001-0001-4000-a001-00000000000c'::uuid, 'a5550001-0001-4000-a001-000000000003'::uuid, 2, 'normal',  57.00,  9,  8, 12),
    ('b5010001-0001-4000-a001-00000000000d'::uuid, 'a5550001-0001-4000-a001-000000000003'::uuid, 3, 'normal',  57.00, 10,  8, 12),
    -- Elevação Lateral (biset) — 3 normal
    ('b5010001-0001-4000-a001-00000000000e'::uuid, 'a5550001-0001-4000-a001-000000000004'::uuid, 0, 'normal',  14.00, 14, 12, 15),
    ('b5010001-0001-4000-a001-00000000000f'::uuid, 'a5550001-0001-4000-a001-000000000004'::uuid, 1, 'normal',  14.00, 13, 12, 15),
    ('b5010001-0001-4000-a001-000000000010'::uuid, 'a5550001-0001-4000-a001-000000000004'::uuid, 2, 'normal',  14.00, 14, 12, 15),
    -- Tríceps Corda (biset) — 3 normal
    ('b5010001-0001-4000-a001-000000000011'::uuid, 'a5550001-0001-4000-a001-000000000005'::uuid, 0, 'normal',  37.00, 14, 12, 15),
    ('b5010001-0001-4000-a001-000000000012'::uuid, 'a5550001-0001-4000-a001-000000000005'::uuid, 1, 'normal',  37.00, 13, 12, 15),
    ('b5010001-0001-4000-a001-000000000013'::uuid, 'a5550001-0001-4000-a001-000000000005'::uuid, 2, 'normal',  37.00, 14, 12, 15),

    -- ════════════════════════════════════════════════
    -- wl028: Marcos sessão 4 (102 kg PR, reps fora da faixa)
    -- ════════════════════════════════════════════════

    -- Supino Reto: warmup + 4 normal (reps=7 below range)
    ('b5020001-0001-4000-a001-000000000001'::uuid, 'a5550002-0001-4000-a001-000000000001'::uuid, 0, 'warmup',  50.00, 13, 12, 15),
    ('b5020001-0001-4000-a001-000000000002'::uuid, 'a5550002-0001-4000-a001-000000000001'::uuid, 1, 'normal', 102.00, 10,  8, 12),
    ('b5020001-0001-4000-a001-000000000003'::uuid, 'a5550002-0001-4000-a001-000000000001'::uuid, 2, 'normal', 102.00,  9,  8, 12),
    ('b5020001-0001-4000-a001-000000000004'::uuid, 'a5550002-0001-4000-a001-000000000001'::uuid, 3, 'normal', 102.00,  7,  8, 12),
    ('b5020001-0001-4000-a001-000000000005'::uuid, 'a5550002-0001-4000-a001-000000000001'::uuid, 4, 'normal', 102.00,  8,  8, 12),
    -- Supino Inclinado — 4 normal (82 kg, reps=16 above range)
    ('b5020001-0001-4000-a001-000000000006'::uuid, 'a5550002-0001-4000-a001-000000000002'::uuid, 0, 'normal',  82.00, 16, 10, 15),
    ('b5020001-0001-4000-a001-000000000007'::uuid, 'a5550002-0001-4000-a001-000000000002'::uuid, 1, 'normal',  82.00, 14, 10, 15),
    ('b5020001-0001-4000-a001-000000000008'::uuid, 'a5550002-0001-4000-a001-000000000002'::uuid, 2, 'normal',  82.00, 13, 10, 15),
    ('b5020001-0001-4000-a001-000000000009'::uuid, 'a5550002-0001-4000-a001-000000000002'::uuid, 3, 'normal',  82.00, 12, 10, 15),
    -- Desenvolvimento Militar: warmup + 3 normal (62 kg)
    ('b5020001-0001-4000-a001-00000000000a'::uuid, 'a5550002-0001-4000-a001-000000000003'::uuid, 0, 'warmup',  30.00, 15, 12, 15),
    ('b5020001-0001-4000-a001-00000000000b'::uuid, 'a5550002-0001-4000-a001-000000000003'::uuid, 1, 'normal',  62.00, 11,  8, 12),
    ('b5020001-0001-4000-a001-00000000000c'::uuid, 'a5550002-0001-4000-a001-000000000003'::uuid, 2, 'normal',  62.00, 10,  8, 12),
    ('b5020001-0001-4000-a001-00000000000d'::uuid, 'a5550002-0001-4000-a001-000000000003'::uuid, 3, 'normal',  62.00, 10,  8, 12),
    -- Elevação Lateral (biset) — 3 normal (reps=11 below range 12-15)
    ('b5020001-0001-4000-a001-00000000000e'::uuid, 'a5550002-0001-4000-a001-000000000004'::uuid, 0, 'normal',  16.00, 11, 12, 15),
    ('b5020001-0001-4000-a001-00000000000f'::uuid, 'a5550002-0001-4000-a001-000000000004'::uuid, 1, 'normal',  16.00, 13, 12, 15),
    ('b5020001-0001-4000-a001-000000000010'::uuid, 'a5550002-0001-4000-a001-000000000004'::uuid, 2, 'normal',  16.00, 14, 12, 15),
    -- Tríceps Corda (biset) — 3 normal
    ('b5020001-0001-4000-a001-000000000011'::uuid, 'a5550002-0001-4000-a001-000000000005'::uuid, 0, 'normal',  42.00, 14, 12, 15),
    ('b5020001-0001-4000-a001-000000000012'::uuid, 'a5550002-0001-4000-a001-000000000005'::uuid, 1, 'normal',  42.00, 13, 12, 15),
    ('b5020001-0001-4000-a001-000000000013'::uuid, 'a5550002-0001-4000-a001-000000000005'::uuid, 2, 'normal',  42.00, 15, 12, 15),

    -- ════════════════════════════════════════════════
    -- wl029: Marcos sessão 5 (skips Supino Inclinado)
    -- ════════════════════════════════════════════════

    -- Supino Reto: warmup + 4 normal
    ('b5030001-0001-4000-a001-000000000001'::uuid, 'a5550003-0001-4000-a001-000000000001'::uuid, 0, 'warmup',  50.00, 15, 12, 15),
    ('b5030001-0001-4000-a001-000000000002'::uuid, 'a5550003-0001-4000-a001-000000000001'::uuid, 1, 'normal', 100.00, 11,  8, 12),
    ('b5030001-0001-4000-a001-000000000003'::uuid, 'a5550003-0001-4000-a001-000000000001'::uuid, 2, 'normal', 100.00, 10,  8, 12),
    ('b5030001-0001-4000-a001-000000000004'::uuid, 'a5550003-0001-4000-a001-000000000001'::uuid, 3, 'normal', 100.00,  9,  8, 12),
    ('b5030001-0001-4000-a001-000000000005'::uuid, 'a5550003-0001-4000-a001-000000000001'::uuid, 4, 'normal', 100.00,  9,  8, 12),
    -- Desenvolvimento Militar: warmup + 3 normal (60 kg)
    ('b5030001-0001-4000-a001-000000000006'::uuid, 'a5550003-0001-4000-a001-000000000003'::uuid, 0, 'warmup',  30.00, 14, 12, 15),
    ('b5030001-0001-4000-a001-000000000007'::uuid, 'a5550003-0001-4000-a001-000000000003'::uuid, 1, 'normal',  60.00, 11,  8, 12),
    ('b5030001-0001-4000-a001-000000000008'::uuid, 'a5550003-0001-4000-a001-000000000003'::uuid, 2, 'normal',  60.00, 10,  8, 12),
    ('b5030001-0001-4000-a001-000000000009'::uuid, 'a5550003-0001-4000-a001-000000000003'::uuid, 3, 'normal',  60.00, 10,  8, 12),
    -- Elevação Lateral (biset) — 3 normal
    ('b5030001-0001-4000-a001-00000000000a'::uuid, 'a5550003-0001-4000-a001-000000000004'::uuid, 0, 'normal',  15.00, 15, 12, 15),
    ('b5030001-0001-4000-a001-00000000000b'::uuid, 'a5550003-0001-4000-a001-000000000004'::uuid, 1, 'normal',  15.00, 14, 12, 15),
    ('b5030001-0001-4000-a001-00000000000c'::uuid, 'a5550003-0001-4000-a001-000000000004'::uuid, 2, 'normal',  15.00, 13, 12, 15),
    -- Tríceps Corda (biset) — 3 normal
    ('b5030001-0001-4000-a001-00000000000d'::uuid, 'a5550003-0001-4000-a001-000000000005'::uuid, 0, 'normal',  40.00, 15, 12, 15),
    ('b5030001-0001-4000-a001-00000000000e'::uuid, 'a5550003-0001-4000-a001-000000000005'::uuid, 1, 'normal',  40.00, 14, 12, 15),
    ('b5030001-0001-4000-a001-00000000000f'::uuid, 'a5550003-0001-4000-a001-000000000005'::uuid, 2, 'normal',  40.00, 13, 12, 15),

    -- ════════════════════════════════════════════════
    -- wl030: Marcos sessão 6 (PR: 105 kg supino)
    -- ════════════════════════════════════════════════

    -- Supino Reto: warmup + 4 normal (PR 105 kg)
    ('b5040001-0001-4000-a001-000000000001'::uuid, 'a5550004-0001-4000-a001-000000000001'::uuid, 0, 'warmup',  55.00, 15, 12, 15),
    ('b5040001-0001-4000-a001-000000000002'::uuid, 'a5550004-0001-4000-a001-000000000001'::uuid, 1, 'normal', 105.00, 11,  8, 12),
    ('b5040001-0001-4000-a001-000000000003'::uuid, 'a5550004-0001-4000-a001-000000000001'::uuid, 2, 'normal', 105.00, 10,  8, 12),
    ('b5040001-0001-4000-a001-000000000004'::uuid, 'a5550004-0001-4000-a001-000000000001'::uuid, 3, 'normal', 105.00, 10,  8, 12),
    ('b5040001-0001-4000-a001-000000000005'::uuid, 'a5550004-0001-4000-a001-000000000001'::uuid, 4, 'normal', 105.00,  9,  8, 12),
    -- Supino Inclinado — 4 normal (PR 85 kg)
    ('b5040001-0001-4000-a001-000000000006'::uuid, 'a5550004-0001-4000-a001-000000000002'::uuid, 0, 'normal',  85.00, 14, 10, 15),
    ('b5040001-0001-4000-a001-000000000007'::uuid, 'a5550004-0001-4000-a001-000000000002'::uuid, 1, 'normal',  85.00, 13, 10, 15),
    ('b5040001-0001-4000-a001-000000000008'::uuid, 'a5550004-0001-4000-a001-000000000002'::uuid, 2, 'normal',  85.00, 14, 10, 15),
    ('b5040001-0001-4000-a001-000000000009'::uuid, 'a5550004-0001-4000-a001-000000000002'::uuid, 3, 'normal',  85.00, 13, 10, 15),
    -- Desenvolvimento Militar: warmup + 3 normal (PR 65 kg)
    ('b5040001-0001-4000-a001-00000000000a'::uuid, 'a5550004-0001-4000-a001-000000000003'::uuid, 0, 'warmup',  35.00, 15, 12, 15),
    ('b5040001-0001-4000-a001-00000000000b'::uuid, 'a5550004-0001-4000-a001-000000000003'::uuid, 1, 'normal',  65.00, 12,  8, 12),
    ('b5040001-0001-4000-a001-00000000000c'::uuid, 'a5550004-0001-4000-a001-000000000003'::uuid, 2, 'normal',  65.00, 11,  8, 12),
    ('b5040001-0001-4000-a001-00000000000d'::uuid, 'a5550004-0001-4000-a001-000000000003'::uuid, 3, 'normal',  65.00, 10,  8, 12),
    -- Elevação Lateral (biset) — 3 normal
    ('b5040001-0001-4000-a001-00000000000e'::uuid, 'a5550004-0001-4000-a001-000000000004'::uuid, 0, 'normal',  16.00, 15, 12, 15),
    ('b5040001-0001-4000-a001-00000000000f'::uuid, 'a5550004-0001-4000-a001-000000000004'::uuid, 1, 'normal',  16.00, 14, 12, 15),
    ('b5040001-0001-4000-a001-000000000010'::uuid, 'a5550004-0001-4000-a001-000000000004'::uuid, 2, 'normal',  16.00, 15, 12, 15),
    -- Tríceps Corda (biset) — 3 normal (PR 45 kg)
    ('b5040001-0001-4000-a001-000000000011'::uuid, 'a5550004-0001-4000-a001-000000000005'::uuid, 0, 'normal',  45.00, 15, 12, 15),
    ('b5040001-0001-4000-a001-000000000012'::uuid, 'a5550004-0001-4000-a001-000000000005'::uuid, 1, 'normal',  45.00, 14, 12, 15),
    ('b5040001-0001-4000-a001-000000000013'::uuid, 'a5550004-0001-4000-a001-000000000005'::uuid, 2, 'normal',  45.00, 14, 12, 15),

    -- ════════════════════════════════════════════════
    -- wl031: Athlete4 sessão 1 (65 kg supino)
    -- ════════════════════════════════════════════════

    -- Supino Reto: warmup + 3 normal (range 8-12)
    ('b6010001-0001-4000-a001-000000000001'::uuid, 'a6660001-0001-4000-a001-000000000001'::uuid, 0, 'warmup', 35.00, 14, 12, 15),
    ('b6010001-0001-4000-a001-000000000002'::uuid, 'a6660001-0001-4000-a001-000000000001'::uuid, 1, 'normal', 65.00,  9,  8, 12),
    ('b6010001-0001-4000-a001-000000000003'::uuid, 'a6660001-0001-4000-a001-000000000001'::uuid, 2, 'normal', 65.00, 10,  8, 12),
    ('b6010001-0001-4000-a001-000000000004'::uuid, 'a6660001-0001-4000-a001-000000000001'::uuid, 3, 'normal', 65.00,  8,  8, 12),
    -- Supino Inclinado (biset) — 3 normal (range 10-15)
    ('b6010001-0001-4000-a001-000000000005'::uuid, 'a6660001-0001-4000-a001-000000000002'::uuid, 0, 'normal', 45.00, 12, 10, 15),
    ('b6010001-0001-4000-a001-000000000006'::uuid, 'a6660001-0001-4000-a001-000000000002'::uuid, 1, 'normal', 45.00, 11, 10, 15),
    ('b6010001-0001-4000-a001-000000000007'::uuid, 'a6660001-0001-4000-a001-000000000002'::uuid, 2, 'normal', 45.00, 10, 10, 15),
    -- Tríceps Corda (biset) — 3 normal (range 12-15)
    ('b6010001-0001-4000-a001-000000000008'::uuid, 'a6660001-0001-4000-a001-000000000003'::uuid, 0, 'normal', 25.00, 13, 12, 15),
    ('b6010001-0001-4000-a001-000000000009'::uuid, 'a6660001-0001-4000-a001-000000000003'::uuid, 1, 'normal', 25.00, 12, 12, 15),
    ('b6010001-0001-4000-a001-00000000000a'::uuid, 'a6660001-0001-4000-a001-000000000003'::uuid, 2, 'normal', 25.00, 14, 12, 15),

    -- ════════════════════════════════════════════════
    -- wl032: Athlete4 sessão 2 (67 kg supino, reps fora da faixa)
    -- ════════════════════════════════════════════════

    -- Supino Reto: warmup + 3 normal (reps=13 above range 8-12)
    ('b6020001-0001-4000-a001-000000000001'::uuid, 'a6660002-0001-4000-a001-000000000001'::uuid, 0, 'warmup', 35.00, 15, 12, 15),
    ('b6020001-0001-4000-a001-000000000002'::uuid, 'a6660002-0001-4000-a001-000000000001'::uuid, 1, 'normal', 67.00, 13,  8, 12),
    ('b6020001-0001-4000-a001-000000000003'::uuid, 'a6660002-0001-4000-a001-000000000001'::uuid, 2, 'normal', 67.00, 10,  8, 12),
    ('b6020001-0001-4000-a001-000000000004'::uuid, 'a6660002-0001-4000-a001-000000000001'::uuid, 3, 'normal', 67.00,  9,  8, 12),
    -- Supino Inclinado (biset) — 3 normal
    ('b6020001-0001-4000-a001-000000000005'::uuid, 'a6660002-0001-4000-a001-000000000002'::uuid, 0, 'normal', 47.00, 14, 10, 15),
    ('b6020001-0001-4000-a001-000000000006'::uuid, 'a6660002-0001-4000-a001-000000000002'::uuid, 1, 'normal', 47.00, 13, 10, 15),
    ('b6020001-0001-4000-a001-000000000007'::uuid, 'a6660002-0001-4000-a001-000000000002'::uuid, 2, 'normal', 47.00, 11, 10, 15),
    -- Tríceps Corda (biset) — 3 normal (reps=11 below range 12-15)
    ('b6020001-0001-4000-a001-000000000008'::uuid, 'a6660002-0001-4000-a001-000000000003'::uuid, 0, 'normal', 27.00, 11, 12, 15),
    ('b6020001-0001-4000-a001-000000000009'::uuid, 'a6660002-0001-4000-a001-000000000003'::uuid, 1, 'normal', 27.00, 14, 12, 15),
    ('b6020001-0001-4000-a001-00000000000a'::uuid, 'a6660002-0001-4000-a001-000000000003'::uuid, 2, 'normal', 27.00, 13, 12, 15),

    -- ════════════════════════════════════════════════
    -- wl033: Athlete4 sessão 3 (skips biset — only Supino Reto, 70 kg)
    -- ════════════════════════════════════════════════

    -- Supino Reto: warmup + 3 normal
    ('b6030001-0001-4000-a001-000000000001'::uuid, 'a6660003-0001-4000-a001-000000000001'::uuid, 0, 'warmup', 35.00, 13, 12, 15),
    ('b6030001-0001-4000-a001-000000000002'::uuid, 'a6660003-0001-4000-a001-000000000001'::uuid, 1, 'normal', 70.00, 11,  8, 12),
    ('b6030001-0001-4000-a001-000000000003'::uuid, 'a6660003-0001-4000-a001-000000000001'::uuid, 2, 'normal', 70.00, 10,  8, 12),
    ('b6030001-0001-4000-a001-000000000004'::uuid, 'a6660003-0001-4000-a001-000000000001'::uuid, 3, 'normal', 70.00,  9,  8, 12)

  ON CONFLICT DO NOTHING;

  WITH log_modifiers(log_id, load_factor, reps_delta) AS (
    VALUES
      ('7d910001-aaaa-4bbb-8ccc-100000000001'::uuid, 0.86,  0),
      ('7d910002-aaaa-4bbb-8ccc-100000000002'::uuid, 0.89,  1),
      ('7d910003-aaaa-4bbb-8ccc-100000000003'::uuid, 0.91, -1),
      ('8e920001-bbbb-4ccc-8ddd-200000000001'::uuid, 0.82,  0),
      ('8e920002-bbbb-4ccc-8ddd-200000000002'::uuid, 0.85, -1),
      ('8e920003-bbbb-4ccc-8ddd-200000000003'::uuid, 0.88,  1),
      ('9f930001-cccc-4ddd-8eee-300000000001'::uuid, 0.78,  0),
      ('9f930002-cccc-4ddd-8eee-300000000002'::uuid, 0.81,  1),
      ('a0940001-dddd-4eee-8fff-400000000001'::uuid, 0.80,  0),
      ('a0940002-dddd-4eee-8fff-400000000002'::uuid, 0.84, -1),
      ('b1a50001-eeee-4fff-8aaa-500000000001'::uuid, 0.76,  0),
      ('b1a50002-eeee-4fff-8aaa-500000000002'::uuid, 0.79,  1)
  )
  INSERT INTO public.workout_exercise_set_logs
    (id, workout_exercise_log_id, set_order, set_type, weight_kg, reps, reps_min, reps_max)
  SELECT
    gen_random_uuid(),
    wel.id,
    ws.set_order,
    ws.set_type,
    CASE
      WHEN ws.set_type = 'warmup' THEN
        CASE
          WHEN wvr.max_weight_kg IS NULL THEN NULL
          ELSE ROUND((wvr.max_weight_kg * 0.50)::numeric, 2)
        END
      WHEN wvr.max_weight_kg IS NULL THEN NULL
      ELSE ROUND((wvr.max_weight_kg * lm.load_factor)::numeric, 2)
    END AS weight_kg,
    CASE
      WHEN ws.set_type = 'warmup' THEN ws.reps_max
      ELSE GREATEST(1, LEAST(ws.reps_max + 2, ws.reps_min + 1 + lm.reps_delta))
    END AS reps,
    ws.reps_min,
    ws.reps_max
  FROM public.workout_exercise_logs wel
  JOIN public.workout_logs wl ON wl.id = wel.workout_log_id
  JOIN log_modifiers lm ON lm.log_id = wl.id
  JOIN public.workout_exercises we
    ON we.workout_id = wl.workout_id
   AND we.variation_id = wel.variation_id
   AND we.position = wel.position
  JOIN public.workout_sets ws ON ws.workout_exercise_id = we.id
  LEFT JOIN public.workout_variation_records wvr
    ON wvr.user_id = wl.user_id
   AND wvr.variation_id = wel.variation_id
  WHERE wl.id IN (
    '7d910001-aaaa-4bbb-8ccc-100000000001'::uuid,
    '7d910002-aaaa-4bbb-8ccc-100000000002'::uuid,
    '7d910003-aaaa-4bbb-8ccc-100000000003'::uuid,
    '8e920001-bbbb-4ccc-8ddd-200000000001'::uuid,
    '8e920002-bbbb-4ccc-8ddd-200000000002'::uuid,
    '8e920003-bbbb-4ccc-8ddd-200000000003'::uuid,
    '9f930001-cccc-4ddd-8eee-300000000001'::uuid,
    '9f930002-cccc-4ddd-8eee-300000000002'::uuid,
    'a0940001-dddd-4eee-8fff-400000000001'::uuid,
    'a0940002-dddd-4eee-8fff-400000000002'::uuid,
    'b1a50001-eeee-4fff-8aaa-500000000001'::uuid,
    'b1a50002-eeee-4fff-8aaa-500000000002'::uuid
  )
  ON CONFLICT DO NOTHING;

  -- ================================================
  -- workout_log_summaries
  -- Construídos dinamicamente a partir dos dados inseridos.
  -- Formato compatível com WorkoutLogSummarySnapshotSchema.
  -- ================================================
  INSERT INTO public.workout_log_summaries (workout_log_id, user_id, summary_snapshot)
  SELECT
    wl.id,
    wl.user_id,
    jsonb_build_object(
      'workoutLogId',       wl.id::text,
      'userId',             wl.user_id::text,
      'workoutId',          wl.workout_id::text,
      'workoutName',        w.name,
      'note',               NULL,
      'startedAt',          to_char(wl.started_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"+00:00"'),
      'finishedAt',         to_char(wl.finished_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"+00:00"'),
      'durationSeconds',    EXTRACT(EPOCH FROM (wl.finished_at - wl.started_at))::integer,
      'totalCompletedSets', COALESCE(
        (
          SELECT COUNT(*)::integer
          FROM public.workout_exercise_set_logs wesl
          JOIN public.workout_exercise_logs wel ON wel.id = wesl.workout_exercise_log_id
          WHERE wel.workout_log_id = wl.id
            AND wesl.set_type <> 'warmup'
        ), 0
      ),
      'totalVolumeKg',      COALESCE(
        (
          SELECT ROUND(SUM(COALESCE(wesl.weight_kg, 0) * COALESCE(wesl.reps, 0))::numeric, 2)
          FROM public.workout_exercise_set_logs wesl
          JOIN public.workout_exercise_logs wel ON wel.id = wesl.workout_exercise_log_id
          WHERE wel.workout_log_id = wl.id
            AND wesl.set_type <> 'warmup'
        ), 0
      ),
      'comparisonBasis',    NULL,
      'exerciseComparisons', COALESCE(
        (
          SELECT jsonb_agg(sub.comparison ORDER BY sub.sort_pos, sub.variation_id)
          FROM (
            -- Matched + Added: exercises that appear in the log
            SELECT
              wel.variation_id,
              wel.position AS sort_pos,
              jsonb_build_object(
                'variationId',            wel.variation_id::text,
                'variationName',          COALESCE(wel.variation_name, vv.name),
                'exerciseName',           COALESCE(wel.exercise_name, vv.exercise_name, 'Exercício'),
                'equipmentName',          COALESCE(vv.equipment_name, ''),
                'equipmentPreposition',   COALESCE(vv.equipment_preposition, 'com'),
                'status',                 CASE
                                            WHEN we.id IS NOT NULL THEN 'matched'
                                            ELSE 'added'
                                          END,
                'currentPosition',        wel.position,
                'templatePosition',       we.position,
                'currentSets',            COUNT(*) FILTER (WHERE wesl.set_type <> 'warmup')::integer,
                'previousSets',           0,
                'setsDelta',              COUNT(*) FILTER (WHERE wesl.set_type <> 'warmup')::integer,
                'currentVolumeKg',        ROUND(COALESCE(SUM(
                                            CASE WHEN wesl.set_type <> 'warmup'
                                              THEN COALESCE(wesl.weight_kg, 0) * COALESCE(wesl.reps, 0)
                                              ELSE 0
                                            END
                                          ), 0)::numeric, 2),
                'previousVolumeKg',       0,
                'volumeDeltaKg',          ROUND(COALESCE(SUM(
                                            CASE WHEN wesl.set_type <> 'warmup'
                                              THEN COALESCE(wesl.weight_kg, 0) * COALESCE(wesl.reps, 0)
                                              ELSE 0
                                            END
                                          ), 0)::numeric, 2),
                'currentSupersetContext', CASE
                                            WHEN (
                                              SELECT COUNT(DISTINCT wel2.id)
                                              FROM public.workout_exercise_logs wel2
                                              WHERE wel2.workout_log_id = wl.id
                                                AND wel2.superset_group_id = wel.superset_group_id
                                            ) >= 2 THEN 'superset'
                                            ELSE 'isolated'
                                          END,
                'previousSupersetContext', NULL,
                'muscleId',              v_m.muscle_id::text,
                'muscleName',            m_m.name
              ) AS comparison
            FROM public.workout_exercise_logs wel
            LEFT JOIN public.variations_view vv ON vv.id = wel.variation_id
            LEFT JOIN public.variations v_m ON v_m.id = wel.variation_id
            LEFT JOIN public.muscles m_m ON m_m.id = v_m.muscle_id
            LEFT JOIN public.workout_exercise_set_logs wesl ON wesl.workout_exercise_log_id = wel.id
            LEFT JOIN public.workout_exercises we
              ON we.workout_id = wl.workout_id AND we.variation_id = wel.variation_id
            WHERE wel.workout_log_id = wl.id
            GROUP BY wel.variation_id, wel.position, wel.variation_name, wel.exercise_name,
                     vv.name, vv.exercise_name, vv.equipment_name, vv.equipment_preposition,
                     wel.superset_group_id, wel.id, wl.id, we.id, we.position,
                     v_m.muscle_id, m_m.name

            UNION ALL

            -- Removed: template exercises not in the log
            SELECT
              we2.variation_id,
              we2.position AS sort_pos,
              jsonb_build_object(
                'variationId',            we2.variation_id::text,
                'variationName',          COALESCE(vv2.name, ''),
                'exerciseName',           COALESCE(vv2.exercise_name, 'Exercício'),
                'equipmentName',          COALESCE(vv2.equipment_name, ''),
                'equipmentPreposition',   COALESCE(vv2.equipment_preposition, 'com'),
                'status',                 'removed',
                'templatePosition',       we2.position,
                'currentSets',            0,
                'previousSets',           0,
                'setsDelta',              0,
                'currentVolumeKg',        0,
                'previousVolumeKg',       0,
                'volumeDeltaKg',          0,
                'currentSupersetContext',  NULL,
                'previousSupersetContext', NULL,
                'muscleId',              v_r.muscle_id::text,
                'muscleName',            m_r.name
              ) AS comparison
            FROM public.workout_exercises we2
            LEFT JOIN public.variations_view vv2 ON vv2.id = we2.variation_id
            LEFT JOIN public.variations v_r ON v_r.id = we2.variation_id
            LEFT JOIN public.muscles m_r ON m_r.id = v_r.muscle_id
            WHERE we2.workout_id = wl.workout_id
              AND NOT EXISTS (
                SELECT 1 FROM public.workout_exercise_logs wel3
                WHERE wel3.workout_log_id = wl.id
                  AND wel3.variation_id = we2.variation_id
              )
          ) sub
        ),
        '[]'::jsonb
      ),
      'templateMuscleVolume', COALESCE(
        (
          SELECT jsonb_agg(
            jsonb_build_object(
              'muscleId',      tmv.muscle_id::text,
              'muscleName',    tmv.muscle_name,
              'templateSets',  tmv.template_sets,
              'executedSets',  tmv.executed_sets
            )
          )
          FROM (
            SELECT
              um.muscle_id,
              um.muscle_name,
              SUM(um.template_sets)::integer AS template_sets,
              COALESCE(
                (
                  SELECT COUNT(*)::integer
                  FROM public.workout_exercise_logs wel_t
                  JOIN public.workout_exercise_set_logs wesl_t ON wesl_t.workout_exercise_log_id = wel_t.id
                  JOIN public.variations v_e ON v_e.id = wel_t.variation_id
                  WHERE wel_t.workout_log_id = wl.id
                    AND (v_e.muscle_id = um.muscle_id OR v_e.secondary_muscle_id = um.muscle_id)
                    AND wesl_t.set_type <> 'warmup'
                ), 0
              ) AS executed_sets
            FROM (
              -- Primary muscle sets
              SELECT
                v_t.muscle_id,
                m_t.name AS muscle_name,
                COUNT(DISTINCT ws_t.id)::integer AS template_sets
              FROM public.workout_exercises we_t
              JOIN public.variations v_t ON v_t.id = we_t.variation_id
              JOIN public.muscles m_t ON m_t.id = v_t.muscle_id
              JOIN public.workout_sets ws_t ON ws_t.workout_exercise_id = we_t.id
                AND ws_t.set_type <> 'warmup'
              WHERE we_t.workout_id = wl.workout_id
              GROUP BY v_t.muscle_id, m_t.name
              UNION ALL
              -- Secondary muscle sets
              SELECT
                v_t.secondary_muscle_id AS muscle_id,
                sm_t.name AS muscle_name,
                COUNT(DISTINCT ws_t.id)::integer AS template_sets
              FROM public.workout_exercises we_t
              JOIN public.variations v_t ON v_t.id = we_t.variation_id
              JOIN public.muscles sm_t ON sm_t.id = v_t.secondary_muscle_id
              JOIN public.workout_sets ws_t ON ws_t.workout_exercise_id = we_t.id
                AND ws_t.set_type <> 'warmup'
              WHERE we_t.workout_id = wl.workout_id
                AND v_t.secondary_muscle_id IS NOT NULL
              GROUP BY v_t.secondary_muscle_id, sm_t.name
            ) um
            GROUP BY um.muscle_id, um.muscle_name
          ) tmv
        ),
        '[]'::jsonb
      ),
      'sessionRecords',     '[]'::jsonb
    )
  FROM public.workout_logs wl
  JOIN public.workouts w ON w.id = wl.workout_id
  WHERE wl.workout_id IN (wk1, wk2, wk3, wk4, wk5, wk6, wk7, wk8, wk9, wk10, wk11)
  ON CONFLICT (workout_log_id) DO NOTHING;

END $$;

SET session_replication_role = 'origin';
