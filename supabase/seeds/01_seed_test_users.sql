-- ================================================
-- SEED: Usuários de teste
--
-- 10 usuários: 2 coaches + 8 athletes
-- Senha de todos: Abcdef0123.
-- Emails: teste1@teste.com ... teste10@teste.com
-- ================================================

DO $$
DECLARE
  coach1_id  uuid := '39e03cce-5ca5-46c2-b34d-92682a582f05';
  coach2_id  uuid := '32e6797e-7aba-49a7-977c-2a575060217b';
  athlete1_id uuid := 'af890a2d-f0fd-415e-b69d-2a52d061b8bc';
  athlete2_id uuid := '23d85092-0160-464d-8b31-577bcf6b563d';
  athlete3_id uuid := '9cd153b7-00e7-4f20-98f4-821b78d8d445';
  athlete4_id uuid := 'ab4519dd-7e7a-47d9-aa01-08889590ca24';
  athlete5_id uuid := 'a645596a-79d6-42f1-b221-ce9be642adfe';
  athlete6_id uuid := '2479427f-c95f-48c4-b22a-e5601c339e0e';
  athlete7_id uuid := '9010f10e-4357-487f-8e60-51eb66e5684b';
  athlete8_id uuid := 'ac352e38-b596-4367-bc00-5a60194e942d';
  hashed_pw  text;
