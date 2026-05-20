-- ================================================
-- SEED: public.muscles
-- Hierarquia 3 níveis: grupo (1) → músculo (2) → sub-músculo (3)
-- Inserção em ordem crescente de nível para respeitar FKs e trigger
-- ================================================

-- -------------------------------------------------
-- Nível 1: Grupos
-- -------------------------------------------------
INSERT INTO public.muscles (id, name, slug, level, parent_id, sort_order, created_at) VALUES
  ('a2166200-55e9-4ba9-acfc-f57f08dc4423', 'Superiores', 'upperBody', 1, NULL, 0, '2026-03-22 18:36:52.905836+00'),
  ('cf708dc5-7346-4af4-ad85-46651d5daacf', 'Inferiores', 'lowerBody', 1, NULL, 1, '2026-03-22 18:36:52.905836+00'),
  ('9b7c75f1-e160-4bef-9acc-45367e4ca7ed', 'Core',       'core',       1, NULL, 2, '2026-03-22 18:36:52.905836+00')
ON CONFLICT DO NOTHING;

-- -------------------------------------------------
-- Nível 2: Músculos — Superiores
-- -------------------------------------------------
INSERT INTO public.muscles (id, name, slug, level, parent_id, sort_order, created_at) VALUES
  ('dc2d2b99-eff0-4a81-b949-c23e6cf61b75', 'Peito',             'chest',     2, 'a2166200-55e9-4ba9-acfc-f57f08dc4423', 0, '2026-03-15 17:35:21.450699+00'),
  ('9de6361c-024f-4d83-ac13-5b42d3e9cd2b', 'Costas',            'back',      2, 'a2166200-55e9-4ba9-acfc-f57f08dc4423', 1, '2026-03-15 17:35:21.450699+00'),
  ('2022b46d-433e-4c59-b462-8bd19226ade7', 'Ombros',            'shoulders', 2, 'a2166200-55e9-4ba9-acfc-f57f08dc4423', 2, '2026-03-15 17:35:21.450699+00'),
  ('1c8e2adc-312e-48eb-be92-034cbe78ec7e', 'Bíceps',            'biceps',    2, 'a2166200-55e9-4ba9-acfc-f57f08dc4423', 3, '2026-03-15 17:35:21.450699+00'),
  ('ee7ec83a-0d48-4127-a6e7-9d012b63eb65', 'Tríceps',           'triceps',   2, 'a2166200-55e9-4ba9-acfc-f57f08dc4423', 4, '2026-03-15 17:35:21.450699+00'),
  ('d95d3718-3671-47d8-a754-3eed4b09f2a5', 'Antebraço',         'forearms',  2, 'a2166200-55e9-4ba9-acfc-f57f08dc4423', 5, '2026-03-22 20:27:27.993838+00')
ON CONFLICT DO NOTHING;

-- Nível 2: Músculos — Inferiores
INSERT INTO public.muscles (id, name, slug, level, parent_id, sort_order, created_at) VALUES
  ('76334d4f-457b-4482-89fc-ee33f253a773', 'Quadríceps',        'quadriceps', 2, 'cf708dc5-7346-4af4-ad85-46651d5daacf', 0, '2026-03-15 17:35:21.450699+00'),
  ('ee92af75-e9c2-4b0d-8566-aa6686c673ce', 'Posterior de Coxa', 'hamstrings', 2, 'cf708dc5-7346-4af4-ad85-46651d5daacf', 1, '2026-03-15 17:35:21.450699+00'),
  ('ed3dccf4-dac4-4c2d-b065-3b1277cdca21', 'Glúteos',           'glutes',     2, 'cf708dc5-7346-4af4-ad85-46651d5daacf', 2, '2026-03-15 17:35:21.450699+00'),
  ('a068a650-2506-417e-bd0b-70ee0f56a785', 'Panturrilhas',      'calves',     2, 'cf708dc5-7346-4af4-ad85-46651d5daacf', 3, '2026-03-15 17:35:21.450699+00'),
  ('47d4608a-dd5b-4e29-8ba4-d8469543fca0', 'Adutores',          'adductors',  2, 'cf708dc5-7346-4af4-ad85-46651d5daacf', 4, '2026-03-24 18:45:40.929026+00')
