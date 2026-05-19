-- ================================================
-- SEED: public.equipments
-- 12 equipamentos com UUIDs e preposições corretas
-- ================================================

INSERT INTO public.equipments (id, name, slug, preposition, created_at) VALUES
  ('d8377917-ef47-4a1d-973b-b15d0ead755c', 'Barra',         'barbell',            'com', '2026-03-15 17:35:21.450699+00'),
  ('bf6e017e-f787-4ca5-8457-c4a9a35d7c4d', 'Halteres',      'dumbbells',          'com', '2026-03-15 17:35:21.450699+00'),
  ('b5482b82-a010-413d-9072-895ccd1934a5', 'Máquina',       'machine',            'na',  '2026-03-15 17:35:21.450699+00'),
  ('3e234bea-7966-49e6-86e2-9003815c2195', 'Cabo',          'cable',              'no',  '2026-03-15 17:35:21.450699+00'),
  ('101de6a0-82f5-4e51-bc3c-5dcb86b8a5cd', 'Peso Corporal', 'bodyweight',         'com', '2026-03-15 17:35:21.450699+00'),
  ('d4cdf3b4-16c8-4128-9a73-564ac3f55391', 'Smith',         'smith-machine',      'no',  '2026-03-15 17:35:21.450699+00'),
  ('4b618dbe-72bc-4a00-a9e8-3c1da04c3cc2', 'Kettlebell',    'kettlebell',         'com', '2026-03-24 18:45:40.929026+00'),
  ('eab26ada-e155-458e-9668-7041940273af', 'Elástico',      'resistance-band',    'com', '2026-03-24 18:45:40.929026+00'),
  ('38bcf675-4ecb-4a52-85bd-234ef515a264', 'Anilha',        'weight-plate',       'com', '2026-03-24 18:45:40.929026+00'),
  ('0972beb4-cb4c-4061-bbd7-13555bee6845', 'Suspensão',     'suspension-trainer', 'na',  '2026-03-24 18:45:40.929026+00'),
  ('44336ebd-55f2-4b2d-81ba-546f6b8992b7', 'Outro',         'other',              'com', '2026-03-24 18:45:40.929026+00'),
  ('8a0a0028-796f-426e-a84f-250a57643718', 'Barra W',       'ez-curl-bar',        'com', '2026-03-25 14:44:15.097538+00')
ON CONFLICT DO NOTHING;
