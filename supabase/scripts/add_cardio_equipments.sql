-- ================================================
-- SCRIPT: add cardio / duration & distance equipments
-- Equipamentos para exercícios de duração ou distância
-- (esteira, bicicleta, remador, elíptico, escada).
-- Estes equipamentos NÃO compõem o nome do exercício
-- (ver NAME_ONLY_EQUIPMENT_SLUGS no app mobile).
--
-- Idempotente: rode com segurança em bancos já populados.
-- ================================================

INSERT INTO public.equipments (id, name, slug, preposition, created_at) VALUES
  ('424ec1e4-e19f-4275-85cc-f8e7a8061fb0', 'Esteira',                'treadmill',     'na', '2026-06-09 00:00:00+00'),
  ('07844f3b-183b-4abe-b390-8ad3bddea958', 'Bicicleta Ergométrica',  'stationaryBike','na', '2026-06-09 00:00:00+00'),
  ('c38c0436-accc-421d-a265-26bb7a36d29e', 'Remador',                'rowingMachine', 'no', '2026-06-09 00:00:00+00'),
  ('371bde59-79b3-44dd-9210-fbff76999eb2', 'Elíptico',               'elliptical',    'no', '2026-06-09 00:00:00+00'),
  ('37652ba9-3e9c-40d5-9e79-efb4d9fc3cce', 'Escada',                 'stairClimber',  'na', '2026-06-09 00:00:00+00')
ON CONFLICT DO NOTHING;