ON CONFLICT DO NOTHING;

-- Nível 2: Músculos — Core
INSERT INTO public.muscles (id, name, slug, level, parent_id, sort_order, created_at) VALUES
  ('23bfccf7-9c69-4bc6-8203-510de9255674', 'Abdômen', 'abs',        2, '9b7c75f1-e160-4bef-9acc-45367e4ca7ed', 0, '2026-03-15 17:35:21.450699+00'),
  ('c6872722-030c-45c4-813f-58e274b80737', 'Lombar',  'lowerBack', 2, '9b7c75f1-e160-4bef-9acc-45367e4ca7ed', 1, '2026-03-22 18:36:52.905836+00')
ON CONFLICT DO NOTHING;

-- -------------------------------------------------
-- Nível 3: Sub-músculos — Peito
-- -------------------------------------------------
INSERT INTO public.muscles (id, name, slug, level, parent_id, sort_order, created_at) VALUES
  ('e92d6c4c-8cec-4871-99e0-899b693c59d2', 'Peitoral Maior', 'pectoralisMajor', 3, 'dc2d2b99-eff0-4a81-b949-c23e6cf61b75', 0, '2026-03-22 18:36:52.905836+00'),
  ('58615ccc-f061-4828-8fa1-5fbed6fbc218', 'Peitoral Menor', 'pectoralisMinor', 3, 'dc2d2b99-eff0-4a81-b949-c23e6cf61b75', 1, '2026-03-22 18:36:52.905836+00')
ON CONFLICT DO NOTHING;

-- Nível 3: Sub-músculos — Costas
INSERT INTO public.muscles (id, name, slug, level, parent_id, sort_order, created_at) VALUES
  ('1d82a560-1555-4c57-a093-4ae5f19e09c8', 'Latíssimo do Dorso', 'latissimusDorsi', 3, '9de6361c-024f-4d83-ac13-5b42d3e9cd2b', 0, '2026-03-22 18:36:52.905836+00'),
  ('53f60bff-76ed-4ef6-9eb3-a6cfca3ee87e', 'Trapézio',           'trapezius',        3, '9de6361c-024f-4d83-ac13-5b42d3e9cd2b', 1, '2026-03-22 18:36:52.905836+00'),
  ('82192617-5fcc-43f6-8e00-1f6ce0c312a2', 'Romboides',          'rhomboids',        3, '9de6361c-024f-4d83-ac13-5b42d3e9cd2b', 2, '2026-03-22 18:36:52.905836+00'),
  ('75063e28-a1c2-4ec4-9d7a-40eb18439f53', 'Eretor da Espinha',  'erectorSpinae',   3, '9de6361c-024f-4d83-ac13-5b42d3e9cd2b', 3, '2026-03-22 18:36:52.905836+00')
ON CONFLICT DO NOTHING;

-- Nível 3: Sub-músculos — Ombros
INSERT INTO public.muscles (id, name, slug, level, parent_id, sort_order, created_at) VALUES
  ('705396eb-a37b-416a-98b0-b97af8d4c764', 'Deltoide Anterior',  'anteriorDeltoid',  3, '2022b46d-433e-4c59-b462-8bd19226ade7', 0, '2026-03-22 18:36:52.905836+00'),
  ('37c9f3fe-9b45-4e7c-a1d7-6fef516030e9', 'Deltoide Lateral',   'lateralDeltoid',   3, '2022b46d-433e-4c59-b462-8bd19226ade7', 1, '2026-03-22 18:36:52.905836+00'),
  ('7905a85d-7aaa-425c-90f8-5f67de01b74d', 'Deltoide Posterior', 'posteriorDeltoid', 3, '2022b46d-433e-4c59-b462-8bd19226ade7', 2, '2026-03-22 18:36:52.905836+00')
ON CONFLICT DO NOTHING;

