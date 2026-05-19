-- ================================================
-- SEED: Coach Location — Service Types, Gyms, Service Areas, Schedules
--
-- Coach 1 (Carlos Mendes): Online + Presencial em Academia
--   • Academia Alpha (São Paulo, Pinheiros) — Seg a Sex (default)
--   • CrossFit Beta (São Paulo, Vila Madalena) — Sáb (recurring)
--
-- Coach 2 (Ana Rodrigues): Online + Presencial em Academia + Domiciliar
--   • Studio Força (São Paulo, Moema) — Seg, Qua, Sex (recurring)
--   • Iron Gym (Campinas) — Ter, Qui (recurring)
--   • Área domiciliar: Centro de São Paulo, 15km — Seg a Sex (default)
-- ================================================

SET session_replication_role = 'replica';

DO $$
DECLARE
  coach1_id uuid := '39e03cce-5ca5-46c2-b34d-92682a582f05';
  coach2_id uuid := '32e6797e-7aba-49a7-977c-2a575060217b';

  -- Gym IDs (RFC 4122 compliant: 3rd group starts with 4, 4th with 8-b)
  gym_alpha_id  uuid := 'e0000001-0001-4001-a001-000000000001';
  gym_beta_id   uuid := 'e0000001-0001-4001-a001-000000000002';
  gym_studio_id uuid := 'e0000001-0001-4001-a001-000000000003';
  gym_iron_id   uuid := 'e0000001-0001-4001-a001-000000000004';

  -- Service area ID
  area_ana_id uuid := 'e0000001-0001-4001-a001-000000000005';

BEGIN

  -- ================================================
  -- Coach Service Types
  -- ================================================
  INSERT INTO public.coach_service_types (coach_id, service_type) VALUES
    (coach1_id, 'online'),
    (coach1_id, 'in_person_gym'),
    (coach2_id, 'online'),
    (coach2_id, 'in_person_gym'),
    (coach2_id, 'in_person_home');

  -- ================================================
  -- Coach 1 — Gyms
  -- ================================================

  -- Academia Alpha (Pinheiros, SP)
  INSERT INTO public.coach_gyms (id, coach_id, name, google_place_id, address, city, state, location) VALUES
    (gym_alpha_id, coach1_id,
     'Academia Alpha',
     'ChIJe2_gVfJZzpQR_alpha_test',
     'Rua dos Pinheiros, 900 - Pinheiros, São Paulo - SP',
     'São Paulo', 'SP',
     extensions.ST_SetSRID(extensions.st_makepoint(-46.6870, -23.5630), 4326)::extensions.geography);

  -- Default schedule (todos os dias)
  INSERT INTO public.coach_gym_schedules (gym_id, schedule_type) VALUES
    (gym_alpha_id, 'default');

  -- CrossFit Beta (Vila Madalena, SP)
  INSERT INTO public.coach_gyms (id, coach_id, name, google_place_id, address, city, state, location) VALUES
    (gym_beta_id, coach1_id,
     'CrossFit Beta',
     'ChIJe2_gVfJZzpQR_beta_test',
     'Rua Harmonia, 250 - Vila Madalena, São Paulo - SP',
     'São Paulo', 'SP',
     extensions.ST_SetSRID(extensions.st_makepoint(-46.6920, -23.5540), 4326)::extensions.geography);

  -- Sábado only (recurring, day_of_week = 6)
  INSERT INTO public.coach_gym_schedules (gym_id, schedule_type, day_of_week) VALUES
    (gym_beta_id, 'recurring', 6);

  -- ================================================
  -- Coach 2 — Gyms
  -- ================================================

  -- Studio Força (Moema, SP)
  INSERT INTO public.coach_gyms (id, coach_id, name, address, city, state, location) VALUES
    (gym_studio_id, coach2_id,
     'Studio Força',
     'Av. Ibirapuera, 2120 - Moema, São Paulo - SP',
     'São Paulo', 'SP',
     extensions.ST_SetSRID(extensions.st_makepoint(-46.6600, -23.6010), 4326)::extensions.geography);

  -- Seg (1), Qua (3), Sex (5)
  INSERT INTO public.coach_gym_schedules (gym_id, schedule_type, day_of_week) VALUES
    (gym_studio_id, 'recurring', 1),
    (gym_studio_id, 'recurring', 3),
    (gym_studio_id, 'recurring', 5);

  -- Iron Gym (Campinas)
  INSERT INTO public.coach_gyms (id, coach_id, name, address, city, state, location) VALUES
    (gym_iron_id, coach2_id,
     'Iron Gym',
     'Av. Norte-Sul, 500 - Centro, Campinas - SP',
     'Campinas', 'SP',
     extensions.ST_SetSRID(extensions.st_makepoint(-47.0616, -22.9064), 4326)::extensions.geography);

  -- Ter (2), Qui (4)
  INSERT INTO public.coach_gym_schedules (gym_id, schedule_type, day_of_week) VALUES
    (gym_iron_id, 'recurring', 2),
    (gym_iron_id, 'recurring', 4);

  -- ================================================
  -- Coach 2 — Service Areas (Domiciliar)
  -- ================================================

  -- Centro de São Paulo, raio 15km
  INSERT INTO public.coach_service_areas (id, coach_id, center, radius_km, address, city, state) VALUES
    (area_ana_id, coach2_id,
     extensions.ST_SetSRID(extensions.st_makepoint(-46.6340, -23.5489), 4326)::extensions.geography,
     15,
     'Praça da Sé - Centro, São Paulo - SP',
     'São Paulo', 'SP');

  -- Default schedule (todos os dias úteis implícito via default)
  INSERT INTO public.coach_service_area_schedules (service_area_id, schedule_type) VALUES
    (area_ana_id, 'default');

END $$;

SET session_replication_role = 'origin';
