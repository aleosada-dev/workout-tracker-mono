-- ================================================
-- SEED: Coach-Atleta, Treinos, Exercícios e Registros
--
-- Estrutura:
-- • 8 relacionamentos coach-atleta (coach1 → atletas 1-4, coach2 → atletas 5-8)
-- • 5 treinos distribuídos entre atletas 1, 2, 3 e 5
-- • 20 exercícios (com exemplos de bisets)
-- • 71 séries (warmup, normal)
-- • Registros pessoais de variações por atleta
--
-- Usuários (de 01_seed_test_users.sql):
--   coach1 = a0000001-...-0001  (Carlos Mendes)
--   coach2 = a0000001-...-0002  (Ana Rodrigues)
--   athlete1..8 = a0000001-...-0003..0010
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
  athlete7_id uuid := '9010f10e-4357-487f-8e60-51eb66e5684b';
  athlete8_id uuid := 'ac352e38-b596-4367-bc00-5a60194e942d';

  -- Variation IDs (lookup por nome de exercício)
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

BEGIN

  -- ------------------------------------------------
  -- Lookup de variações (via nome do exercício base)
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
  -- coach_athletes
  -- Coach 1 (Carlos) → atletas 1-4 (ativos)
  -- Coach 2 (Ana)    → atletas 5-7 (ativos), atleta 8 (pendente)
  -- ------------------------------------------------
  INSERT INTO public.coach_athletes
    (id, coach_id, athlete_id, invited_by, status, invited_at, responded_at)
  VALUES
    ('b446e74e-a5b8-40e3-8baa-8f907e36f55e'::uuid, coach1_id, athlete1_id, coach1_id, 'active',  now() - interval '30 days', now() - interval '29 days'),
    ('fdf97b37-4506-44d0-8299-2ba23a320464'::uuid, coach1_id, athlete2_id, coach1_id, 'active',  now() - interval '28 days', now() - interval '27 days'),
    ('ff238037-5782-42bb-8d92-2f0b142466b8'::uuid, coach1_id, athlete3_id, coach1_id, 'active',  now() - interval '20 days', now() - interval '19 days'),
    ('850a54a3-c3a9-4368-ab2f-c9858aa55972'::uuid, coach1_id, athlete4_id, coach1_id, 'active',  now() - interval '15 days', now() - interval '14 days'),
    ('cd5df25c-e8d9-4e27-9cbb-c17b692ffcc6'::uuid, coach2_id, athlete5_id, coach2_id, 'active',  now() - interval '25 days', now() - interval '24 days'),
    ('5062351c-799c-468f-a16e-d728473822e3'::uuid, coach2_id, athlete6_id, coach2_id, 'active',  now() - interval '22 days', now() - interval '21 days'),
    ('643301f7-ff70-4a32-8b13-644264ece0d9'::uuid, coach2_id, athlete7_id, coach2_id, 'active',  now() - interval '18 days', now() - interval '17 days'),
    ('0077c31f-c62d-414c-a1f7-7dfec8616a56'::uuid, coach2_id, athlete8_id, coach2_id, 'pending', now() - interval '2 days',  NULL)
  ON CONFLICT DO NOTHING;

  -- ------------------------------------------------
  -- workouts
  --   wk1, wk2 → Lucas Silva    (athlete1, coach1)
  --   wk3      → Fernanda Costa (athlete2, coach1)
  --   wk4      → Rafael Oliveira(athlete3, coach1)
  --   wk5      → Marcos Santos  (athlete5, coach2)
  -- ------------------------------------------------
  INSERT INTO public.workouts
    (id, user_id, name, description, created_by, updated_by)
  VALUES
    ('52f2bbe7-0c3f-4728-b7c9-34a2223cf0b8'::uuid, athlete1_id,
     'Treino A — Peito e Tríceps',
     'Foco em supino e extensores do cotovelo com biset finalizador',
     coach1_id, coach1_id),

    ('d94823aa-e98d-4516-9088-eee775693846'::uuid, athlete1_id,
     'Treino B — Costas e Bíceps',
     'Puxadas e remadas com biset de isolamento',
     coach1_id, coach1_id),

    ('fe83e1d8-6a4f-4809-a12c-dd3d4d986d29'::uuid, athlete2_id,
     'Treino A — Membros Inferiores',
     'Quadríceps, posteriores e glúteos com biset finalizador',
     coach1_id, coach1_id),

    ('78eca90c-cc5b-46b5-93db-c6f7eed696ce'::uuid, athlete3_id,
     'Full Body — Iniciante',
     'Treino completo para quem está começando — um exercício por grupo muscular',
     coach1_id, coach1_id),

    ('42cbdc7d-b0fe-4fdd-9690-51489d05fbc0'::uuid, athlete5_id,
     'Treino A — Empurrar',
     'Peito, ombros e tríceps com ênfase em volume e biset finalizador',
     coach2_id, coach2_id)
  ON CONFLICT DO NOTHING;

  INSERT INTO public.workouts
    (id, user_id, name, description, created_by, updated_by)
  VALUES
    ('7a9e42d1-5c8b-4f0e-a6c2-9d1b3e4f7a10'::uuid, athlete2_id,
     'Treino B — Posteriores e Costas',
     'Sessão complementar com ênfase em posteriores de coxa, glúteos e puxadas horizontais',
     coach1_id, coach1_id),

    ('8b1f53e2-6d9c-4a1f-b7d3-a2c4e5f6b821'::uuid, athlete5_id,
     'Treino B — Lower Strength',
     'Treino de pernas com foco em força básica e estabilidade de quadril',
     coach2_id, coach2_id),

    ('9c2a64f3-7e0d-4b2a-8ce4-b3d5f607c932'::uuid, athlete6_id,
     'Treino A — Upper Base',
     'Base técnica de membros superiores para atleta intermediário',
     coach2_id, coach2_id),

    ('ad3b75a4-8f1e-4c3b-9df5-c4e6a718da43'::uuid, athlete6_id,
     'Treino B — Lower Base',
     'Base de membros inferiores com progressão simples de volume',
     coach2_id, coach2_id),

    ('be4c86b5-9a2f-4d4c-ae86-d5f7b829eb54'::uuid, athlete7_id,
     'Treino A — Pull Base',
     'Puxadas e remadas para construir consistência semanal',
     coach2_id, coach2_id)
  ON CONFLICT DO NOTHING;

  -- ================================================
  -- workout_exercises
  --
  -- Regras de superset:
  --   • Exercício isolado  → superset_group_id = id próprio, superset_order = 0
  --   • Biset (2 exs)      → superset_group_id = id do primeiro, superset_order = 0 e 1
  --   Mesma position = mesmo grupo; posições distintas = grupos distintos
  -- ================================================
  INSERT INTO public.workout_exercises
    (id, workout_id, variation_id, note, rest_seconds, position, superset_group_id, superset_order)
  VALUES

    -- ══════════════════════════════════════════════
    -- Treino A Lucas (wk1): Peito e Tríceps
    --   pos 0 → Supino Reto (isolado)
    --   pos 1 → Biset: Supino Inclinado + Tríceps Corda
    -- ══════════════════════════════════════════════
    ('eddbdb00-f86d-473f-8661-cb40d328e425'::uuid,
     '52f2bbe7-0c3f-4728-b7c9-34a2223cf0b8'::uuid,
     var_supino_reto, NULL, 90, 0,
     'eddbdb00-f86d-473f-8661-cb40d328e425'::uuid, 0),

    ('8e31acae-fbb2-4221-8405-dba9ec818586'::uuid,
     '52f2bbe7-0c3f-4728-b7c9-34a2223cf0b8'::uuid,
     var_supino_inclinado, 'Controlar a fase excêntrica (3 segundos)', 60, 1,
     '55010001-aaaa-4aaa-8aaa-000000000001'::uuid, 0),

    ('2d2e7fc0-a786-4951-b32e-80405f4843e0'::uuid,
     '52f2bbe7-0c3f-4728-b7c9-34a2223cf0b8'::uuid,
     var_triceps_corda, 'Cotovelos fixos ao longo do corpo', 60, 1,
     '55010001-aaaa-4aaa-8aaa-000000000001'::uuid, 1),

    -- ══════════════════════════════════════════════
    -- Treino B Lucas (wk2): Costas e Bíceps
    --   pos 0 → Puxada na Barra Fixa (isolado)
    --   pos 1 → Remada Sentada no Cabo (isolado)
    --   pos 2 → Biset: Puxada Frontal no Cabo + Rosca Direta
    -- ══════════════════════════════════════════════
    ('11c87e26-6619-4f14-8f6f-840b9793623b'::uuid,
     'd94823aa-e98d-4516-9088-eee775693846'::uuid,
     var_puxada_barra, NULL, 90, 0,
     '11c87e26-6619-4f14-8f6f-840b9793623b'::uuid, 0),

    ('1e8cf022-a470-4932-b943-e46cf7a4f94f'::uuid,
     'd94823aa-e98d-4516-9088-eee775693846'::uuid,
     var_remada_cabo, 'Puxar as escápulas ao final do movimento', 90, 1,
     '1e8cf022-a470-4932-b943-e46cf7a4f94f'::uuid, 0),

    ('d983cc82-a4af-4058-b5e9-8fe79c291c72'::uuid,
     'd94823aa-e98d-4516-9088-eee775693846'::uuid,
     var_puxada_cabo, NULL, 60, 2,
     '55010002-aaaa-4aaa-8aaa-000000000002'::uuid, 0),

    ('8f76cdaa-1a4b-4b82-ba82-15e764bfed54'::uuid,
     'd94823aa-e98d-4516-9088-eee775693846'::uuid,
     var_rosca_direta, NULL, 60, 2,
     '55010002-aaaa-4aaa-8aaa-000000000002'::uuid, 1),

    -- ══════════════════════════════════════════════
    -- Treino A Fernanda (wk3): Membros Inferiores
    --   pos 0 → Agachamento Livre (isolado)
    --   pos 1 → Leg Press (isolado)
    --   pos 2 → Biset: Mesa Flexora + Elevação Pélvica
    -- ══════════════════════════════════════════════
    ('585467c2-ffcb-4c66-b16c-9198acf2fa23'::uuid,
     'fe83e1d8-6a4f-4809-a12c-dd3d4d986d29'::uuid,
     var_agachamento, NULL, 120, 0,
     '585467c2-ffcb-4c66-b16c-9198acf2fa23'::uuid, 0),

    ('9f9606f7-4d33-469b-91ea-942486ec96d7'::uuid,
     'fe83e1d8-6a4f-4809-a12c-dd3d4d986d29'::uuid,
     var_leg_press, '4 segundos na fase excêntrica', 90, 1,
     '9f9606f7-4d33-469b-91ea-942486ec96d7'::uuid, 0),

    ('f031fc90-2a9a-4c84-924a-1f8af362a0df'::uuid,
     'fe83e1d8-6a4f-4809-a12c-dd3d4d986d29'::uuid,
     var_mesa_flexora, NULL, 60, 2,
     '55010003-aaaa-4aaa-8aaa-000000000003'::uuid, 0),

    ('0946a2cd-d24c-4832-95ee-0a0fdbd611b0'::uuid,
     'fe83e1d8-6a4f-4809-a12c-dd3d4d986d29'::uuid,
     var_elevacao_pelv, 'Pausa de 1 segundo no topo', 60, 2,
     '55010003-aaaa-4aaa-8aaa-000000000003'::uuid, 1),

    -- ══════════════════════════════════════════════
    -- Full Body Rafael (wk4): Iniciante — todos isolados
    --   pos 0 → Supino Reto
    --   pos 1 → Agachamento Livre
    --   pos 2 → Remada Sentada no Cabo
    --   pos 3 → Desenvolvimento Militar
    -- ══════════════════════════════════════════════
    ('d1a0ad4b-8b5e-4d37-b330-dfb0112c9b78'::uuid,
     '78eca90c-cc5b-46b5-93db-c6f7eed696ce'::uuid,
     var_supino_reto, NULL, 90, 0,
     'd1a0ad4b-8b5e-4d37-b330-dfb0112c9b78'::uuid, 0),

    ('51fa054a-539d-4f58-8511-469473421df6'::uuid,
     '78eca90c-cc5b-46b5-93db-c6f7eed696ce'::uuid,
     var_agachamento, NULL, 120, 1,
     '51fa054a-539d-4f58-8511-469473421df6'::uuid, 0),

    ('96cb499a-f6a1-4773-bc45-52cbf5b06161'::uuid,
     '78eca90c-cc5b-46b5-93db-c6f7eed696ce'::uuid,
     var_remada_cabo, NULL, 90, 2,
     '96cb499a-f6a1-4773-bc45-52cbf5b06161'::uuid, 0),

    ('98cce1eb-002a-4274-853e-2921e4cecf2a'::uuid,
     '78eca90c-cc5b-46b5-93db-c6f7eed696ce'::uuid,
     var_desenvolvimento, NULL, 90, 3,
     '98cce1eb-002a-4274-853e-2921e4cecf2a'::uuid, 0),

    -- ══════════════════════════════════════════════
    -- Treino A Marcos (wk5): Empurrar
    --   pos 0 → Supino Reto (isolado)
    --   pos 1 → Supino Inclinado (isolado)
    --   pos 2 → Desenvolvimento Militar (isolado)
    --   pos 3 → Biset: Elevação Lateral + Tríceps Corda
    -- ══════════════════════════════════════════════
    ('3c2afa30-3934-425d-89c3-b7615ff07e90'::uuid,
     '42cbdc7d-b0fe-4fdd-9690-51489d05fbc0'::uuid,
     var_supino_reto, NULL, 90, 0,
     '3c2afa30-3934-425d-89c3-b7615ff07e90'::uuid, 0),

    ('50acbdfe-42c4-4037-bf4f-e8b4165b8e06'::uuid,
     '42cbdc7d-b0fe-4fdd-9690-51489d05fbc0'::uuid,
     var_supino_inclinado, NULL, 90, 1,
     '50acbdfe-42c4-4037-bf4f-e8b4165b8e06'::uuid, 0),

    ('081a736e-51fe-4b12-b0c5-10ee687d00c7'::uuid,
     '42cbdc7d-b0fe-4fdd-9690-51489d05fbc0'::uuid,
     var_desenvolvimento, NULL, 90, 2,
     '081a736e-51fe-4b12-b0c5-10ee687d00c7'::uuid, 0),

    ('8d59cf84-14f5-42d5-be73-4876aee6b69b'::uuid,
     '42cbdc7d-b0fe-4fdd-9690-51489d05fbc0'::uuid,
     var_elevacao_lat, NULL, 60, 3,
     '55010004-aaaa-4aaa-8aaa-000000000004'::uuid, 0),

    ('a3c5d46c-a9bf-4bca-94a8-fd275cec9fea'::uuid,
     '42cbdc7d-b0fe-4fdd-9690-51489d05fbc0'::uuid,
     var_triceps_corda, NULL, 60, 3,
     '55010004-aaaa-4aaa-8aaa-000000000004'::uuid, 1)

  ON CONFLICT DO NOTHING;

  INSERT INTO public.workout_exercises
    (id, workout_id, variation_id, note, rest_seconds, position, superset_group_id, superset_order)
  VALUES
    -- wk7 athlete2 — Posteriores e Costas
    ('7c210001-1111-4aaa-8bbb-000000000021'::uuid, '7a9e42d1-5c8b-4f0e-a6c2-9d1b3e4f7a10'::uuid, var_remada_cabo,     'Segurar 1 segundo com escápulas retraídas', 90, 0, '7c210001-1111-4aaa-8bbb-000000000021'::uuid, 0),
    ('7c210002-1111-4aaa-8bbb-000000000022'::uuid, '7a9e42d1-5c8b-4f0e-a6c2-9d1b3e4f7a10'::uuid, var_puxada_cabo,     'Priorizar amplitude completa',               75, 1, '7c210002-1111-4aaa-8bbb-000000000022'::uuid, 0),
    ('7c210003-1111-4aaa-8bbb-000000000023'::uuid, '7a9e42d1-5c8b-4f0e-a6c2-9d1b3e4f7a10'::uuid, var_mesa_flexora,    'Descer controlando a carga',                 75, 2, '7c210003-1111-4aaa-8bbb-000000000023'::uuid, 0),
    ('7c210004-1111-4aaa-8bbb-000000000024'::uuid, '7a9e42d1-5c8b-4f0e-a6c2-9d1b3e4f7a10'::uuid, var_elevacao_pelv,   'Pausa de 2 segundos no topo',                90, 3, '7c210004-1111-4aaa-8bbb-000000000024'::uuid, 0),

    -- wk8 athlete5 — Lower Strength
    ('8c220001-2222-4bbb-8ccc-000000000025'::uuid, '8b1f53e2-6d9c-4a1f-b7d3-a2c4e5f6b821'::uuid, var_agachamento,     'Foco em técnica e profundidade consistente', 120, 0, '8c220001-2222-4bbb-8ccc-000000000025'::uuid, 0),
    ('8c220002-2222-4bbb-8ccc-000000000026'::uuid, '8b1f53e2-6d9c-4a1f-b7d3-a2c4e5f6b821'::uuid, var_leg_press,       'Empurrar com pés estáveis na plataforma',     90, 1, '8c220002-2222-4bbb-8ccc-000000000026'::uuid, 0),
    ('8c220003-2222-4bbb-8ccc-000000000027'::uuid, '8b1f53e2-6d9c-4a1f-b7d3-a2c4e5f6b821'::uuid, var_mesa_flexora,    NULL,                                          75, 2, '8c220003-2222-4bbb-8ccc-000000000027'::uuid, 0),
    ('8c220004-2222-4bbb-8ccc-000000000028'::uuid, '8b1f53e2-6d9c-4a1f-b7d3-a2c4e5f6b821'::uuid, var_elevacao_pelv,   'Subir em velocidade e descer controlando',    90, 3, '8c220004-2222-4bbb-8ccc-000000000028'::uuid, 0),

    -- wk9 athlete6 — Upper Base
    ('9c230001-3333-4ccc-8ddd-000000000029'::uuid, '9c2a64f3-7e0d-4b2a-8ce4-b3d5f607c932'::uuid, var_supino_reto,     NULL,                                         90, 0, '9c230001-3333-4ccc-8ddd-000000000029'::uuid, 0),
    ('9c230002-3333-4ccc-8ddd-00000000002a'::uuid, '9c2a64f3-7e0d-4b2a-8ce4-b3d5f607c932'::uuid, var_remada_cabo,     'Finalizar com peito aberto',                 90, 1, '9c230002-3333-4ccc-8ddd-00000000002a'::uuid, 0),
    ('9c230003-3333-4ccc-8ddd-00000000002b'::uuid, '9c2a64f3-7e0d-4b2a-8ce4-b3d5f607c932'::uuid, var_desenvolvimento, NULL,                                         90, 2, '9c230003-3333-4ccc-8ddd-00000000002b'::uuid, 0),
    ('9c230004-3333-4ccc-8ddd-00000000002c'::uuid, '9c2a64f3-7e0d-4b2a-8ce4-b3d5f607c932'::uuid, var_rosca_direta,    'Sem balanço do tronco',                      60, 3, '9c230004-3333-4ccc-8ddd-00000000002c'::uuid, 0),

    -- wk10 athlete6 — Lower Base
    ('ad240001-4444-4ddd-8eee-00000000002d'::uuid, 'ad3b75a4-8f1e-4c3b-9df5-c4e6a718da43'::uuid, var_agachamento,     NULL,                                         120, 0, 'ad240001-4444-4ddd-8eee-00000000002d'::uuid, 0),
    ('ad240002-4444-4ddd-8eee-00000000002e'::uuid, 'ad3b75a4-8f1e-4c3b-9df5-c4e6a718da43'::uuid, var_leg_press,       'Amplitude sem perder contato lombar',         90, 1, 'ad240002-4444-4ddd-8eee-00000000002e'::uuid, 0),
    ('ad240003-4444-4ddd-8eee-00000000002f'::uuid, 'ad3b75a4-8f1e-4c3b-9df5-c4e6a718da43'::uuid, var_mesa_flexora,    NULL,                                          75, 2, 'ad240003-4444-4ddd-8eee-00000000002f'::uuid, 0),
    ('ad240004-4444-4ddd-8eee-000000000030'::uuid, 'ad3b75a4-8f1e-4c3b-9df5-c4e6a718da43'::uuid, var_elevacao_pelv,   'Manter joelhos alinhados',                    90, 3, 'ad240004-4444-4ddd-8eee-000000000030'::uuid, 0),

    -- wk11 athlete7 — Pull Base
    ('be250001-5555-4eee-8fff-000000000031'::uuid, 'be4c86b5-9a2f-4d4c-ae86-d5f7b829eb54'::uuid, var_puxada_barra,    'Usar assistência elástica se necessário',    90, 0, 'be250001-5555-4eee-8fff-000000000031'::uuid, 0),
    ('be250002-5555-4eee-8fff-000000000032'::uuid, 'be4c86b5-9a2f-4d4c-ae86-d5f7b829eb54'::uuid, var_remada_cabo,     NULL,                                          90, 1, 'be250002-5555-4eee-8fff-000000000032'::uuid, 0),
    ('be250003-5555-4eee-8fff-000000000033'::uuid, 'be4c86b5-9a2f-4d4c-ae86-d5f7b829eb54'::uuid, var_rosca_direta,    NULL,                                          60, 2, 'be250003-5555-4eee-8fff-000000000033'::uuid, 0),
    ('be250004-5555-4eee-8fff-000000000034'::uuid, 'be4c86b5-9a2f-4d4c-ae86-d5f7b829eb54'::uuid, var_elevacao_lat,    'Subir até a linha do ombro',                 60, 3, 'be250004-5555-4eee-8fff-000000000034'::uuid, 0)
  ON CONFLICT DO NOTHING;

  -- ================================================
  -- workout_sets
  --
  -- Regras:
  --   • Exercícios em biset → somente set_type 'normal', mesma quantidade por par
  --   • Exercícios isolados → 1 warmup + N normal (ou somente normal)
  --   • set_order começa em 0
  --   • linked_set_id e load_percent_of_previous usados somente para drop/cluster
  -- ================================================
  INSERT INTO public.workout_sets
    (id, workout_exercise_id, set_order, set_type, reps_min, reps_max, linked_set_id, load_percent_of_previous)
  VALUES

    -- ── we1: Supino Reto (Treino A Lucas) — warmup + 3 normal ──
    ('5c8a08c0-86fd-4dc1-9460-1122f0f02a09'::uuid, 'eddbdb00-f86d-473f-8661-cb40d328e425'::uuid, 0, 'warmup', 12, 15, NULL, NULL),
    ('eb897524-4942-4baa-b199-e4f5f85e4994'::uuid, 'eddbdb00-f86d-473f-8661-cb40d328e425'::uuid, 1, 'normal',  8, 12, NULL, NULL),
    ('155c2c1b-9d3c-4411-a527-3211098253e3'::uuid, 'eddbdb00-f86d-473f-8661-cb40d328e425'::uuid, 2, 'normal',  8, 12, NULL, NULL),
    ('f549633f-5210-4181-ab45-06f3ae595186'::uuid, 'eddbdb00-f86d-473f-8661-cb40d328e425'::uuid, 3, 'normal',  8, 12, NULL, NULL),

    -- ── we2: Supino Inclinado (biset) — 3 normal ──
    ('db7b7f7c-8ce2-4ed4-85bd-280b7960a4fb'::uuid, '8e31acae-fbb2-4221-8405-dba9ec818586'::uuid, 0, 'normal', 10, 15, NULL, NULL),
    ('42f1e17c-663e-42ec-9524-28b170b5eac6'::uuid, '8e31acae-fbb2-4221-8405-dba9ec818586'::uuid, 1, 'normal', 10, 15, NULL, NULL),
    ('ca8540db-c225-4ab0-928a-a6f5127da97f'::uuid, '8e31acae-fbb2-4221-8405-dba9ec818586'::uuid, 2, 'normal', 10, 15, NULL, NULL),

    -- ── we3: Tríceps Corda (biset, mesmo nº de séries que we2) — 3 normal ──
    ('6f993d10-6baa-428d-a43e-635d274dcb49'::uuid, '2d2e7fc0-a786-4951-b32e-80405f4843e0'::uuid, 0, 'normal', 12, 15, NULL, NULL),
    ('ce6d0049-c311-4d12-a782-4b66d6de493f'::uuid, '2d2e7fc0-a786-4951-b32e-80405f4843e0'::uuid, 1, 'normal', 12, 15, NULL, NULL),
    ('68c01f3b-da63-4e19-ae1d-2ea9540e0df7'::uuid, '2d2e7fc0-a786-4951-b32e-80405f4843e0'::uuid, 2, 'normal', 12, 15, NULL, NULL),

    -- ── we4: Puxada na Barra Fixa (Treino B Lucas) — warmup + 3 normal ──
    ('c915f46d-bc87-4e82-95b9-f0c25392a81d'::uuid, '11c87e26-6619-4f14-8f6f-840b9793623b'::uuid, 0, 'warmup',  5,  8, NULL, NULL),
    ('82a1f57e-0f44-4fb3-b58b-ef0e871c6e1b'::uuid, '11c87e26-6619-4f14-8f6f-840b9793623b'::uuid, 1, 'normal',  6, 10, NULL, NULL),
    ('0cec9445-6efb-45b8-83a6-05b1c59fde58'::uuid, '11c87e26-6619-4f14-8f6f-840b9793623b'::uuid, 2, 'normal',  6, 10, NULL, NULL),
    ('17d134ee-d3c7-442c-84cd-d19cba51b846'::uuid, '11c87e26-6619-4f14-8f6f-840b9793623b'::uuid, 3, 'normal',  6, 10, NULL, NULL),

    -- ── we5: Remada Sentada no Cabo — 3 normal ──
    ('cb1ae711-f927-4f3d-bf71-c7553ee43f18'::uuid, '1e8cf022-a470-4932-b943-e46cf7a4f94f'::uuid, 0, 'normal', 10, 12, NULL, NULL),
    ('b2f2b23e-9f0c-4836-b518-4aee71997790'::uuid, '1e8cf022-a470-4932-b943-e46cf7a4f94f'::uuid, 1, 'normal', 10, 12, NULL, NULL),
    ('04ff3401-627d-4ee5-a190-66cae7850344'::uuid, '1e8cf022-a470-4932-b943-e46cf7a4f94f'::uuid, 2, 'normal', 10, 12, NULL, NULL),

    -- ── we6: Puxada Frontal no Cabo (biset) — 3 normal ──
    ('1c4f35e8-f893-4126-b367-36dfb285a878'::uuid, 'd983cc82-a4af-4058-b5e9-8fe79c291c72'::uuid, 0, 'normal', 10, 15, NULL, NULL),
    ('311bb19b-e9c9-40d4-94dc-a5d0b20fd12c'::uuid, 'd983cc82-a4af-4058-b5e9-8fe79c291c72'::uuid, 1, 'normal', 10, 15, NULL, NULL),
    ('67ef3ac4-79ec-4b5a-96c5-4c66dccdf87f'::uuid, 'd983cc82-a4af-4058-b5e9-8fe79c291c72'::uuid, 2, 'normal', 10, 15, NULL, NULL),

    -- ── we7: Rosca Direta (biset, mesmo nº que we6) — 3 normal ──
    ('ee6d26d3-cc60-40cd-824f-5caf2a3a9e82'::uuid, '8f76cdaa-1a4b-4b82-ba82-15e764bfed54'::uuid, 0, 'normal', 10, 12, NULL, NULL),
    ('0def4c21-d7ff-4e89-857c-588e660e143f'::uuid, '8f76cdaa-1a4b-4b82-ba82-15e764bfed54'::uuid, 1, 'normal', 10, 12, NULL, NULL),
    ('f02a247b-54a4-4490-9c54-9b1233ce2b09'::uuid, '8f76cdaa-1a4b-4b82-ba82-15e764bfed54'::uuid, 2, 'normal', 10, 12, NULL, NULL),

    -- ── we8: Agachamento Livre (Treino A Fernanda) — warmup + 4 normal ──
    ('88b8de94-51ab-45e1-823a-278ca6e22394'::uuid, '585467c2-ffcb-4c66-b16c-9198acf2fa23'::uuid, 0, 'warmup', 12, 15, NULL, NULL),
    ('d5778bd1-e188-4769-a5c3-562ff6c319af'::uuid, '585467c2-ffcb-4c66-b16c-9198acf2fa23'::uuid, 1, 'normal',  8, 12, NULL, NULL),
    ('98a6c799-c9cf-43ce-8612-b3c1af9b9bec'::uuid, '585467c2-ffcb-4c66-b16c-9198acf2fa23'::uuid, 2, 'normal',  8, 12, NULL, NULL),
    ('1c405be0-3792-48c6-bca3-29fc04edc0c3'::uuid, '585467c2-ffcb-4c66-b16c-9198acf2fa23'::uuid, 3, 'normal',  8, 12, NULL, NULL),
    ('0a65c258-9909-4673-ad57-4945110f7fdd'::uuid, '585467c2-ffcb-4c66-b16c-9198acf2fa23'::uuid, 4, 'normal',  8, 12, NULL, NULL),

    -- ── we9: Leg Press — 3 normal ──
    ('8cd1ddca-34c0-42c1-99bb-847479a81424'::uuid, '9f9606f7-4d33-469b-91ea-942486ec96d7'::uuid, 0, 'normal', 10, 15, NULL, NULL),
    ('98e797aa-131d-41c2-a288-58713a794fb5'::uuid, '9f9606f7-4d33-469b-91ea-942486ec96d7'::uuid, 1, 'normal', 10, 15, NULL, NULL),
    ('b9cd128d-3aa2-45eb-b061-7c331e280c86'::uuid, '9f9606f7-4d33-469b-91ea-942486ec96d7'::uuid, 2, 'normal', 10, 15, NULL, NULL),

    -- ── we10: Mesa Flexora (biset) — 3 normal ──
    ('63da9f51-57d8-4cba-9f3f-a33fa8b7ebd9'::uuid, 'f031fc90-2a9a-4c84-924a-1f8af362a0df'::uuid, 0, 'normal', 10, 15, NULL, NULL),
    ('fa339cb9-0887-42f4-9fc9-17fc1970cb4a'::uuid, 'f031fc90-2a9a-4c84-924a-1f8af362a0df'::uuid, 1, 'normal', 10, 15, NULL, NULL),
    ('baf4a2ac-c45d-4403-a7ff-c541d2b17977'::uuid, 'f031fc90-2a9a-4c84-924a-1f8af362a0df'::uuid, 2, 'normal', 10, 15, NULL, NULL),

    -- ── we11: Elevação Pélvica (biset, mesmo nº que we10) — 3 normal ──
    ('68e3b367-8520-4bb3-9eed-d7fbeb795083'::uuid, '0946a2cd-d24c-4832-95ee-0a0fdbd611b0'::uuid, 0, 'normal', 12, 15, NULL, NULL),
    ('95c48f57-5a28-4261-8480-c8ce5655bfdf'::uuid, '0946a2cd-d24c-4832-95ee-0a0fdbd611b0'::uuid, 1, 'normal', 12, 15, NULL, NULL),
    ('91d18ae3-3dbe-464e-9350-12ff17261ff8'::uuid, '0946a2cd-d24c-4832-95ee-0a0fdbd611b0'::uuid, 2, 'normal', 12, 15, NULL, NULL),

    -- ── we12: Supino Reto (Full Body Rafael) — warmup + 3 normal ──
    ('ab88c0a0-8493-4ae0-9926-c6e1d96c510a'::uuid, 'd1a0ad4b-8b5e-4d37-b330-dfb0112c9b78'::uuid, 0, 'warmup', 12, 15, NULL, NULL),
    ('780bcedd-30e5-4151-ab59-cc29613c7744'::uuid, 'd1a0ad4b-8b5e-4d37-b330-dfb0112c9b78'::uuid, 1, 'normal',  8, 12, NULL, NULL),
    ('04bbb841-33d3-4190-9a35-c594ade10b3d'::uuid, 'd1a0ad4b-8b5e-4d37-b330-dfb0112c9b78'::uuid, 2, 'normal',  8, 12, NULL, NULL),
    ('1afcd78e-4033-4ffe-9540-eeb280ad1f0e'::uuid, 'd1a0ad4b-8b5e-4d37-b330-dfb0112c9b78'::uuid, 3, 'normal',  8, 12, NULL, NULL),

    -- ── we13: Agachamento Livre (Full Body Rafael) — warmup + 3 normal ──
    ('32bb8660-f685-4372-b3bb-deae58fb60ad'::uuid, '51fa054a-539d-4f58-8511-469473421df6'::uuid, 0, 'warmup', 12, 15, NULL, NULL),
    ('4351f751-e18b-45c5-94cd-a7b99ed11164'::uuid, '51fa054a-539d-4f58-8511-469473421df6'::uuid, 1, 'normal',  8, 12, NULL, NULL),
    ('8afe03e5-6cab-4978-9628-b3df4056d1f8'::uuid, '51fa054a-539d-4f58-8511-469473421df6'::uuid, 2, 'normal',  8, 12, NULL, NULL),
    ('8c6247f8-cf93-4be3-ae47-c0e307e227ff'::uuid, '51fa054a-539d-4f58-8511-469473421df6'::uuid, 3, 'normal',  8, 12, NULL, NULL),

    -- ── we14: Remada Sentada no Cabo (Full Body Rafael) — 3 normal ──
    ('3194d1d9-f8e7-4686-bdd6-f5fc65c62047'::uuid, '96cb499a-f6a1-4773-bc45-52cbf5b06161'::uuid, 0, 'normal', 10, 12, NULL, NULL),
    ('eb599dca-43d3-44a2-8600-c4503504ced7'::uuid, '96cb499a-f6a1-4773-bc45-52cbf5b06161'::uuid, 1, 'normal', 10, 12, NULL, NULL),
    ('8912fc79-ced9-4898-a529-0e37ff12b1b5'::uuid, '96cb499a-f6a1-4773-bc45-52cbf5b06161'::uuid, 2, 'normal', 10, 12, NULL, NULL),

    -- ── we15: Desenvolvimento Militar (Full Body Rafael) — warmup + 3 normal ──
    ('0e6101cd-8299-4f5a-ae4a-b31d528503cb'::uuid, '98cce1eb-002a-4274-853e-2921e4cecf2a'::uuid, 0, 'warmup', 12, 15, NULL, NULL),
    ('13d4183a-8e1f-4019-bc65-e8e4d0e2341b'::uuid, '98cce1eb-002a-4274-853e-2921e4cecf2a'::uuid, 1, 'normal',  8, 12, NULL, NULL),
    ('789463d1-db12-469a-b09d-5f69aa078d29'::uuid, '98cce1eb-002a-4274-853e-2921e4cecf2a'::uuid, 2, 'normal',  8, 12, NULL, NULL),
    ('18e698fa-b3e2-4566-a371-3bf9bd2f865c'::uuid, '98cce1eb-002a-4274-853e-2921e4cecf2a'::uuid, 3, 'normal',  8, 12, NULL, NULL),

    -- ── we16: Supino Reto (Treino A Marcos) — warmup + 4 normal ──
    ('ca05050c-fc8f-4929-ba16-f89ac1412c6e'::uuid, '3c2afa30-3934-425d-89c3-b7615ff07e90'::uuid, 0, 'warmup', 12, 15, NULL, NULL),
    ('8155131a-20c0-4dd5-b993-ec7089b79672'::uuid, '3c2afa30-3934-425d-89c3-b7615ff07e90'::uuid, 1, 'normal',  8, 12, NULL, NULL),
    ('288a32ec-da56-413b-8a8c-3d5b4cf9433c'::uuid, '3c2afa30-3934-425d-89c3-b7615ff07e90'::uuid, 2, 'normal',  8, 12, NULL, NULL),
    ('9a9dfaee-3084-4921-a443-28189dd180f3'::uuid, '3c2afa30-3934-425d-89c3-b7615ff07e90'::uuid, 3, 'normal',  8, 12, NULL, NULL),
    ('2b70aff1-a1f8-4c66-bbf5-7023def244df'::uuid, '3c2afa30-3934-425d-89c3-b7615ff07e90'::uuid, 4, 'normal',  8, 12, NULL, NULL),

    -- ── we17: Supino Inclinado (Treino A Marcos) — 4 normal ──
    ('f75dc00e-7d15-4c2b-9ebe-c5f4003fc528'::uuid, '50acbdfe-42c4-4037-bf4f-e8b4165b8e06'::uuid, 0, 'normal', 10, 15, NULL, NULL),
    ('82cc712f-464b-441e-8b03-fde032febb67'::uuid, '50acbdfe-42c4-4037-bf4f-e8b4165b8e06'::uuid, 1, 'normal', 10, 15, NULL, NULL),
    ('c14ea290-02f8-4a49-9d33-8d1d6c72248b'::uuid, '50acbdfe-42c4-4037-bf4f-e8b4165b8e06'::uuid, 2, 'normal', 10, 15, NULL, NULL),
    ('d009f18e-47ba-4ece-bfb2-1a59373a2843'::uuid, '50acbdfe-42c4-4037-bf4f-e8b4165b8e06'::uuid, 3, 'normal', 10, 15, NULL, NULL),

    -- ── we18: Desenvolvimento Militar (Treino A Marcos) — warmup + 3 normal ──
    ('bd88df0d-1741-42b4-98e5-9dfba8e30160'::uuid, '081a736e-51fe-4b12-b0c5-10ee687d00c7'::uuid, 0, 'warmup', 10, 15, NULL, NULL),
    ('531c42ab-ba3e-4e0c-85c0-f6e4950bc29c'::uuid, '081a736e-51fe-4b12-b0c5-10ee687d00c7'::uuid, 1, 'normal',  8, 12, NULL, NULL),
    ('34e62acc-7607-4166-a811-8edf23c35167'::uuid, '081a736e-51fe-4b12-b0c5-10ee687d00c7'::uuid, 2, 'normal',  8, 12, NULL, NULL),
    ('c385116c-c034-408f-b2d2-d11553c4b04c'::uuid, '081a736e-51fe-4b12-b0c5-10ee687d00c7'::uuid, 3, 'normal',  8, 12, NULL, NULL),

    -- ── we19: Elevação Lateral (biset) — 3 normal ──
    ('d45aa959-e751-47a1-9b67-ec24db080f64'::uuid, '8d59cf84-14f5-42d5-be73-4876aee6b69b'::uuid, 0, 'normal', 12, 15, NULL, NULL),
    ('4866dc65-ef1e-4eef-9df5-4a4d2dbd6a83'::uuid, '8d59cf84-14f5-42d5-be73-4876aee6b69b'::uuid, 1, 'normal', 12, 15, NULL, NULL),
    ('362438ea-709f-4036-b826-2c74830a67a4'::uuid, '8d59cf84-14f5-42d5-be73-4876aee6b69b'::uuid, 2, 'normal', 12, 15, NULL, NULL),

    -- ── we20: Tríceps Corda (biset, mesmo nº que we19) — 3 normal ──
    ('83001e63-0341-4ae6-841c-acc512307e22'::uuid, 'a3c5d46c-a9bf-4bca-94a8-fd275cec9fea'::uuid, 0, 'normal', 12, 15, NULL, NULL),
    ('280b0f9c-93fe-4331-9c10-258eb94a8a10'::uuid, 'a3c5d46c-a9bf-4bca-94a8-fd275cec9fea'::uuid, 1, 'normal', 12, 15, NULL, NULL),
    ('46efe9d9-a47d-4dc5-9815-ca0bddfb0902'::uuid, 'a3c5d46c-a9bf-4bca-94a8-fd275cec9fea'::uuid, 2, 'normal', 12, 15, NULL, NULL)

  ON CONFLICT DO NOTHING;

  INSERT INTO public.workout_sets
    (id, workout_exercise_id, set_order, set_type, reps_min, reps_max, linked_set_id, load_percent_of_previous)
  SELECT
    gen_random_uuid(),
    exercise_id,
    set_order,
    set_type,
    reps_min,
    reps_max,
    NULL,
    NULL
  FROM (
    -- wk7 athlete2 — Posteriores e Costas
    VALUES
      ('7c210001-1111-4aaa-8bbb-000000000021'::uuid, 0, 'warmup', 12, 15),
      ('7c210001-1111-4aaa-8bbb-000000000021'::uuid, 1, 'normal', 10, 12),
      ('7c210001-1111-4aaa-8bbb-000000000021'::uuid, 2, 'normal', 10, 12),
      ('7c210001-1111-4aaa-8bbb-000000000021'::uuid, 3, 'normal', 10, 12),
      ('7c210002-1111-4aaa-8bbb-000000000022'::uuid, 0, 'normal', 10, 15),
      ('7c210002-1111-4aaa-8bbb-000000000022'::uuid, 1, 'normal', 10, 15),
      ('7c210002-1111-4aaa-8bbb-000000000022'::uuid, 2, 'normal', 10, 15),
      ('7c210003-1111-4aaa-8bbb-000000000023'::uuid, 0, 'normal', 12, 15),
      ('7c210003-1111-4aaa-8bbb-000000000023'::uuid, 1, 'normal', 12, 15),
      ('7c210003-1111-4aaa-8bbb-000000000023'::uuid, 2, 'normal', 12, 15),
      ('7c210004-1111-4aaa-8bbb-000000000024'::uuid, 0, 'warmup', 12, 15),
      ('7c210004-1111-4aaa-8bbb-000000000024'::uuid, 1, 'normal', 10, 12),
      ('7c210004-1111-4aaa-8bbb-000000000024'::uuid, 2, 'normal', 10, 12),
      ('7c210004-1111-4aaa-8bbb-000000000024'::uuid, 3, 'normal', 10, 12),

      -- wk8 athlete5 — Lower Strength
      ('8c220001-2222-4bbb-8ccc-000000000025'::uuid, 0, 'warmup', 12, 15),
      ('8c220001-2222-4bbb-8ccc-000000000025'::uuid, 1, 'normal', 6, 8),
      ('8c220001-2222-4bbb-8ccc-000000000025'::uuid, 2, 'normal', 6, 8),
      ('8c220001-2222-4bbb-8ccc-000000000025'::uuid, 3, 'normal', 6, 8),
      ('8c220002-2222-4bbb-8ccc-000000000026'::uuid, 0, 'normal', 8, 10),
      ('8c220002-2222-4bbb-8ccc-000000000026'::uuid, 1, 'normal', 8, 10),
      ('8c220002-2222-4bbb-8ccc-000000000026'::uuid, 2, 'normal', 8, 10),
      ('8c220003-2222-4bbb-8ccc-000000000027'::uuid, 0, 'normal', 10, 12),
      ('8c220003-2222-4bbb-8ccc-000000000027'::uuid, 1, 'normal', 10, 12),
      ('8c220003-2222-4bbb-8ccc-000000000027'::uuid, 2, 'normal', 10, 12),
      ('8c220004-2222-4bbb-8ccc-000000000028'::uuid, 0, 'warmup', 12, 15),
      ('8c220004-2222-4bbb-8ccc-000000000028'::uuid, 1, 'normal', 8, 10),
      ('8c220004-2222-4bbb-8ccc-000000000028'::uuid, 2, 'normal', 8, 10),
      ('8c220004-2222-4bbb-8ccc-000000000028'::uuid, 3, 'normal', 8, 10),

      -- wk9 athlete6 — Upper Base
      ('9c230001-3333-4ccc-8ddd-000000000029'::uuid, 0, 'warmup', 12, 15),
      ('9c230001-3333-4ccc-8ddd-000000000029'::uuid, 1, 'normal', 8, 12),
      ('9c230001-3333-4ccc-8ddd-000000000029'::uuid, 2, 'normal', 8, 12),
      ('9c230001-3333-4ccc-8ddd-000000000029'::uuid, 3, 'normal', 8, 12),
      ('9c230002-3333-4ccc-8ddd-00000000002a'::uuid, 0, 'normal', 10, 12),
      ('9c230002-3333-4ccc-8ddd-00000000002a'::uuid, 1, 'normal', 10, 12),
      ('9c230002-3333-4ccc-8ddd-00000000002a'::uuid, 2, 'normal', 10, 12),
      ('9c230003-3333-4ccc-8ddd-00000000002b'::uuid, 0, 'warmup', 12, 15),
      ('9c230003-3333-4ccc-8ddd-00000000002b'::uuid, 1, 'normal', 8, 12),
      ('9c230003-3333-4ccc-8ddd-00000000002b'::uuid, 2, 'normal', 8, 12),
      ('9c230003-3333-4ccc-8ddd-00000000002b'::uuid, 3, 'normal', 8, 12),
      ('9c230004-3333-4ccc-8ddd-00000000002c'::uuid, 0, 'normal', 10, 12),
      ('9c230004-3333-4ccc-8ddd-00000000002c'::uuid, 1, 'normal', 10, 12),
      ('9c230004-3333-4ccc-8ddd-00000000002c'::uuid, 2, 'normal', 10, 12),

      -- wk10 athlete6 — Lower Base
      ('ad240001-4444-4ddd-8eee-00000000002d'::uuid, 0, 'warmup', 12, 15),
      ('ad240001-4444-4ddd-8eee-00000000002d'::uuid, 1, 'normal', 8, 10),
      ('ad240001-4444-4ddd-8eee-00000000002d'::uuid, 2, 'normal', 8, 10),
      ('ad240001-4444-4ddd-8eee-00000000002d'::uuid, 3, 'normal', 8, 10),
      ('ad240002-4444-4ddd-8eee-00000000002e'::uuid, 0, 'normal', 10, 12),
      ('ad240002-4444-4ddd-8eee-00000000002e'::uuid, 1, 'normal', 10, 12),
      ('ad240002-4444-4ddd-8eee-00000000002e'::uuid, 2, 'normal', 10, 12),
      ('ad240003-4444-4ddd-8eee-00000000002f'::uuid, 0, 'normal', 12, 15),
      ('ad240003-4444-4ddd-8eee-00000000002f'::uuid, 1, 'normal', 12, 15),
      ('ad240003-4444-4ddd-8eee-00000000002f'::uuid, 2, 'normal', 12, 15),
      ('ad240004-4444-4ddd-8eee-000000000030'::uuid, 0, 'warmup', 12, 15),
      ('ad240004-4444-4ddd-8eee-000000000030'::uuid, 1, 'normal', 10, 12),
      ('ad240004-4444-4ddd-8eee-000000000030'::uuid, 2, 'normal', 10, 12),
      ('ad240004-4444-4ddd-8eee-000000000030'::uuid, 3, 'normal', 10, 12),

      -- wk11 athlete7 — Pull Base
      ('be250001-5555-4eee-8fff-000000000031'::uuid, 0, 'warmup', 5, 8),
      ('be250001-5555-4eee-8fff-000000000031'::uuid, 1, 'normal', 6, 10),
      ('be250001-5555-4eee-8fff-000000000031'::uuid, 2, 'normal', 6, 10),
      ('be250001-5555-4eee-8fff-000000000031'::uuid, 3, 'normal', 6, 10),
      ('be250002-5555-4eee-8fff-000000000032'::uuid, 0, 'normal', 10, 12),
      ('be250002-5555-4eee-8fff-000000000032'::uuid, 1, 'normal', 10, 12),
      ('be250002-5555-4eee-8fff-000000000032'::uuid, 2, 'normal', 10, 12),
      ('be250003-5555-4eee-8fff-000000000033'::uuid, 0, 'normal', 10, 12),
      ('be250003-5555-4eee-8fff-000000000033'::uuid, 1, 'normal', 10, 12),
      ('be250003-5555-4eee-8fff-000000000033'::uuid, 2, 'normal', 10, 12),
      ('be250004-5555-4eee-8fff-000000000034'::uuid, 0, 'normal', 12, 15),
      ('be250004-5555-4eee-8fff-000000000034'::uuid, 1, 'normal', 12, 15),
      ('be250004-5555-4eee-8fff-000000000034'::uuid, 2, 'normal', 12, 15)
  ) AS new_sets(exercise_id, set_order, set_type, reps_min, reps_max)
  ON CONFLICT DO NOTHING;

  -- ================================================
  -- workout_variation_records
  -- PRs históricos por atleta para as variações dos seus treinos
  -- max_weight_kg NULL para exercícios com peso corporal (ex: barra fixa)
  -- ================================================
  INSERT INTO public.workout_variation_records
    (user_id, variation_id, max_weight_kg, max_volume_kg, max_reps, max_sets)
  VALUES
    -- Lucas Silva (athlete1) — Treino A e B
    (athlete1_id, var_supino_reto,       80.00,  2880.00, 12, 4),
    (athlete1_id, var_supino_inclinado,  60.00,  2700.00, 15, 3),
    (athlete1_id, var_triceps_corda,     30.00,  1350.00, 15, 3),
    (athlete1_id, var_puxada_barra,       NULL,   700.00, 10, 4),
    (athlete1_id, var_remada_cabo,        50.00, 1800.00, 12, 3),
    (athlete1_id, var_puxada_cabo,        45.00, 2025.00, 15, 3),
    (athlete1_id, var_rosca_direta,       25.00,  900.00, 12, 3),

    -- Fernanda Costa (athlete2) — Treino A Inferiores
    (athlete2_id, var_agachamento,        60.00, 3600.00, 12, 5),
    (athlete2_id, var_leg_press,         100.00, 4500.00, 15, 3),
    (athlete2_id, var_mesa_flexora,       25.00, 1125.00, 15, 3),
    (athlete2_id, var_elevacao_pelv,      40.00, 1800.00, 15, 3),

    -- Rafael Oliveira (athlete3) — Full Body
    (athlete3_id, var_supino_reto,        50.00, 1800.00, 12, 4),
    (athlete3_id, var_agachamento,        60.00, 2160.00, 12, 4),
    (athlete3_id, var_remada_cabo,        35.00, 1260.00, 12, 3),
    (athlete3_id, var_desenvolvimento,    30.00, 1080.00, 12, 4),

    -- Marcos Santos (athlete5) — Treino A Empurrar
    (athlete5_id, var_supino_reto,       100.00, 4800.00, 12, 5),
    (athlete5_id, var_supino_inclinado,   80.00, 4800.00, 15, 4),
    (athlete5_id, var_desenvolvimento,    60.00, 2880.00, 12, 4),
    (athlete5_id, var_elevacao_lat,       15.00,  675.00, 15, 3),
    (athlete5_id, var_triceps_corda,      40.00, 1800.00, 15, 3),

    -- Fernanda Costa (athlete2) — Treino B Posteriores e Costas
    (athlete2_id, var_remada_cabo,        42.50, 1530.00, 12, 3),
    (athlete2_id, var_puxada_cabo,        40.00, 1800.00, 15, 3),

    -- Diego Lima (athlete6) — Upper / Lower Base
    (athlete6_id, var_supino_reto,        72.50, 2610.00, 12, 4),
    (athlete6_id, var_remada_cabo,        47.50, 1710.00, 12, 3),
    (athlete6_id, var_desenvolvimento,    37.50, 1350.00, 12, 4),
    (athlete6_id, var_rosca_direta,       22.50,  810.00, 12, 3),
    (athlete6_id, var_agachamento,        82.50, 2970.00, 10, 4),
    (athlete6_id, var_leg_press,         140.00, 4200.00, 12, 3),
    (athlete6_id, var_mesa_flexora,       32.50, 1170.00, 15, 3),
    (athlete6_id, var_elevacao_pelv,      70.00, 2520.00, 12, 4),

    -- Paula Ferreira (athlete7) — Pull Base
    (athlete7_id, var_puxada_barra,        NULL,  756.00, 9, 4),
    (athlete7_id, var_remada_cabo,        37.50, 1350.00, 12, 3),
    (athlete7_id, var_rosca_direta,       20.00,  720.00, 12, 3),
    (athlete7_id, var_elevacao_lat,       10.00,  450.00, 15, 3)

  ON CONFLICT (user_id, variation_id) DO NOTHING;