-- Nível 3: Sub-músculos — Bíceps
INSERT INTO public.muscles (id, name, slug, level, parent_id, sort_order, created_at) VALUES
  ('1570ceb7-0498-4bf2-936a-e378dd0255a6', 'Bíceps Cabeça Longa', 'bicepsLongHead',  3, '1c8e2adc-312e-48eb-be92-034cbe78ec7e', 0, '2026-03-22 18:36:52.905836+00'),
  ('0f0b4b2f-6751-4d0e-8ca7-e87715768d17', 'Bíceps Cabeça Curta', 'bicepsShortHead', 3, '1c8e2adc-312e-48eb-be92-034cbe78ec7e', 1, '2026-03-22 18:36:52.905836+00')
ON CONFLICT DO NOTHING;

-- Nível 3: Sub-músculos — Tríceps
INSERT INTO public.muscles (id, name, slug, level, parent_id, sort_order, created_at) VALUES
  ('ba0e9dc6-0da3-43f3-ac63-52eeb3c5845d', 'Tríceps Cabeça Longa',   'tricepsLongHead',    3, 'ee7ec83a-0d48-4127-a6e7-9d012b63eb65', 0, '2026-03-22 18:36:52.905836+00'),
  ('b3dca6e9-81e0-4ca6-8686-ace7bbcffba2', 'Tríceps Cabeça Lateral', 'tricepsLateralHead', 3, 'ee7ec83a-0d48-4127-a6e7-9d012b63eb65', 1, '2026-03-22 18:36:52.905836+00'),
  ('70185aca-5199-4ad8-bcec-65609c46c6b4', 'Tríceps Cabeça Medial',  'tricepsMedialHead',  3, 'ee7ec83a-0d48-4127-a6e7-9d012b63eb65', 2, '2026-03-22 18:36:52.905836+00')
ON CONFLICT DO NOTHING;

-- Nível 3: Sub-músculos — Antebraço
INSERT INTO public.muscles (id, name, slug, level, parent_id, sort_order, created_at) VALUES
  ('2ac3a27e-f677-414c-af02-f8818763d232', 'Braquiorradial',      'brachioradialis', 3, 'd95d3718-3671-47d8-a754-3eed4b09f2a5', 0, '2026-03-22 20:27:27.993838+00'),
  ('9cdefb26-0fad-4d9d-8bbf-ac48ae8a3845', 'Flexores do Punho',   'wristFlexors',   3, 'd95d3718-3671-47d8-a754-3eed4b09f2a5', 1, '2026-03-22 20:27:27.993838+00'),
  ('73d48b72-2125-42d6-a69d-95abb35a5f2c', 'Extensores do Punho', 'wristExtensors', 3, 'd95d3718-3671-47d8-a754-3eed4b09f2a5', 2, '2026-03-22 20:27:27.993838+00')
ON CONFLICT DO NOTHING;

-- Nível 3: Sub-músculos — Quadríceps
INSERT INTO public.muscles (id, name, slug, level, parent_id, sort_order, created_at) VALUES
  ('fe2a28a0-193e-465b-a17c-a13f25c6a7c0', 'Vasto Lateral',    'vastusLateralis',   3, '76334d4f-457b-4482-89fc-ee33f253a773', 0, '2026-03-22 18:36:52.905836+00'),
  ('f45d971f-2e1f-4eb8-b34f-c8bfede51ee6', 'Vasto Medial',     'vastusMedialis',    3, '76334d4f-457b-4482-89fc-ee33f253a773', 1, '2026-03-22 18:36:52.905836+00'),
  ('2ec787f7-d03c-4368-9d69-7ae758f1c511', 'Vasto Intermédio', 'vastusIntermedius', 3, '76334d4f-457b-4482-89fc-ee33f253a773', 2, '2026-03-22 18:36:52.905836+00'),
  ('88568c8d-1388-41d0-a731-b1ef758d4688', 'Reto Femoral',     'rectusFemoris',     3, '76334d4f-457b-4482-89fc-ee33f253a773', 3, '2026-03-22 18:36:52.905836+00')
ON CONFLICT DO NOTHING;