BEGIN
  hashed_pw := extensions.crypt('Abcdef0123.', extensions.gen_salt('bf'));

  -- ------------------------------------------------
  -- auth.users
  -- ------------------------------------------------
  INSERT INTO auth.users (
    instance_id, id, aud, role,
    email, encrypted_password,
    email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at,
    confirmation_token, email_change, email_change_token_new, recovery_token
  ) VALUES
    -- Coaches
    (
      '00000000-0000-0000-0000-000000000000', coach1_id,
      'authenticated', 'authenticated',
      'teste1@teste.com', hashed_pw,
      now(),
      '{"provider":"email","providers":["email"]}',
      '{"full_name":"Carlos Mendes","display_name":"Carlos Mendes","role":"coach"}',
      now(), now(), '', '', '', ''
    ),
    (
      '00000000-0000-0000-0000-000000000000', coach2_id,
      'authenticated', 'authenticated',
      'teste2@teste.com', hashed_pw,
      now(),
      '{"provider":"email","providers":["email"]}',
      '{"full_name":"Ana Rodrigues","display_name":"Ana Rodrigues","role":"coach"}',
      now(), now(), '', '', '', ''
    ),
    -- Athletes
    (
      '00000000-0000-0000-0000-000000000000', athlete1_id,
      'authenticated', 'authenticated',
      'teste3@teste.com', hashed_pw,
      now(),
      '{"provider":"email","providers":["email"]}',
      '{"full_name":"Lucas Silva","display_name":"Lucas Silva","role":"athlete"}',
      now(), now(), '', '', '', ''
    ),
    (
      '00000000-0000-0000-0000-000000000000', athlete2_id,
      'authenticated', 'authenticated',
      'teste4@teste.com', hashed_pw,
      now(),
      '{"provider":"email","providers":["email"]}',
      '{"full_name":"Fernanda Costa","display_name":"Fernanda Costa","role":"athlete"}',
      now(), now(), '', '', '', ''
    ),
    (
      '00000000-0000-0000-0000-000000000000', athlete3_id,
      'authenticated', 'authenticated',
      'teste5@teste.com', hashed_pw,
      now(),
      '{"provider":"email","providers":["email"]}',
      '{"full_name":"Rafael Oliveira","display_name":"Rafael Oliveira","role":"athlete"}',
      now(), now(), '', '', '', ''
    ),
    (
      '00000000-0000-0000-0000-000000000000', athlete4_id,
      'authenticated', 'authenticated',
      'teste6@teste.com', hashed_pw,
      now(),
      '{"provider":"email","providers":["email"]}',
      '{"full_name":"Juliana Pereira","display_name":"Juliana Pereira","role":"athlete"}',
      now(), now(), '', '', '', ''
    ),
    (
      '00000000-0000-0000-0000-000000000000', athlete5_id,
      'authenticated', 'authenticated',
      'teste7@teste.com', hashed_pw,
      now(),
      '{"provider":"email","providers":["email"]}',
      '{"full_name":"Marcos Santos","display_name":"Marcos Santos","role":"athlete"}',
      now(), now(), '', '', '', ''
    ),
    (
      '00000000-0000-0000-0000-000000000000', athlete6_id,
      'authenticated', 'authenticated',
      'teste8@teste.com', hashed_pw,
      now(),
      '{"provider":"email","providers":["email"]}',
      '{"full_name":"Beatriz Lima","display_name":"Beatriz Lima","role":"athlete"}',
      now(), now(), '', '', '', ''
    ),
    (
      '00000000-0000-0000-0000-000000000000', athlete7_id,
      'authenticated', 'authenticated',
      'teste9@teste.com', hashed_pw,
      now(),
      '{"provider":"email","providers":["email"]}',
      '{"full_name":"Thiago Alves","display_name":"Thiago Alves","role":"athlete"}',
      now(), now(), '', '', '', ''
    ),
    (
      '00000000-0000-0000-0000-000000000000', athlete8_id,
      'authenticated', 'authenticated',
      'teste10@teste.com', hashed_pw,
      now(),
      '{"provider":"email","providers":["email"]}',
      '{"full_name":"Camila Ferreira","display_name":"Camila Ferreira","role":"athlete"}',
      now(), now(), '', '', '', ''
    );

  -- ------------------------------------------------
  -- public.profiles — Coach 1: Carlos Mendes
  -- Especialidade: Emagrecimento
  -- ------------------------------------------------
  UPDATE public.profiles SET
    slug               = 'carlos-mendes-fit',
    bio                = 'Personal trainer especializado em emagrecimento e recomposição corporal com mais de 8 anos de experiência. Trabalho com protocolos individualizados e acompanhamento próximo para garantir resultados reais e duradouros.',
    city               = 'São Paulo',
    specialties        = ARRAY['Emagrecimento', 'Recomposição Corporal'],
    credentials        = '[
      {"type": "CREF", "value": "012345-G/SP"},
      {"type": "Curso", "value": "Personal Trainer — CONFEF (2016)"},
      {"type": "Curso", "value": "Nutrição Esportiva Aplicada — FMUSP (2019)"},
      {"type": "Curso", "value": "Treinamento Funcional Avançado — ACAD Brasil (2021)"}
    ]'::jsonb,
    contact_links      = '[
      {"platform": "instagram", "url": "https://instagram.com/carlosmendesfit"},
      {"platform": "whatsapp", "url": "https://wa.me/5511999990001"}
    ]'::jsonb,
    gallery_urls       = '{}',
    profile_published  = true,
    onboarding_completed = true,
    sex                = 'male',
    birth_date         = DATE '1985-03-12',
    updated_at         = now()
  WHERE id = coach1_id;

  -- ------------------------------------------------
  -- public.profiles — Coach 2: Ana Rodrigues
  -- Especialidade: Hipertrofia
  -- ------------------------------------------------
  UPDATE public.profiles SET
    slug               = 'ana-rodrigues-treinos',
    bio                = 'Profissional de educação física focada em hipertrofia e ganho de força. Formada pela USP com pós-graduação em treinamento resistido. Atendo presencialmente em São Paulo e online para todo o Brasil.',
    city               = 'São Paulo',
    specialties        = ARRAY['Hipertrofia', 'Ganho de Força'],
    credentials        = '[
      {"type": "CREF", "value": "067890-G/SP"},
      {"type": "Curso", "value": "Educação Física — Universidade de São Paulo (2015)"},
      {"type": "Curso", "value": "Pós-Graduação em Treinamento Resistido — UNIFESP (2018)"},
      {"type": "Curso", "value": "Biomecânica Aplicada ao Esporte — USP (2020)"}
    ]'::jsonb,
    contact_links      = '[
      {"platform": "instagram", "url": "https://instagram.com/anarodriguestreinos"},
      {"platform": "whatsapp", "url": "https://wa.me/5511999990002"}
    ]'::jsonb,
    gallery_urls       = '{}',
    profile_published  = true,
    onboarding_completed = true,
    sex                = 'female',
    birth_date         = DATE '1990-07-25',
    updated_at         = now()
  WHERE id = coach2_id;

  -- ------------------------------------------------
  -- public.profiles — Athletes (onboarding concluído)
  -- ------------------------------------------------
  UPDATE public.profiles SET onboarding_completed = true, sex = 'male',   birth_date = DATE '1995-01-18', updated_at = now() WHERE id = athlete1_id;
  UPDATE public.profiles SET onboarding_completed = true, sex = 'female', birth_date = DATE '1992-05-09', updated_at = now() WHERE id = athlete2_id;
  UPDATE public.profiles SET onboarding_completed = true, sex = 'male',   birth_date = DATE '1988-11-02', updated_at = now() WHERE id = athlete3_id;
  UPDATE public.profiles SET onboarding_completed = true, sex = 'female', birth_date = DATE '1997-08-23', updated_at = now() WHERE id = athlete4_id;
  UPDATE public.profiles SET onboarding_completed = true, sex = 'male',   birth_date = DATE '1983-04-14', updated_at = now() WHERE id = athlete5_id;
  UPDATE public.profiles SET onboarding_completed = true, sex = 'female', birth_date = DATE '2000-02-29', updated_at = now() WHERE id = athlete6_id;
  UPDATE public.profiles SET onboarding_completed = true, sex = 'male',   birth_date = DATE '1993-09-30', updated_at = now() WHERE id = athlete7_id;
  UPDATE public.profiles SET onboarding_completed = true, sex = 'female', birth_date = DATE '1998-12-07', updated_at = now() WHERE id = athlete8_id;

END $$;
