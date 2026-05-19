-- ================================================
-- SEED: Periodizações, template days/activities, ajustes, notas e ocorrências
--
-- Cenários cobertos:
-- • periodizações draft, active e completed
-- • exatamente um conjunto de template days por periodização
-- • dias de treino e descanso
-- • notas gerais e notas vinculadas a um treino específico
-- • ocorrências pending, done e skipped
-- • periodizações passadas com pending em datas antigas para validar missed derivado na UI
-- • ocorrências done ligadas a workout_logs reais
-- ================================================

SET session_replication_role = 'replica';

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
BEGIN
  INSERT INTO public.periodizations
    (id, created_by, athlete_id, start_date, end_date, objective, status, notification_days_before)
  VALUES
    ('c1100001-aaaa-4aaa-8aaa-000000000001'::uuid, coach1_id, athlete1_id, CURRENT_DATE - 6,  CURRENT_DATE + 21, 'Hipertrofia com alternância A/B em bloco contínuo',        'completed', 5),
    ('c2200002-bbbb-4bbb-8bbb-000000000002'::uuid, coach1_id, athlete2_id, CURRENT_DATE - 20, CURRENT_DATE - 5,  'Bloco de base para inferiores e posteriores',              'completed', 4),
    ('c3300003-cccc-4ccc-8ccc-000000000003'::uuid, coach1_id, athlete3_id, CURRENT_DATE + 7,  CURRENT_DATE + 26, 'Introdução a periodização full body com progressão linear', 'draft',     7),
    ('c4400004-dddd-4ddd-8ddd-000000000004'::uuid, coach1_id, athlete4_id, CURRENT_DATE - 12, CURRENT_DATE - 1,  'Retorno gradual após pausa, com foco em consistência',      'completed', 3),
    ('c5500005-eeee-4eee-8eee-000000000005'::uuid, coach2_id, athlete5_id, CURRENT_DATE - 8,  CURRENT_DATE + 15, 'Força em empurrar e base de pernas',                       'active',    6),
    ('c6600006-ffff-4fff-8aaa-000000000006'::uuid, coach2_id, athlete6_id, CURRENT_DATE + 3,  CURRENT_DATE + 18, 'Base técnica upper/lower com progressão simples',          'draft',     7),
    ('c7700007-abab-4aaa-8bbb-000000000007'::uuid, coach2_id, athlete7_id, CURRENT_DATE - 8,  CURRENT_DATE - 1,  'Manutenção de puxadas com frequência baixa',               'completed', 2),
    ('c8800008-bcbc-4ccc-8ddd-000000000008'::uuid, coach1_id, athlete1_id, CURRENT_DATE - 45, CURRENT_DATE - 30, 'Bloco antigo de retomada com adesão irregular',            'completed', 3),
    ('c9900009-cdcd-4ddd-8eee-000000000009'::uuid, coach2_id, athlete5_id, CURRENT_DATE - 32, CURRENT_DATE - 21, 'Bloco encerrado de força com sessões em aberto',           'completed', 4)
  ON CONFLICT DO NOTHING;

  -- ----------------------------------------------------------------
  -- Template days  (replaces periodization_microcycles +
  --                  periodization_microcycle_days)
  -- UUID prefix: b + same suffix as the old microcycle_day UUID
  -- ----------------------------------------------------------------
  INSERT INTO public.periodization_template_days
    (id, periodization_id, position, day_type)
  VALUES
    -- athlete1 active  (c1)
    ('b1100001-aaaa-4aaa-8aaa-000000000101'::uuid, 'c1100001-aaaa-4aaa-8aaa-000000000001'::uuid, 0, 'training'),
    ('b1100002-aaaa-4aaa-8aaa-000000000102'::uuid, 'c1100001-aaaa-4aaa-8aaa-000000000001'::uuid, 1, 'rest'),
    ('b1100003-aaaa-4aaa-8aaa-000000000103'::uuid, 'c1100001-aaaa-4aaa-8aaa-000000000001'::uuid, 2, 'training'),
    ('b1100004-aaaa-4aaa-8aaa-000000000104'::uuid, 'c1100001-aaaa-4aaa-8aaa-000000000001'::uuid, 3, 'rest'),

    -- athlete2 completed  (c2)
    ('b2200001-bbbb-4bbb-8bbb-000000000201'::uuid, 'c2200002-bbbb-4bbb-8bbb-000000000002'::uuid, 0, 'training'),
    ('b2200002-bbbb-4bbb-8bbb-000000000202'::uuid, 'c2200002-bbbb-4bbb-8bbb-000000000002'::uuid, 1, 'rest'),
    ('b2200003-bbbb-4bbb-8bbb-000000000203'::uuid, 'c2200002-bbbb-4bbb-8bbb-000000000002'::uuid, 2, 'training'),
    ('b2200004-bbbb-4bbb-8bbb-000000000204'::uuid, 'c2200002-bbbb-4bbb-8bbb-000000000002'::uuid, 3, 'rest'),

    -- athlete3 draft  (c3)
    ('b3300001-cccc-4ccc-8ccc-000000000301'::uuid, 'c3300003-cccc-4ccc-8ccc-000000000003'::uuid, 0, 'training'),
    ('b3300002-cccc-4ccc-8ccc-000000000302'::uuid, 'c3300003-cccc-4ccc-8ccc-000000000003'::uuid, 1, 'rest'),
    ('b3300003-cccc-4ccc-8ccc-000000000303'::uuid, 'c3300003-cccc-4ccc-8ccc-000000000003'::uuid, 2, 'training'),
    ('b3300004-cccc-4ccc-8ccc-000000000304'::uuid, 'c3300003-cccc-4ccc-8ccc-000000000003'::uuid, 3, 'rest'),

    -- athlete4 completed  (c4)
    ('b4400001-dddd-4ddd-8ddd-000000000401'::uuid, 'c4400004-dddd-4ddd-8ddd-000000000004'::uuid, 0, 'training'),
    ('b4400002-dddd-4ddd-8ddd-000000000402'::uuid, 'c4400004-dddd-4ddd-8ddd-000000000004'::uuid, 1, 'rest'),
    ('b4400003-dddd-4ddd-8ddd-000000000403'::uuid, 'c4400004-dddd-4ddd-8ddd-000000000004'::uuid, 2, 'training'),
    ('b4400004-dddd-4ddd-8ddd-000000000404'::uuid, 'c4400004-dddd-4ddd-8ddd-000000000004'::uuid, 3, 'rest'),

    -- athlete5 active  (c5)
    ('b5500001-eeee-4eee-8eee-000000000501'::uuid, 'c5500005-eeee-4eee-8eee-000000000005'::uuid, 0, 'training'),
    ('b5500002-eeee-4eee-8eee-000000000502'::uuid, 'c5500005-eeee-4eee-8eee-000000000005'::uuid, 1, 'rest'),
    ('b5500003-eeee-4eee-8eee-000000000503'::uuid, 'c5500005-eeee-4eee-8eee-000000000005'::uuid, 2, 'training'),
    ('b5500004-eeee-4eee-8eee-000000000504'::uuid, 'c5500005-eeee-4eee-8eee-000000000005'::uuid, 3, 'rest'),

    -- athlete6 draft  (c6)
    ('b6600001-ffff-4fff-8aaa-000000000601'::uuid, 'c6600006-ffff-4fff-8aaa-000000000006'::uuid, 0, 'training'),
    ('b6600002-ffff-4fff-8aaa-000000000602'::uuid, 'c6600006-ffff-4fff-8aaa-000000000006'::uuid, 1, 'rest'),
    ('b6600003-ffff-4fff-8aaa-000000000603'::uuid, 'c6600006-ffff-4fff-8aaa-000000000006'::uuid, 2, 'training'),
    ('b6600004-ffff-4fff-8aaa-000000000604'::uuid, 'c6600006-ffff-4fff-8aaa-000000000006'::uuid, 3, 'rest'),

    -- athlete7 completed  (c7)
    ('b7700001-abab-4aaa-8bbb-000000000701'::uuid, 'c7700007-abab-4aaa-8bbb-000000000007'::uuid, 0, 'training'),
    ('b7700002-abab-4aaa-8bbb-000000000702'::uuid, 'c7700007-abab-4aaa-8bbb-000000000007'::uuid, 1, 'rest'),

    -- athlete1 completed history  (c8)
    ('b8800001-bcbc-4ccc-8ddd-000000000801'::uuid, 'c8800008-bcbc-4ccc-8ddd-000000000008'::uuid, 0, 'training'),
    ('b8800002-bcbc-4ccc-8ddd-000000000802'::uuid, 'c8800008-bcbc-4ccc-8ddd-000000000008'::uuid, 1, 'rest'),
    ('b8800003-bcbc-4ccc-8ddd-000000000803'::uuid, 'c8800008-bcbc-4ccc-8ddd-000000000008'::uuid, 2, 'training'),
    ('b8800004-bcbc-4ccc-8ddd-000000000804'::uuid, 'c8800008-bcbc-4ccc-8ddd-000000000008'::uuid, 3, 'rest'),

    -- athlete5 completed history  (c9)
    ('b9900001-cdcd-4ddd-8eee-000000000901'::uuid, 'c9900009-cdcd-4ddd-8eee-000000000009'::uuid, 0, 'training'),
    ('b9900002-cdcd-4ddd-8eee-000000000902'::uuid, 'c9900009-cdcd-4ddd-8eee-000000000009'::uuid, 1, 'rest'),
    ('b9900003-cdcd-4ddd-8eee-000000000903'::uuid, 'c9900009-cdcd-4ddd-8eee-000000000009'::uuid, 2, 'training'),
    ('b9900004-cdcd-4ddd-8eee-000000000904'::uuid, 'c9900009-cdcd-4ddd-8eee-000000000009'::uuid, 3, 'rest')
  ON CONFLICT DO NOTHING;

  -- ----------------------------------------------------------------
  -- Template activities  (one per training day, position=0, kind='workout')
  -- UUID prefix: a + same suffix as the corresponding template_day UUID
  -- ----------------------------------------------------------------
  INSERT INTO public.periodization_template_activities
    (id, template_day_id, position, kind, workout_id)
  VALUES
    -- athlete1 active  (c1)
    ('a1100001-aaaa-4aaa-8aaa-000000000101'::uuid, 'b1100001-aaaa-4aaa-8aaa-000000000101'::uuid, 0, 'workout', '52f2bbe7-0c3f-4728-b7c9-34a2223cf0b8'::uuid),
    ('a1100003-aaaa-4aaa-8aaa-000000000103'::uuid, 'b1100003-aaaa-4aaa-8aaa-000000000103'::uuid, 0, 'workout', 'd94823aa-e98d-4516-9088-eee775693846'::uuid),

    -- athlete2 completed  (c2)
    ('a2200001-bbbb-4bbb-8bbb-000000000201'::uuid, 'b2200001-bbbb-4bbb-8bbb-000000000201'::uuid, 0, 'workout', 'fe83e1d8-6a4f-4809-a12c-dd3d4d986d29'::uuid),
    ('a2200003-bbbb-4bbb-8bbb-000000000203'::uuid, 'b2200003-bbbb-4bbb-8bbb-000000000203'::uuid, 0, 'workout', '7a9e42d1-5c8b-4f0e-a6c2-9d1b3e4f7a10'::uuid),

    -- athlete3 draft  (c3)
    ('a3300001-cccc-4ccc-8ccc-000000000301'::uuid, 'b3300001-cccc-4ccc-8ccc-000000000301'::uuid, 0, 'workout', '78eca90c-cc5b-46b5-93db-c6f7eed696ce'::uuid),
    ('a3300003-cccc-4ccc-8ccc-000000000303'::uuid, 'b3300003-cccc-4ccc-8ccc-000000000303'::uuid, 0, 'workout', '78eca90c-cc5b-46b5-93db-c6f7eed696ce'::uuid),

    -- athlete4 completed  (c4)
    ('a4400001-dddd-4ddd-8ddd-000000000401'::uuid, 'b4400001-dddd-4ddd-8ddd-000000000401'::uuid, 0, 'workout', 'c3a9f0b2-1d4e-4a7c-8f5b-6e2d3c4a5b6c'::uuid),
    ('a4400003-dddd-4ddd-8ddd-000000000403'::uuid, 'b4400003-dddd-4ddd-8ddd-000000000403'::uuid, 0, 'workout', 'c3a9f0b2-1d4e-4a7c-8f5b-6e2d3c4a5b6c'::uuid),

    -- athlete5 active  (c5)
    ('a5500001-eeee-4eee-8eee-000000000501'::uuid, 'b5500001-eeee-4eee-8eee-000000000501'::uuid, 0, 'workout', '42cbdc7d-b0fe-4fdd-9690-51489d05fbc0'::uuid),
    ('a5500003-eeee-4eee-8eee-000000000503'::uuid, 'b5500003-eeee-4eee-8eee-000000000503'::uuid, 0, 'workout', '8b1f53e2-6d9c-4a1f-b7d3-a2c4e5f6b821'::uuid),

    -- athlete6 draft  (c6)
    ('a6600001-ffff-4fff-8aaa-000000000601'::uuid, 'b6600001-ffff-4fff-8aaa-000000000601'::uuid, 0, 'workout', '9c2a64f3-7e0d-4b2a-8ce4-b3d5f607c932'::uuid),
    ('a6600003-ffff-4fff-8aaa-000000000603'::uuid, 'b6600003-ffff-4fff-8aaa-000000000603'::uuid, 0, 'workout', 'ad3b75a4-8f1e-4c3b-9df5-c4e6a718da43'::uuid),

    -- athlete7 completed  (c7)
    ('a7700001-abab-4aaa-8bbb-000000000701'::uuid, 'b7700001-abab-4aaa-8bbb-000000000701'::uuid, 0, 'workout', 'be4c86b5-9a2f-4d4c-ae86-d5f7b829eb54'::uuid),

    -- athlete1 completed history  (c8)
    ('a8800001-bcbc-4ccc-8ddd-000000000801'::uuid, 'b8800001-bcbc-4ccc-8ddd-000000000801'::uuid, 0, 'workout', '52f2bbe7-0c3f-4728-b7c9-34a2223cf0b8'::uuid),
    ('a8800003-bcbc-4ccc-8ddd-000000000803'::uuid, 'b8800003-bcbc-4ccc-8ddd-000000000803'::uuid, 0, 'workout', 'd94823aa-e98d-4516-9088-eee775693846'::uuid),

    -- athlete5 completed history  (c9)
    ('a9900001-cdcd-4ddd-8eee-000000000901'::uuid, 'b9900001-cdcd-4ddd-8eee-000000000901'::uuid, 0, 'workout', '42cbdc7d-b0fe-4fdd-9690-51489d05fbc0'::uuid),
    ('a9900003-cdcd-4ddd-8eee-000000000903'::uuid, 'b9900003-cdcd-4ddd-8eee-000000000903'::uuid, 0, 'workout', '8b1f53e2-6d9c-4a1f-b7d3-a2c4e5f6b821'::uuid)
  ON CONFLICT DO NOTHING;

  -- ----------------------------------------------------------------
  -- Adjustments  (notes)
  -- Renamed: microcycle_repetition_start/end/every → cycle_start/cycle_end/cycle_every
  -- Dropped: microcycle_id column
  -- ----------------------------------------------------------------
  INSERT INTO public.periodization_adjustments
    (id, periodization_id,
     cycle_start, cycle_end, cycle_every,
     type, payload)
  VALUES
    -- Notes
    ('fa100001-aaaa-4aaa-8aaa-000000000901'::uuid, 'c1100001-aaaa-4aaa-8aaa-000000000001'::uuid, 1, 1, 1,
     'note',
     jsonb_build_object('type','note','workoutId','52f2bbe7-0c3f-4728-b7c9-34a2223cf0b8','text','Começar a sessão com percepção de esforço controlada e registrar conforto no supino.')),
    ('fa100002-aaaa-4aaa-8aaa-000000000902'::uuid, 'c1100001-aaaa-4aaa-8aaa-000000000001'::uuid, 3, 3, 1,
     'note',
     jsonb_build_object('type','note','workoutId',null,'text','Na terceira repetição do bloco, manter margem de esforço e priorizar consistência.')),
    ('fa200001-bbbb-4bbb-8bbb-000000000903'::uuid, 'c2200002-bbbb-4bbb-8bbb-000000000002'::uuid, 3, 3, 1,
     'note',
     jsonb_build_object('type','note','workoutId','7a9e42d1-5c8b-4f0e-a6c2-9d1b3e4f7a10','text','Monitorar fadiga de posteriores após combinação de mesa flexora e elevação pélvica.')),
    ('fa500001-eeee-4eee-8eee-000000000904'::uuid, 'c5500005-eeee-4eee-8eee-000000000005'::uuid, 2, 2, 1,
     'note',
     jsonb_build_object('type','note','workoutId','8b1f53e2-6d9c-4a1f-b7d3-a2c4e5f6b821','text','Caso a lombar acumule fadiga, reduzir amplitude no leg press.')),
    ('fa600001-ffff-4fff-8aaa-000000000905'::uuid, 'c6600006-ffff-4fff-8aaa-000000000006'::uuid, 1, 1, 1,
     'note',
     jsonb_build_object('type','note','workoutId','9c2a64f3-7e0d-4b2a-8ce4-b3d5f607c932','text','Priorizar técnica limpa antes de qualquer progressão de carga.')),
    ('fa600002-ffff-4fff-8aaa-000000000906'::uuid, 'c6600006-ffff-4fff-8aaa-000000000006'::uuid, 3, 3, 1,
     'note',
     jsonb_build_object('type','note','workoutId',null,'text','Reavaliar volume semanal caso a recuperação esteja adequada.')),
    ('fa700001-abab-4aaa-8bbb-000000000907'::uuid, 'c7700007-abab-4aaa-8bbb-000000000007'::uuid, 2, 2, 1,
     'note',
     jsonb_build_object('type','note','workoutId','be4c86b5-9a2f-4d4c-ae86-d5f7b829eb54','text','Usar assistência na barra fixa quando necessário para manter a faixa de repetições.')),
    ('fa800001-bcbc-4ccc-8ddd-000000000908'::uuid, 'c8800008-bcbc-4ccc-8ddd-000000000008'::uuid, 2, 2, 1,
     'note',
     jsonb_build_object('type','note','workoutId',null,'text','Bloco histórico usado para validar atraso derivado na linha do tempo.')),
    ('fa900001-cdcd-4ddd-8eee-000000000909'::uuid, 'c9900009-cdcd-4ddd-8eee-000000000009'::uuid, 3, 3, 1,
     'note',
     jsonb_build_object('type','note','workoutId','8b1f53e2-6d9c-4a1f-b7d3-a2c4e5f6b821','text','Manter esta periodização com sessões pendentes antigas para testar o card de aderência.'))
  ON CONFLICT DO NOTHING;

  -- ----------------------------------------------------------------
  -- Occurrences
  -- Per-activity row for training days, 1 row per rest day.
  -- Key mapping from old schema:
  --   repetition   → cycle
  --   position     → template_day position (used to resolve template_day_id)
  --   day_type     → 'training' (was 'workout') or 'rest'
  --   kind         → 'workout' for training, NULL for rest
  --   position_in_day = 0 for all rows
  --   origin       = 'template'
  --   source_adjustment_id = NULL
  -- ----------------------------------------------------------------
  INSERT INTO public.periodization_occurrences
    (id, periodization_id,
     planned_date, cycle,
     template_day_id, template_activity_id,
     position_in_day,
     origin, source_adjustment_id,
     day_type, kind, workout_id,
     status, executed_at, workout_log_id, skipped_reason)
  VALUES
    -- ── athlete1 active (c1) ──────────────────────────────────────
    ('fb100001-aaaa-4aaa-8aaa-000000001001'::uuid, 'c1100001-aaaa-4aaa-8aaa-000000000001'::uuid,
     CURRENT_DATE - 6, 1,
     'b1100001-aaaa-4aaa-8aaa-000000000101'::uuid, 'a1100001-aaaa-4aaa-8aaa-000000000101'::uuid,
     0, 'template', NULL,
     'training', 'workout', '52f2bbe7-0c3f-4728-b7c9-34a2223cf0b8'::uuid,
     'done', NOW() - interval '4 days', 'a1b2c3d4-1111-4aaa-b111-111111111104'::uuid, NULL),

    ('fb100002-aaaa-4aaa-8aaa-000000001002'::uuid, 'c1100001-aaaa-4aaa-8aaa-000000000001'::uuid,
     CURRENT_DATE - 5, 1,
     'b1100002-aaaa-4aaa-8aaa-000000000102'::uuid, NULL,
     0, 'template', NULL,
     'rest', NULL, NULL,
     'done', NOW() - interval '5 days', NULL, NULL),

    ('fb100003-aaaa-4aaa-8aaa-000000001003'::uuid, 'c1100001-aaaa-4aaa-8aaa-000000000001'::uuid,
     CURRENT_DATE - 4, 1,
     'b1100003-aaaa-4aaa-8aaa-000000000103'::uuid, 'a1100003-aaaa-4aaa-8aaa-000000000103'::uuid,
     0, 'template', NULL,
     'training', 'workout', 'd94823aa-e98d-4516-9088-eee775693846'::uuid,
     'skipped', NULL, NULL, 'Viagem a trabalho'),

    ('fb100004-aaaa-4aaa-8aaa-000000001004'::uuid, 'c1100001-aaaa-4aaa-8aaa-000000000001'::uuid,
     CURRENT_DATE - 3, 1,
     'b1100004-aaaa-4aaa-8aaa-000000000104'::uuid, NULL,
     0, 'template', NULL,
     'rest', NULL, NULL,
     'done', NOW() - interval '3 days', NULL, NULL),

    ('fb100005-aaaa-4aaa-8aaa-000000001005'::uuid, 'c1100001-aaaa-4aaa-8aaa-000000000001'::uuid,
     CURRENT_DATE - 2, 2,
     'b1100001-aaaa-4aaa-8aaa-000000000101'::uuid, 'a1100001-aaaa-4aaa-8aaa-000000000101'::uuid,
     0, 'template', NULL,
     'training', 'workout', '52f2bbe7-0c3f-4728-b7c9-34a2223cf0b8'::uuid,
     'done', NOW() - interval '2 days', 'a1b2c3d4-1111-4aaa-b111-111111111103'::uuid, NULL),

    ('fb100006-aaaa-4aaa-8aaa-000000001006'::uuid, 'c1100001-aaaa-4aaa-8aaa-000000000001'::uuid,
     CURRENT_DATE - 1, 2,
     'b1100002-aaaa-4aaa-8aaa-000000000102'::uuid, NULL,
     0, 'template', NULL,
     'rest', NULL, NULL,
     'done', NOW() - interval '1 day', NULL, NULL),

    ('fb100007-aaaa-4aaa-8aaa-000000001007'::uuid, 'c1100001-aaaa-4aaa-8aaa-000000000001'::uuid,
     CURRENT_DATE, 3,
     'b1100001-aaaa-4aaa-8aaa-000000000101'::uuid, 'a1100001-aaaa-4aaa-8aaa-000000000101'::uuid,
     0, 'template', NULL,
     'training', 'workout', '52f2bbe7-0c3f-4728-b7c9-34a2223cf0b8'::uuid,
     'pending', NULL, NULL, NULL),

    ('fb100008-aaaa-4aaa-8aaa-000000001008'::uuid, 'c1100001-aaaa-4aaa-8aaa-000000000001'::uuid,
     CURRENT_DATE + 1, 3,
     'b1100002-aaaa-4aaa-8aaa-000000000102'::uuid, NULL,
     0, 'template', NULL,
     'rest', NULL, NULL,
     'pending', NULL, NULL, NULL),

    ('fb100009-aaaa-4aaa-8aaa-000000001009'::uuid, 'c1100001-aaaa-4aaa-8aaa-000000000001'::uuid,
     CURRENT_DATE + 2, 3,
     'b1100003-aaaa-4aaa-8aaa-000000000103'::uuid, 'a1100003-aaaa-4aaa-8aaa-000000000103'::uuid,
     0, 'template', NULL,
     'training', 'workout', 'd94823aa-e98d-4516-9088-eee775693846'::uuid,
     'pending', NULL, NULL, NULL),

    ('fb10000a-aaaa-4aaa-8aaa-00000000100a'::uuid, 'c1100001-aaaa-4aaa-8aaa-000000000001'::uuid,
     CURRENT_DATE + 3, 3,
     'b1100004-aaaa-4aaa-8aaa-000000000104'::uuid, NULL,
     0, 'template', NULL,
     'rest', NULL, NULL,
     'pending', NULL, NULL, NULL),

    -- ── athlete2 completed (c2) ───────────────────────────────────
    ('fb200001-bbbb-4bbb-8bbb-000000001011'::uuid, 'c2200002-bbbb-4bbb-8bbb-000000000002'::uuid,
     CURRENT_DATE - 20, 1,
     'b2200001-bbbb-4bbb-8bbb-000000000201'::uuid, 'a2200001-bbbb-4bbb-8bbb-000000000201'::uuid,
     0, 'template', NULL,
     'training', 'workout', 'fe83e1d8-6a4f-4809-a12c-dd3d4d986d29'::uuid,
     'done', NOW() - interval '15 days', 'a1b2c3d4-3333-4ccc-b333-333333333302'::uuid, NULL),

    ('fb200002-bbbb-4bbb-8bbb-000000001012'::uuid, 'c2200002-bbbb-4bbb-8bbb-000000000002'::uuid,
     CURRENT_DATE - 19, 1,
     'b2200002-bbbb-4bbb-8bbb-000000000202'::uuid, NULL,
     0, 'template', NULL,
     'rest', NULL, NULL,
     'done', NOW() - interval '19 days', NULL, NULL),

    ('fb200003-bbbb-4bbb-8bbb-000000001013'::uuid, 'c2200002-bbbb-4bbb-8bbb-000000000002'::uuid,
     CURRENT_DATE - 18, 1,
     'b2200003-bbbb-4bbb-8bbb-000000000203'::uuid, 'a2200003-bbbb-4bbb-8bbb-000000000203'::uuid,
     0, 'template', NULL,
     'training', 'workout', '7a9e42d1-5c8b-4f0e-a6c2-9d1b3e4f7a10'::uuid,
     'done', NOW() - interval '18 days', '7d910001-aaaa-4bbb-8ccc-100000000001'::uuid, NULL),

    ('fb200004-bbbb-4bbb-8bbb-000000001014'::uuid, 'c2200002-bbbb-4bbb-8bbb-000000000002'::uuid,
     CURRENT_DATE - 16, 2,
     'b2200001-bbbb-4bbb-8bbb-000000000201'::uuid, 'a2200001-bbbb-4bbb-8bbb-000000000201'::uuid,
     0, 'template', NULL,
     'training', 'workout', 'fe83e1d8-6a4f-4809-a12c-dd3d4d986d29'::uuid,
     'done', NOW() - interval '10 days', 'a1b2c3d4-3333-4ccc-b333-333333333303'::uuid, NULL),

    ('fb200005-bbbb-4bbb-8bbb-000000001015'::uuid, 'c2200002-bbbb-4bbb-8bbb-000000000002'::uuid,
     CURRENT_DATE - 14, 2,
     'b2200003-bbbb-4bbb-8bbb-000000000203'::uuid, 'a2200003-bbbb-4bbb-8bbb-000000000203'::uuid,
     0, 'template', NULL,
     'training', 'workout', '7a9e42d1-5c8b-4f0e-a6c2-9d1b3e4f7a10'::uuid,
     'skipped', NULL, NULL, 'Dor residual em posteriores'),

    ('fb200006-bbbb-4bbb-8bbb-000000001016'::uuid, 'c2200002-bbbb-4bbb-8bbb-000000000002'::uuid,
     CURRENT_DATE - 12, 3,
     'b2200001-bbbb-4bbb-8bbb-000000000201'::uuid, 'a2200001-bbbb-4bbb-8bbb-000000000201'::uuid,
     0, 'template', NULL,
     'training', 'workout', 'fe83e1d8-6a4f-4809-a12c-dd3d4d986d29'::uuid,
     'done', NOW() - interval '4 days', 'a1b2c3d4-3333-4ccc-b333-333333333304'::uuid, NULL),

    ('fb200007-bbbb-4bbb-8bbb-000000001017'::uuid, 'c2200002-bbbb-4bbb-8bbb-000000000002'::uuid,
     CURRENT_DATE - 10, 3,
     'b2200003-bbbb-4bbb-8bbb-000000000203'::uuid, 'a2200003-bbbb-4bbb-8bbb-000000000203'::uuid,
     0, 'template', NULL,
     'training', 'workout', '7a9e42d1-5c8b-4f0e-a6c2-9d1b3e4f7a10'::uuid,
     'done', NOW() - interval '5 days', '7d910003-aaaa-4bbb-8ccc-100000000003'::uuid, NULL),

    -- ── athlete4 completed (c4) ───────────────────────────────────
    ('fb400001-dddd-4ddd-8ddd-000000001021'::uuid, 'c4400004-dddd-4ddd-8ddd-000000000004'::uuid,
     CURRENT_DATE - 12, 1,
     'b4400001-dddd-4ddd-8ddd-000000000401'::uuid, 'a4400001-dddd-4ddd-8ddd-000000000401'::uuid,
     0, 'template', NULL,
     'training', 'workout', 'c3a9f0b2-1d4e-4a7c-8f5b-6e2d3c4a5b6c'::uuid,
     'done', NOW() - interval '12 days', 'a1b2c3d4-6666-4fff-b666-666666666601'::uuid, NULL),

    ('fb400002-dddd-4ddd-8ddd-000000001022'::uuid, 'c4400004-dddd-4ddd-8ddd-000000000004'::uuid,
     CURRENT_DATE - 11, 1,
     'b4400002-dddd-4ddd-8ddd-000000000402'::uuid, NULL,
     0, 'template', NULL,
     'rest', NULL, NULL,
     'done', NOW() - interval '11 days', NULL, NULL),

    ('fb400003-dddd-4ddd-8ddd-000000001023'::uuid, 'c4400004-dddd-4ddd-8ddd-000000000004'::uuid,
     CURRENT_DATE - 8, 2,
     'b4400001-dddd-4ddd-8ddd-000000000401'::uuid, 'a4400001-dddd-4ddd-8ddd-000000000401'::uuid,
     0, 'template', NULL,
     'training', 'workout', 'c3a9f0b2-1d4e-4a7c-8f5b-6e2d3c4a5b6c'::uuid,
     'done', NOW() - interval '8 days', 'a1b2c3d4-6666-4fff-b666-666666666602'::uuid, NULL),

    ('fb400004-dddd-4ddd-8ddd-000000001024'::uuid, 'c4400004-dddd-4ddd-8ddd-000000000004'::uuid,
     CURRENT_DATE - 4, 3,
     'b4400001-dddd-4ddd-8ddd-000000000401'::uuid, 'a4400001-dddd-4ddd-8ddd-000000000401'::uuid,
     0, 'template', NULL,
     'training', 'workout', 'c3a9f0b2-1d4e-4a7c-8f5b-6e2d3c4a5b6c'::uuid,
     'skipped', NULL, NULL, 'Rotina de trabalho atrasou a sessão'),

    -- ── athlete5 active (c5) ─────────────────────────────────────
    ('fb500001-eeee-4eee-8eee-000000001031'::uuid, 'c5500005-eeee-4eee-8eee-000000000005'::uuid,
     CURRENT_DATE - 8, 1,
     'b5500001-eeee-4eee-8eee-000000000501'::uuid, 'a5500001-eeee-4eee-8eee-000000000501'::uuid,
     0, 'template', NULL,
     'training', 'workout', '42cbdc7d-b0fe-4fdd-9690-51489d05fbc0'::uuid,
     'done', NOW() - interval '8 days', 'a1b2c3d4-5555-4eee-b555-555555555502'::uuid, NULL),

    ('fb500002-eeee-4eee-8eee-000000001032'::uuid, 'c5500005-eeee-4eee-8eee-000000000005'::uuid,
     CURRENT_DATE - 7, 1,
     'b5500002-eeee-4eee-8eee-000000000502'::uuid, NULL,
     0, 'template', NULL,
     'rest', NULL, NULL,
     'done', NOW() - interval '7 days', NULL, NULL),

    ('fb500003-eeee-4eee-8eee-000000001033'::uuid, 'c5500005-eeee-4eee-8eee-000000000005'::uuid,
     CURRENT_DATE - 6, 1,
     'b5500003-eeee-4eee-8eee-000000000503'::uuid, 'a5500003-eeee-4eee-8eee-000000000503'::uuid,
     0, 'template', NULL,
     'training', 'workout', '8b1f53e2-6d9c-4a1f-b7d3-a2c4e5f6b821'::uuid,
     'done', NOW() - interval '4 days', '8e920001-bbbb-4ccc-8ddd-200000000001'::uuid, NULL),

    ('fb500004-eeee-4eee-8eee-000000001034'::uuid, 'c5500005-eeee-4eee-8eee-000000000005'::uuid,
     CURRENT_DATE - 4, 2,
     'b5500001-eeee-4eee-8eee-000000000501'::uuid, 'a5500001-eeee-4eee-8eee-000000000501'::uuid,
     0, 'template', NULL,
     'training', 'workout', '42cbdc7d-b0fe-4fdd-9690-51489d05fbc0'::uuid,
     'done', NOW() - interval '2 days', 'a1b2c3d4-5555-4eee-b555-555555555504'::uuid, NULL),

    ('fb500005-eeee-4eee-8eee-000000001035'::uuid, 'c5500005-eeee-4eee-8eee-000000000005'::uuid,
     CURRENT_DATE - 2, 2,
     'b5500003-eeee-4eee-8eee-000000000503'::uuid, 'a5500003-eeee-4eee-8eee-000000000503'::uuid,
     0, 'template', NULL,
     'training', 'workout', '8b1f53e2-6d9c-4a1f-b7d3-a2c4e5f6b821'::uuid,
     'skipped', NULL, NULL, 'Competição no fim de semana'),

    ('fb500006-eeee-4eee-8eee-000000001036'::uuid, 'c5500005-eeee-4eee-8eee-000000000005'::uuid,
     CURRENT_DATE, 3,
     'b5500001-eeee-4eee-8eee-000000000501'::uuid, 'a5500001-eeee-4eee-8eee-000000000501'::uuid,
     0, 'template', NULL,
     'training', 'workout', '42cbdc7d-b0fe-4fdd-9690-51489d05fbc0'::uuid,
     'pending', NULL, NULL, NULL),

    ('fb500007-eeee-4eee-8eee-000000001037'::uuid, 'c5500005-eeee-4eee-8eee-000000000005'::uuid,
     CURRENT_DATE + 2, 3,
     'b5500003-eeee-4eee-8eee-000000000503'::uuid, 'a5500003-eeee-4eee-8eee-000000000503'::uuid,
     0, 'template', NULL,
     'training', 'workout', '8b1f53e2-6d9c-4a1f-b7d3-a2c4e5f6b821'::uuid,
     'pending', NULL, NULL, NULL),

    -- ── athlete7 completed (c7) ───────────────────────────────────
    ('fb700001-abab-4aaa-8bbb-000000001041'::uuid, 'c7700007-abab-4aaa-8bbb-000000000007'::uuid,
     CURRENT_DATE - 8, 1,
     'b7700001-abab-4aaa-8bbb-000000000701'::uuid, 'a7700001-abab-4aaa-8bbb-000000000701'::uuid,
     0, 'template', NULL,
     'training', 'workout', 'be4c86b5-9a2f-4d4c-ae86-d5f7b829eb54'::uuid,
     'done', NOW() - interval '8 days', 'b1a50001-eeee-4fff-8aaa-500000000001'::uuid, NULL),

    ('fb700002-abab-4aaa-8bbb-000000001042'::uuid, 'c7700007-abab-4aaa-8bbb-000000000007'::uuid,
     CURRENT_DATE - 7, 1,
     'b7700002-abab-4aaa-8bbb-000000000702'::uuid, NULL,
     0, 'template', NULL,
     'rest', NULL, NULL,
     'done', NOW() - interval '7 days', NULL, NULL),

    ('fb700003-abab-4aaa-8bbb-000000001043'::uuid, 'c7700007-abab-4aaa-8bbb-000000000007'::uuid,
     CURRENT_DATE - 6, 2,
     'b7700001-abab-4aaa-8bbb-000000000701'::uuid, 'a7700001-abab-4aaa-8bbb-000000000701'::uuid,
     0, 'template', NULL,
     'training', 'workout', 'be4c86b5-9a2f-4d4c-ae86-d5f7b829eb54'::uuid,
     'done', NOW() - interval '2 days', 'b1a50002-eeee-4fff-8aaa-500000000002'::uuid, NULL),

    ('fb700004-abab-4aaa-8bbb-000000001044'::uuid, 'c7700007-abab-4aaa-8bbb-000000000007'::uuid,
     CURRENT_DATE - 4, 3,
     'b7700001-abab-4aaa-8bbb-000000000701'::uuid, 'a7700001-abab-4aaa-8bbb-000000000701'::uuid,
     0, 'template', NULL,
     'training', 'workout', 'be4c86b5-9a2f-4d4c-ae86-d5f7b829eb54'::uuid,
     'skipped', NULL, NULL, 'Semana com prioridade no trabalho'),

    -- ── athlete1 completed history (c8) ──────────────────────────
    ('fb800001-bcbc-4ccc-8ddd-000000001051'::uuid, 'c8800008-bcbc-4ccc-8ddd-000000000008'::uuid,
     CURRENT_DATE - 45, 1,
     'b8800001-bcbc-4ccc-8ddd-000000000801'::uuid, 'a8800001-bcbc-4ccc-8ddd-000000000801'::uuid,
     0, 'template', NULL,
     'training', 'workout', '52f2bbe7-0c3f-4728-b7c9-34a2223cf0b8'::uuid,
     'done', NOW() - interval '45 days', NULL, NULL),

    ('fb800002-bcbc-4ccc-8ddd-000000001052'::uuid, 'c8800008-bcbc-4ccc-8ddd-000000000008'::uuid,
     CURRENT_DATE - 44, 1,
     'b8800002-bcbc-4ccc-8ddd-000000000802'::uuid, NULL,
     0, 'template', NULL,
     'rest', NULL, NULL,
     'done', NOW() - interval '44 days', NULL, NULL),

    ('fb800003-bcbc-4ccc-8ddd-000000001053'::uuid, 'c8800008-bcbc-4ccc-8ddd-000000000008'::uuid,
     CURRENT_DATE - 43, 1,
     'b8800003-bcbc-4ccc-8ddd-000000000803'::uuid, 'a8800003-bcbc-4ccc-8ddd-000000000803'::uuid,
     0, 'template', NULL,
     'training', 'workout', 'd94823aa-e98d-4516-9088-eee775693846'::uuid,
     'skipped', NULL, NULL, 'Semana de viagem'),

    ('fb800004-bcbc-4ccc-8ddd-000000001054'::uuid, 'c8800008-bcbc-4ccc-8ddd-000000000008'::uuid,
     CURRENT_DATE - 42, 1,
     'b8800004-bcbc-4ccc-8ddd-000000000804'::uuid, NULL,
     0, 'template', NULL,
     'rest', NULL, NULL,
     'done', NOW() - interval '42 days', NULL, NULL),

    ('fb800005-bcbc-4ccc-8ddd-000000001055'::uuid, 'c8800008-bcbc-4ccc-8ddd-000000000008'::uuid,
     CURRENT_DATE - 41, 2,
     'b8800001-bcbc-4ccc-8ddd-000000000801'::uuid, 'a8800001-bcbc-4ccc-8ddd-000000000801'::uuid,
     0, 'template', NULL,
     'training', 'workout', '52f2bbe7-0c3f-4728-b7c9-34a2223cf0b8'::uuid,
     'pending', NULL, NULL, NULL),

    ('fb800006-bcbc-4ccc-8ddd-000000001056'::uuid, 'c8800008-bcbc-4ccc-8ddd-000000000008'::uuid,
     CURRENT_DATE - 40, 2,
     'b8800002-bcbc-4ccc-8ddd-000000000802'::uuid, NULL,
     0, 'template', NULL,
     'rest', NULL, NULL,
     'pending', NULL, NULL, NULL),

    ('fb800007-bcbc-4ccc-8ddd-000000001057'::uuid, 'c8800008-bcbc-4ccc-8ddd-000000000008'::uuid,
     CURRENT_DATE - 39, 2,
     'b8800003-bcbc-4ccc-8ddd-000000000803'::uuid, 'a8800003-bcbc-4ccc-8ddd-000000000803'::uuid,
     0, 'template', NULL,
     'training', 'workout', 'd94823aa-e98d-4516-9088-eee775693846'::uuid,
     'done', NOW() - interval '39 days', NULL, NULL),

    ('fb800008-bcbc-4ccc-8ddd-000000001058'::uuid, 'c8800008-bcbc-4ccc-8ddd-000000000008'::uuid,
     CURRENT_DATE - 38, 2,
     'b8800004-bcbc-4ccc-8ddd-000000000804'::uuid, NULL,
     0, 'template', NULL,
     'rest', NULL, NULL,
     'done', NOW() - interval '38 days', NULL, NULL),

    -- ── athlete5 completed history (c9) ──────────────────────────
    ('fb900001-cdcd-4ddd-8eee-000000001061'::uuid, 'c9900009-cdcd-4ddd-8eee-000000000009'::uuid,
     CURRENT_DATE - 32, 1,
     'b9900001-cdcd-4ddd-8eee-000000000901'::uuid, 'a9900001-cdcd-4ddd-8eee-000000000901'::uuid,
     0, 'template', NULL,
     'training', 'workout', '42cbdc7d-b0fe-4fdd-9690-51489d05fbc0'::uuid,
     'done', NOW() - interval '32 days', NULL, NULL),

    ('fb900002-cdcd-4ddd-8eee-000000001062'::uuid, 'c9900009-cdcd-4ddd-8eee-000000000009'::uuid,
     CURRENT_DATE - 31, 1,
     'b9900002-cdcd-4ddd-8eee-000000000902'::uuid, NULL,
     0, 'template', NULL,
     'rest', NULL, NULL,
     'done', NOW() - interval '31 days', NULL, NULL),

    ('fb900003-cdcd-4ddd-8eee-000000001063'::uuid, 'c9900009-cdcd-4ddd-8eee-000000000009'::uuid,
     CURRENT_DATE - 30, 1,
     'b9900003-cdcd-4ddd-8eee-000000000903'::uuid, 'a9900003-cdcd-4ddd-8eee-000000000903'::uuid,
     0, 'template', NULL,
     'training', 'workout', '8b1f53e2-6d9c-4a1f-b7d3-a2c4e5f6b821'::uuid,
     'done', NOW() - interval '30 days', NULL, NULL),

    ('fb900004-cdcd-4ddd-8eee-000000001064'::uuid, 'c9900009-cdcd-4ddd-8eee-000000000009'::uuid,
     CURRENT_DATE - 29, 1,
     'b9900004-cdcd-4ddd-8eee-000000000904'::uuid, NULL,
     0, 'template', NULL,
     'rest', NULL, NULL,
     'done', NOW() - interval '29 days', NULL, NULL),

    ('fb900005-cdcd-4ddd-8eee-000000001065'::uuid, 'c9900009-cdcd-4ddd-8eee-000000000009'::uuid,
     CURRENT_DATE - 28, 2,
     'b9900001-cdcd-4ddd-8eee-000000000901'::uuid, 'a9900001-cdcd-4ddd-8eee-000000000901'::uuid,
     0, 'template', NULL,
     'training', 'workout', '42cbdc7d-b0fe-4fdd-9690-51489d05fbc0'::uuid,
     'skipped', NULL, NULL, 'Semana de prova'),

    ('fb900006-cdcd-4ddd-8eee-000000001066'::uuid, 'c9900009-cdcd-4ddd-8eee-000000000009'::uuid,
     CURRENT_DATE - 27, 2,
     'b9900002-cdcd-4ddd-8eee-000000000902'::uuid, NULL,
     0, 'template', NULL,
     'rest', NULL, NULL,
     'done', NOW() - interval '27 days', NULL, NULL),

    ('fb900007-cdcd-4ddd-8eee-000000001067'::uuid, 'c9900009-cdcd-4ddd-8eee-000000000009'::uuid,
     CURRENT_DATE - 26, 2,
     'b9900003-cdcd-4ddd-8eee-000000000903'::uuid, 'a9900003-cdcd-4ddd-8eee-000000000903'::uuid,
     0, 'template', NULL,
     'training', 'workout', '8b1f53e2-6d9c-4a1f-b7d3-a2c4e5f6b821'::uuid,
     'pending', NULL, NULL, NULL),

    ('fb900008-cdcd-4ddd-8eee-000000001068'::uuid, 'c9900009-cdcd-4ddd-8eee-000000000009'::uuid,
     CURRENT_DATE - 25, 2,
     'b9900004-cdcd-4ddd-8eee-000000000904'::uuid, NULL,
     0, 'template', NULL,
     'rest', NULL, NULL,
     'pending', NULL, NULL, NULL),

    ('fb900009-cdcd-4ddd-8eee-000000001069'::uuid, 'c9900009-cdcd-4ddd-8eee-000000000009'::uuid,
     CURRENT_DATE - 24, 3,
     'b9900001-cdcd-4ddd-8eee-000000000901'::uuid, 'a9900001-cdcd-4ddd-8eee-000000000901'::uuid,
     0, 'template', NULL,
     'training', 'workout', '42cbdc7d-b0fe-4fdd-9690-51489d05fbc0'::uuid,
     'done', NOW() - interval '24 days', NULL, NULL),

    ('fb90000a-cdcd-4ddd-8eee-00000000106a'::uuid, 'c9900009-cdcd-4ddd-8eee-000000000009'::uuid,
     CURRENT_DATE - 23, 3,
     'b9900002-cdcd-4ddd-8eee-000000000902'::uuid, NULL,
     0, 'template', NULL,
     'rest', NULL, NULL,
     'done', NOW() - interval '23 days', NULL, NULL),

    ('fb90000b-cdcd-4ddd-8eee-00000000106b'::uuid, 'c9900009-cdcd-4ddd-8eee-000000000009'::uuid,
     CURRENT_DATE - 22, 3,
     'b9900003-cdcd-4ddd-8eee-000000000903'::uuid, 'a9900003-cdcd-4ddd-8eee-000000000903'::uuid,
     0, 'template', NULL,
     'training', 'workout', '8b1f53e2-6d9c-4a1f-b7d3-a2c4e5f6b821'::uuid,
     'pending', NULL, NULL, NULL)
  ON CONFLICT DO NOTHING;

  -- ================================================================
  -- Cardio programs (Lucas = athlete1, criador = coach1)
  -- ================================================================
  INSERT INTO public.cardio_programs
    (id, created_by, athlete_id, name, instructions,
     duration_seconds, hr_mode, hr_zone, min_bpm, max_bpm)
  VALUES
    ('cd111101-1111-4aaa-8aaa-000000000001'::uuid, coach1_id, athlete1_id,
     'Esteira Z2 — 20min',
     'Aquecer 3min e manter 17min em zona moderada (RPE 5-6/10).',
     1200, 'zone', 'moderate', NULL, NULL),
    ('cd111102-1111-4aaa-8aaa-000000000002'::uuid, coach1_id, athlete1_id,
     'HIIT Bike — 15min',
     '5 min de aquecimento + 5 tiros de 1 min forte / 1 min leve.',
     900,  'zone', 'hard', NULL, NULL),
    ('cd111103-1111-4aaa-8aaa-000000000003'::uuid, coach1_id, athlete1_id,
     'Caminhada leve — 30min',
     'Esteira inclinada, recuperação ativa em zona light.',
     1800, 'zone', 'light', NULL, NULL),
    ('cd111104-1111-4aaa-8aaa-000000000004'::uuid, coach1_id, athlete1_id,
     'Bike 140-155 bpm — 25min',
     'Manter FC entre 140 e 155 bpm após 5 min de aquecimento.',
     1500, 'bpm',  NULL, 140, 155)
  ON CONFLICT DO NOTHING;

  -- ================================================================
  -- Nova periodização rica de Lucas (c10)
  -- Ciclo de 4 dias:
  --   Dia 0: Treino A + Cardio Z2   (treino + cardio no mesmo dia)
  --   Dia 1: HIIT (cardio somente)
  --   Dia 2: Treino B
  --   Dia 3: descanso
  -- ================================================================
  INSERT INTO public.periodizations
    (id, created_by, athlete_id, start_date, end_date, objective, status, notification_days_before)
  VALUES
    ('ca100010-aaaa-4aaa-8aaa-000000000010'::uuid, coach1_id, athlete1_id,
     CURRENT_DATE - 7, CURRENT_DATE + 20,
     'Hipertrofia com condicionamento aeróbico, treino e cardio no mesmo dia',
     'active', 4)
  ON CONFLICT DO NOTHING;

  INSERT INTO public.periodization_template_days
    (id, periodization_id, position, day_type)
  VALUES
    ('ba100010-aaaa-4aaa-8aaa-000000000110'::uuid, 'ca100010-aaaa-4aaa-8aaa-000000000010'::uuid, 0, 'training'),
    ('ba100011-aaaa-4aaa-8aaa-000000000111'::uuid, 'ca100010-aaaa-4aaa-8aaa-000000000010'::uuid, 1, 'training'),
    ('ba100012-aaaa-4aaa-8aaa-000000000112'::uuid, 'ca100010-aaaa-4aaa-8aaa-000000000010'::uuid, 2, 'training'),
    ('ba100013-aaaa-4aaa-8aaa-000000000113'::uuid, 'ca100010-aaaa-4aaa-8aaa-000000000010'::uuid, 3, 'rest')
  ON CONFLICT DO NOTHING;

  INSERT INTO public.periodization_template_activities
    (id, template_day_id, position, kind, workout_id, cardio_program_id)
  VALUES
    -- Dia 0: Treino A (pos 0) + Cardio Z2 (pos 1)
    ('aa100010-aaaa-4aaa-8aaa-000000000210'::uuid,
     'ba100010-aaaa-4aaa-8aaa-000000000110'::uuid, 0, 'workout',
     '52f2bbe7-0c3f-4728-b7c9-34a2223cf0b8'::uuid, NULL),
    ('aa100011-aaaa-4aaa-8aaa-000000000211'::uuid,
     'ba100010-aaaa-4aaa-8aaa-000000000110'::uuid, 1, 'cardio',
     NULL, 'cd111101-1111-4aaa-8aaa-000000000001'::uuid),

    -- Dia 1: HIIT somente
    ('aa100012-aaaa-4aaa-8aaa-000000000212'::uuid,
     'ba100011-aaaa-4aaa-8aaa-000000000111'::uuid, 0, 'cardio',
     NULL, 'cd111102-1111-4aaa-8aaa-000000000002'::uuid),

    -- Dia 2: Treino B
    ('aa100013-aaaa-4aaa-8aaa-000000000213'::uuid,
     'ba100012-aaaa-4aaa-8aaa-000000000112'::uuid, 0, 'workout',
     'd94823aa-e98d-4516-9088-eee775693846'::uuid, NULL)
  ON CONFLICT DO NOTHING;

  -- ================================================================
  -- Adjustments em c10: note, workout_override, extra_activity (cardio), stop_until
  -- ================================================================
  INSERT INTO public.periodization_adjustments
    (id, periodization_id, cycle_start, cycle_end, cycle_every, type, payload)
  VALUES
    ('fa100010-aaaa-4aaa-8aaa-000000000310'::uuid,
     'ca100010-aaaa-4aaa-8aaa-000000000010'::uuid, 1, NULL, 1, 'note',
     jsonb_build_object(
       'type','note',
       'workoutId','52f2bbe7-0c3f-4728-b7c9-34a2223cf0b8',
       'text','Nos dias com treino + cardio, realizar o aeróbico imediatamente após os sets de força.')),

    ('fa100011-aaaa-4aaa-8aaa-000000000311'::uuid,
     'ca100010-aaaa-4aaa-8aaa-000000000010'::uuid, 2, NULL, 1, 'workout_override',
     jsonb_build_object(
       'type','workout_override',
       'anchorDate', to_char(CURRENT_DATE - 3, 'YYYY-MM-DD'),
       'workoutId','52f2bbe7-0c3f-4728-b7c9-34a2223cf0b8',
       'activityIndex', 0,
       'ops', jsonb_build_array(
         jsonb_build_object(
           'kind','change_set_value',
           'variationId','8e31acae-fbb2-4221-8405-dba9ec818586',
           'setIndex', 0,
           'field','loadPercent',
           'value', 105
         )
       )
     )),

    ('fa100012-aaaa-4aaa-8aaa-000000000312'::uuid,
     'ca100010-aaaa-4aaa-8aaa-000000000010'::uuid, 1, 1, 1, 'extra_activity',
     jsonb_build_object(
       'type','extra_activity',
       'anchorDate', to_char(CURRENT_DATE - 5, 'YYYY-MM-DD'),
       'activity', jsonb_build_object(
         'kind','cardio',
         'cardioProgramId','cd111104-1111-4aaa-8aaa-000000000004',
         'cardioProgramName','Bike 140-155 bpm — 25min'
       ),
       'position', 1
     )),

    ('fa100013-aaaa-4aaa-8aaa-000000000313'::uuid,
     'ca100010-aaaa-4aaa-8aaa-000000000010'::uuid, NULL, NULL, NULL, 'stop_until',
     jsonb_build_object(
       'type','stop_until',
       'fromDate', to_char(CURRENT_DATE + 10, 'YYYY-MM-DD'),
       'toDate',   to_char(CURRENT_DATE + 13, 'YYYY-MM-DD')
     ))
  ON CONFLICT DO NOTHING;

  -- ================================================================
  -- Occurrences c10: 3 ciclos (passado, presente, futuro), com dias
  -- que misturam treino + cardio no mesmo dia.
  -- ================================================================
  INSERT INTO public.periodization_occurrences
    (id, periodization_id,
     planned_date, cycle,
     template_day_id, template_activity_id,
     position_in_day,
     origin, source_adjustment_id,
     day_type, kind, workout_id, cardio_program_id,
     status, executed_at, workout_log_id, skipped_reason)
  VALUES
    -- ── Ciclo 1 (passado) ─────────────────────────────
    -- Dia -7: Treino A + Cardio Z2
    ('fc100010-aaaa-4aaa-8aaa-000000002010'::uuid, 'ca100010-aaaa-4aaa-8aaa-000000000010'::uuid,
     CURRENT_DATE - 7, 1,
     'ba100010-aaaa-4aaa-8aaa-000000000110'::uuid, 'aa100010-aaaa-4aaa-8aaa-000000000210'::uuid,
     0, 'template', NULL,
     'training', 'workout', '52f2bbe7-0c3f-4728-b7c9-34a2223cf0b8'::uuid, NULL,
     'done', NOW() - interval '7 days', NULL, NULL),
    ('fc100011-aaaa-4aaa-8aaa-000000002011'::uuid, 'ca100010-aaaa-4aaa-8aaa-000000000010'::uuid,
     CURRENT_DATE - 7, 1,
     'ba100010-aaaa-4aaa-8aaa-000000000110'::uuid, 'aa100011-aaaa-4aaa-8aaa-000000000211'::uuid,
     1, 'template', NULL,
     'training', 'cardio', NULL, 'cd111101-1111-4aaa-8aaa-000000000001'::uuid,
     'done', NOW() - interval '7 days', NULL, NULL),

    -- Dia -6: HIIT (skipped)
    ('fc100012-aaaa-4aaa-8aaa-000000002012'::uuid, 'ca100010-aaaa-4aaa-8aaa-000000000010'::uuid,
     CURRENT_DATE - 6, 1,
     'ba100011-aaaa-4aaa-8aaa-000000000111'::uuid, 'aa100012-aaaa-4aaa-8aaa-000000000212'::uuid,
     0, 'template', NULL,
     'training', 'cardio', NULL, 'cd111102-1111-4aaa-8aaa-000000000002'::uuid,
     'skipped', NULL, NULL, 'Chuva forte, academia fechada'),

    -- Dia -5: Treino B + extra cardio bpm (origin='extra')
    ('fc100013-aaaa-4aaa-8aaa-000000002013'::uuid, 'ca100010-aaaa-4aaa-8aaa-000000000010'::uuid,
     CURRENT_DATE - 5, 1,
     'ba100012-aaaa-4aaa-8aaa-000000000112'::uuid, 'aa100013-aaaa-4aaa-8aaa-000000000213'::uuid,
     0, 'template', NULL,
     'training', 'workout', 'd94823aa-e98d-4516-9088-eee775693846'::uuid, NULL,
     'done', NOW() - interval '5 days', NULL, NULL),
    ('fc100014-aaaa-4aaa-8aaa-000000002014'::uuid, 'ca100010-aaaa-4aaa-8aaa-000000000010'::uuid,
     CURRENT_DATE - 5, 1,
     'ba100012-aaaa-4aaa-8aaa-000000000112'::uuid, NULL,
     1, 'template', NULL,
     'training', 'cardio', NULL, 'cd111104-1111-4aaa-8aaa-000000000004'::uuid,
     'done', NOW() - interval '5 days', NULL, NULL),

    -- Dia -4: rest
    ('fc100015-aaaa-4aaa-8aaa-000000002015'::uuid, 'ca100010-aaaa-4aaa-8aaa-000000000010'::uuid,
     CURRENT_DATE - 4, 1,
     'ba100013-aaaa-4aaa-8aaa-000000000113'::uuid, NULL,
     0, 'template', NULL,
     'rest', NULL, NULL, NULL,
     'done', NOW() - interval '4 days', NULL, NULL),

    -- ── Ciclo 2 (passado recente / hoje) ──────────────
    -- Dia -3: Treino A (com override +5%) + Cardio Z2
    ('fc100016-aaaa-4aaa-8aaa-000000002016'::uuid, 'ca100010-aaaa-4aaa-8aaa-000000000010'::uuid,
     CURRENT_DATE - 3, 2,
     'ba100010-aaaa-4aaa-8aaa-000000000110'::uuid, 'aa100010-aaaa-4aaa-8aaa-000000000210'::uuid,
     0, 'template', NULL,
     'training', 'workout', '52f2bbe7-0c3f-4728-b7c9-34a2223cf0b8'::uuid, NULL,
     'done', NOW() - interval '3 days', NULL, NULL),
    ('fc100017-aaaa-4aaa-8aaa-000000002017'::uuid, 'ca100010-aaaa-4aaa-8aaa-000000000010'::uuid,
     CURRENT_DATE - 3, 2,
     'ba100010-aaaa-4aaa-8aaa-000000000110'::uuid, 'aa100011-aaaa-4aaa-8aaa-000000000211'::uuid,
     1, 'template', NULL,
     'training', 'cardio', NULL, 'cd111101-1111-4aaa-8aaa-000000000001'::uuid,
     'done', NOW() - interval '3 days', NULL, NULL),

    -- Dia -2: HIIT
    ('fc100018-aaaa-4aaa-8aaa-000000002018'::uuid, 'ca100010-aaaa-4aaa-8aaa-000000000010'::uuid,
     CURRENT_DATE - 2, 2,
     'ba100011-aaaa-4aaa-8aaa-000000000111'::uuid, 'aa100012-aaaa-4aaa-8aaa-000000000212'::uuid,
     0, 'template', NULL,
     'training', 'cardio', NULL, 'cd111102-1111-4aaa-8aaa-000000000002'::uuid,
     'done', NOW() - interval '2 days', NULL, NULL),

    -- Dia -1: Treino B
    ('fc100019-aaaa-4aaa-8aaa-000000002019'::uuid, 'ca100010-aaaa-4aaa-8aaa-000000000010'::uuid,
     CURRENT_DATE - 1, 2,
     'ba100012-aaaa-4aaa-8aaa-000000000112'::uuid, 'aa100013-aaaa-4aaa-8aaa-000000000213'::uuid,
     0, 'template', NULL,
     'training', 'workout', 'd94823aa-e98d-4516-9088-eee775693846'::uuid, NULL,
     'done', NOW() - interval '1 day', NULL, NULL),

    -- Dia 0 (hoje): rest pending
    ('fc10001a-aaaa-4aaa-8aaa-00000000201a'::uuid, 'ca100010-aaaa-4aaa-8aaa-000000000010'::uuid,
     CURRENT_DATE, 2,
     'ba100013-aaaa-4aaa-8aaa-000000000113'::uuid, NULL,
     0, 'template', NULL,
     'rest', NULL, NULL, NULL,
     'pending', NULL, NULL, NULL),

    -- ── Ciclo 3 (futuro) ─────────────────────────────
    -- Dia +1: Treino A + Cardio Z2
    ('fc10001b-aaaa-4aaa-8aaa-00000000201b'::uuid, 'ca100010-aaaa-4aaa-8aaa-000000000010'::uuid,
     CURRENT_DATE + 1, 3,
     'ba100010-aaaa-4aaa-8aaa-000000000110'::uuid, 'aa100010-aaaa-4aaa-8aaa-000000000210'::uuid,
     0, 'template', NULL,
     'training', 'workout', '52f2bbe7-0c3f-4728-b7c9-34a2223cf0b8'::uuid, NULL,
     'pending', NULL, NULL, NULL),
    ('fc10001c-aaaa-4aaa-8aaa-00000000201c'::uuid, 'ca100010-aaaa-4aaa-8aaa-000000000010'::uuid,
     CURRENT_DATE + 1, 3,
     'ba100010-aaaa-4aaa-8aaa-000000000110'::uuid, 'aa100011-aaaa-4aaa-8aaa-000000000211'::uuid,
     1, 'template', NULL,
     'training', 'cardio', NULL, 'cd111101-1111-4aaa-8aaa-000000000001'::uuid,
     'pending', NULL, NULL, NULL),

    -- Dia +2: HIIT
    ('fc10001d-aaaa-4aaa-8aaa-00000000201d'::uuid, 'ca100010-aaaa-4aaa-8aaa-000000000010'::uuid,
     CURRENT_DATE + 2, 3,
     'ba100011-aaaa-4aaa-8aaa-000000000111'::uuid, 'aa100012-aaaa-4aaa-8aaa-000000000212'::uuid,
     0, 'template', NULL,
     'training', 'cardio', NULL, 'cd111102-1111-4aaa-8aaa-000000000002'::uuid,
     'pending', NULL, NULL, NULL),

    -- Dia +3: Treino B
    ('fc10001e-aaaa-4aaa-8aaa-00000000201e'::uuid, 'ca100010-aaaa-4aaa-8aaa-000000000010'::uuid,
     CURRENT_DATE + 3, 3,
     'ba100012-aaaa-4aaa-8aaa-000000000112'::uuid, 'aa100013-aaaa-4aaa-8aaa-000000000213'::uuid,
     0, 'template', NULL,
     'training', 'workout', 'd94823aa-e98d-4516-9088-eee775693846'::uuid, NULL,
     'pending', NULL, NULL, NULL),

    -- Dia +4: rest
    ('fc10001f-aaaa-4aaa-8aaa-00000000201f'::uuid, 'ca100010-aaaa-4aaa-8aaa-000000000010'::uuid,
     CURRENT_DATE + 4, 3,
     'ba100013-aaaa-4aaa-8aaa-000000000113'::uuid, NULL,
     0, 'template', NULL,
     'rest', NULL, NULL, NULL,
     'pending', NULL, NULL, NULL)
  ON CONFLICT DO NOTHING;

  -- ================================================================
  -- Extra cardio adjustment + occurrence em c1 (periodização existente
  -- do Lucas): adiciona cardio de recuperação após a sessão pendente
  -- de hoje para demonstrar treino + cardio no mesmo dia.
  -- ================================================================
  INSERT INTO public.periodization_adjustments
    (id, periodization_id, cycle_start, cycle_end, cycle_every, type, payload)
  VALUES
    ('fa100020-aaaa-4aaa-8aaa-000000000320'::uuid,
     'c1100001-aaaa-4aaa-8aaa-000000000001'::uuid, 3, 3, 1, 'extra_activity',
     jsonb_build_object(
       'type','extra_activity',
       'anchorDate', to_char(CURRENT_DATE, 'YYYY-MM-DD'),
       'activity', jsonb_build_object(
         'kind','cardio',
         'cardioProgramId','cd111103-1111-4aaa-8aaa-000000000003',
         'cardioProgramName','Caminhada leve — 30min'
       ),
       'position', 1
     ))
  ON CONFLICT DO NOTHING;

  INSERT INTO public.periodization_occurrences
    (id, periodization_id,
     planned_date, cycle,
     template_day_id, template_activity_id,
     position_in_day,
     origin, source_adjustment_id,
     day_type, kind, workout_id, cardio_program_id,
     status, executed_at, workout_log_id, skipped_reason)
  VALUES
    ('fb100020-aaaa-4aaa-8aaa-000000001020'::uuid, 'c1100001-aaaa-4aaa-8aaa-000000000001'::uuid,
     CURRENT_DATE, 3,
     'b1100001-aaaa-4aaa-8aaa-000000000101'::uuid, NULL,
     1, 'template', NULL,
     'training', 'cardio', NULL, 'cd111103-1111-4aaa-8aaa-000000000003'::uuid,
     'pending', NULL, NULL, NULL)
  ON CONFLICT DO NOTHING;
END $$;

SET session_replication_role = 'origin';