END $$;

-- ================================================
-- Treinos adicionais para Lucas Silva (athlete1)
-- organizados em pastas. Mantém wk1 (Treino A) na raiz.
-- ================================================
DO $$
DECLARE
  athlete1_id uuid := 'af890a2d-f0fd-415e-b69d-2a52d061b8bc';
  coach1_id   uuid := '39e03cce-5ca5-46c2-b34d-92682a582f05';

  folder_hiper uuid := '1a111111-aaaa-4aaa-aaaa-000000000001';
  folder_forca uuid := '2a222222-bbbb-4bbb-bbbb-000000000002';

  wk_c  uuid := 'cc111101-1111-4aaa-9aaa-000000000101';
  wk_d  uuid := 'cc111102-1111-4aaa-9aaa-000000000102';
  wk_f1 uuid := 'cc111201-2222-4bbb-9bbb-000000000201';
  wk_f2 uuid := 'cc111202-2222-4bbb-9bbb-000000000202';

  we_c_1 uuid := 'cc111101-1001-4aaa-9aaa-000000001001';
  we_c_2 uuid := 'cc111101-1002-4aaa-9aaa-000000001002';
  we_c_3 uuid := 'cc111101-1003-4aaa-9aaa-000000001003';
  we_c_4 uuid := 'cc111101-1004-4aaa-9aaa-000000001004';

  we_d_1 uuid := 'cc111102-1001-4aaa-9aaa-000000002001';
  we_d_2 uuid := 'cc111102-1002-4aaa-9aaa-000000002002';
  we_d_3 uuid := 'cc111102-1003-4aaa-9aaa-000000002003';

  we_f1_1 uuid := 'cc111201-1001-4bbb-9bbb-000000003001';
  we_f1_2 uuid := 'cc111201-1002-4bbb-9bbb-000000003002';

  we_f2_1 uuid := 'cc111202-1001-4bbb-9bbb-000000004001';
  we_f2_2 uuid := 'cc111202-1002-4bbb-9bbb-000000004002';

  var_supino_reto      uuid;
  var_supino_inclinado uuid;
  var_agachamento      uuid;
  var_leg_press        uuid;
  var_mesa_flexora     uuid;
  var_elevacao_pelv    uuid;