-- Nível 3: Sub-músculos — Posterior de Coxa
INSERT INTO public.muscles (id, name, slug, level, parent_id, sort_order, created_at) VALUES
  ('79c30f92-5f7b-4555-8048-8451fcd73118', 'Bíceps Femoral',  'bicepsFemoris',  3, 'ee92af75-e9c2-4b0d-8566-aa6686c673ce', 0, '2026-03-22 18:36:52.905836+00'),
  ('916c5cae-d586-499d-bcc4-04a77b23271e', 'Semitendíneo',    'semitendinosus',  3, 'ee92af75-e9c2-4b0d-8566-aa6686c673ce', 1, '2026-03-22 18:36:52.905836+00'),
  ('ba50b93f-1ffa-4b63-83ba-c9e78247ac39', 'Semimembranáceo', 'semimembranosus', 3, 'ee92af75-e9c2-4b0d-8566-aa6686c673ce', 2, '2026-03-22 18:36:52.905836+00')
ON CONFLICT DO NOTHING;

-- Nível 3: Sub-músculos — Glúteos
INSERT INTO public.muscles (id, name, slug, level, parent_id, sort_order, created_at) VALUES
  ('4ead1ea9-c790-4475-b727-2aba6c53157d', 'Glúteo Máximo', 'gluteusMaximus', 3, 'ed3dccf4-dac4-4c2d-b065-3b1277cdca21', 0, '2026-03-22 18:36:52.905836+00'),
  ('40863d4e-3189-481f-90b3-0a978455d65d', 'Glúteo Médio',  'gluteusMedius',  3, 'ed3dccf4-dac4-4c2d-b065-3b1277cdca21', 1, '2026-03-22 18:36:52.905836+00'),
  ('f402bc82-0402-4d54-9c73-4d8b233e7b82', 'Glúteo Mínimo', 'gluteusMinimus', 3, 'ed3dccf4-dac4-4c2d-b065-3b1277cdca21', 2, '2026-03-22 18:36:52.905836+00')
ON CONFLICT DO NOTHING;

-- Nível 3: Sub-músculos — Panturrilhas
INSERT INTO public.muscles (id, name, slug, level, parent_id, sort_order, created_at) VALUES
  ('f86a8d5e-84f2-4791-8932-888ec1aca538', 'Gastrocnêmio', 'gastrocnemius', 3, 'a068a650-2506-417e-bd0b-70ee0f56a785', 0, '2026-03-22 18:36:52.905836+00'),
  ('30231349-0cdc-4380-868c-6f1b84f65958', 'Sóleo',        'soleus',        3, 'a068a650-2506-417e-bd0b-70ee0f56a785', 1, '2026-03-22 18:36:52.905836+00')
ON CONFLICT DO NOTHING;

-- Nível 3: Sub-músculos — Abdômen
INSERT INTO public.muscles (id, name, slug, level, parent_id, sort_order, created_at) VALUES
  ('0e376e2d-fb0f-4e71-ba90-98cb348c0340', 'Reto Abdominal',       'rectusAbdominis',     3, '23bfccf7-9c69-4bc6-8203-510de9255674', 0, '2026-03-22 18:36:52.905836+00'),
  ('14d9de74-77e5-4a77-8ae3-86f00a3736e0', 'Oblíquos',             'obliques',             3, '23bfccf7-9c69-4bc6-8203-510de9255674', 1, '2026-03-22 18:36:52.905836+00'),
  ('638c6a4c-c8b8-4fb4-b222-25ae9aa1ca02', 'Transverso Abdominal', 'transverseAbdominis', 3, '23bfccf7-9c69-4bc6-8203-510de9255674', 2, '2026-03-22 18:36:52.905836+00')
ON CONFLICT DO NOTHING;

-- Nível 3: Sub-músculos — Lombar
INSERT INTO public.muscles (id, name, slug, level, parent_id, sort_order, created_at) VALUES
  ('25f38cc9-5979-48e2-b569-d8f42ac6eb73', 'Eretor da Espinha Lombar', 'lumbarErectorSpinae', 3, 'c6872722-030c-45c4-813f-58e274b80737', 0, '2026-03-22 18:36:52.905836+00')
ON CONFLICT DO NOTHING;