BEGIN
  SELECT id INTO var_supino_reto      FROM public.variations WHERE exercise_id = (SELECT id FROM public.exercises WHERE name = 'Supino'              LIMIT 1) LIMIT 1;
  SELECT id INTO var_supino_inclinado FROM public.variations WHERE exercise_id = (SELECT id FROM public.exercises WHERE name = 'Supino Inclinado'    LIMIT 1) LIMIT 1;
  SELECT id INTO var_agachamento      FROM public.variations WHERE exercise_id = (SELECT id FROM public.exercises WHERE name = 'Agachamento'          LIMIT 1) LIMIT 1;
  SELECT id INTO var_leg_press        FROM public.variations WHERE exercise_id = (SELECT id FROM public.exercises WHERE name = 'Leg Press 45'         LIMIT 1) LIMIT 1;
  SELECT id INTO var_mesa_flexora     FROM public.variations WHERE exercise_id = (SELECT id FROM public.exercises WHERE name = 'Mesa Flexora'         LIMIT 1) LIMIT 1;
  SELECT id INTO var_elevacao_pelv    FROM public.variations WHERE exercise_id = (SELECT id FROM public.exercises WHERE name = 'Elevação Pélvica'     LIMIT 1) LIMIT 1;

  -- Pastas de Lucas
  INSERT INTO public.workout_folders (id, user_id, name, color)
  VALUES
    (folder_hiper, athlete1_id, 'Hipertrofia', 'blue'),
    (folder_forca, athlete1_id, 'Força',       'amber')
  ON CONFLICT DO NOTHING;

  -- Move Treino B (Costas e Bíceps) para Hipertrofia. Treino A fica na raiz.
  UPDATE public.workouts
    SET folder_id = folder_hiper
  WHERE id = 'd94823aa-e98d-4516-9088-eee775693846'::uuid;

  -- Novos treinos
  INSERT INTO public.workouts
    (id, user_id, name, description, folder_id, created_by, updated_by)
  VALUES
    (wk_c,  athlete1_id, 'Treino C — Quadríceps',
     'Quadríceps dominante com biset posterior finalizador',
     folder_hiper, coach1_id, coach1_id),
    (wk_d,  athlete1_id, 'Treino D — Posterior e Glúteos',
     'Posteriores de coxa e glúteos com volume moderado',
     folder_hiper, coach1_id, coach1_id),
    (wk_f1, athlete1_id, 'Força — Agachamento 5x5',
     'Bloco de força de membros inferiores com progressão linear',
     folder_forca, coach1_id, coach1_id),
    (wk_f2, athlete1_id, 'Força — Supino 5x5',
     'Bloco de força de empurrar com progressão linear',
     folder_forca, coach1_id, coach1_id)
  ON CONFLICT DO NOTHING;

  -- workout_exercises
  INSERT INTO public.workout_exercises
    (id, workout_id, variation_id, note, rest_seconds, position, superset_group_id, superset_order)
  VALUES
    -- Treino C — Quadríceps
    (we_c_1, wk_c, var_agachamento,  NULL,               120, 0, we_c_1, 0),
    (we_c_2, wk_c, var_leg_press,    NULL,                90, 1, we_c_2, 0),
    (we_c_3, wk_c, var_mesa_flexora, NULL,                60, 2, we_c_3, 0),
    (we_c_4, wk_c, var_elevacao_pelv,'Pausa 1s no topo', 60, 2, we_c_3, 1),

    -- Treino D — Posterior e Glúteos
    (we_d_1, wk_d, var_mesa_flexora,  'Descer controlado 3s',            90, 0, we_d_1, 0),
    (we_d_2, wk_d, var_elevacao_pelv, 'Pausa 2s no topo',                90, 1, we_d_2, 0),
    (we_d_3, wk_d, var_leg_press,     'Pés altos para ênfase posterior',90, 2, we_d_3, 0),

    -- Força — Agachamento 5x5
    (we_f1_1, wk_f1, var_agachamento, 'Progressão linear semanal', 180, 0, we_f1_1, 0),
    (we_f1_2, wk_f1, var_leg_press,   'Acessório de volume',       120, 1, we_f1_2, 0),

    -- Força — Supino 5x5
    (we_f2_1, wk_f2, var_supino_reto,      'Pausa de 1s no peito',      180, 0, we_f2_1, 0),
    (we_f2_2, wk_f2, var_supino_inclinado, 'Acessório de hipertrofia', 120, 1, we_f2_2, 0)
  ON CONFLICT DO NOTHING;

  -- workout_sets
  INSERT INTO public.workout_sets
    (id, workout_exercise_id, set_order, set_type, reps_min, reps_max, linked_set_id, load_percent_of_previous)
  SELECT gen_random_uuid(), exercise_id, set_order, set_type, reps_min, reps_max, NULL, NULL
  FROM (VALUES
    -- Treino C
    (we_c_1, 0, 'warmup', 12, 15),
    (we_c_1, 1, 'normal',  8, 12),
    (we_c_1, 2, 'normal',  8, 12),
    (we_c_1, 3, 'normal',  8, 12),
    (we_c_2, 0, 'normal', 10, 15),
    (we_c_2, 1, 'normal', 10, 15),
    (we_c_2, 2, 'normal', 10, 15),
    (we_c_3, 0, 'normal', 10, 12),
    (we_c_3, 1, 'normal', 10, 12),
    (we_c_3, 2, 'normal', 10, 12),
    (we_c_4, 0, 'normal', 10, 12),
    (we_c_4, 1, 'normal', 10, 12),
    (we_c_4, 2, 'normal', 10, 12),

    -- Treino D
    (we_d_1, 0, 'warmup', 12, 15),
    (we_d_1, 1, 'normal', 10, 12),
    (we_d_1, 2, 'normal', 10, 12),
    (we_d_1, 3, 'normal', 10, 12),
    (we_d_2, 0, 'normal', 10, 12),
    (we_d_2, 1, 'normal', 10, 12),
    (we_d_2, 2, 'normal', 10, 12),
    (we_d_3, 0, 'normal', 12, 15),
    (we_d_3, 1, 'normal', 12, 15),
    (we_d_3, 2, 'normal', 12, 15),

    -- Força Agachamento 5x5
    (we_f1_1, 0, 'warmup', 8, 10),
    (we_f1_1, 1, 'normal', 5,  5),
    (we_f1_1, 2, 'normal', 5,  5),
    (we_f1_1, 3, 'normal', 5,  5),
    (we_f1_1, 4, 'normal', 5,  5),
    (we_f1_1, 5, 'normal', 5,  5),
    (we_f1_2, 0, 'normal', 6,  8),
    (we_f1_2, 1, 'normal', 6,  8),
    (we_f1_2, 2, 'normal', 6,  8),

    -- Força Supino 5x5
    (we_f2_1, 0, 'warmup', 8, 10),
    (we_f2_1, 1, 'normal', 5,  5),
    (we_f2_1, 2, 'normal', 5,  5),
    (we_f2_1, 3, 'normal', 5,  5),
    (we_f2_1, 4, 'normal', 5,  5),
    (we_f2_1, 5, 'normal', 5,  5),
    (we_f2_2, 0, 'normal', 6,  8),
    (we_f2_2, 1, 'normal', 6,  8),
    (we_f2_2, 2, 'normal', 6,  8)
  ) AS s(exercise_id, set_order, set_type, reps_min, reps_max)
  ON CONFLICT DO NOTHING;
END $$;

SET session_replication_role = 'origin';
