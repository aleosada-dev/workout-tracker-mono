-- ================================================
-- Converte os slugs de muscles e equipments de kebab-case
-- (ex.: 'upper-body') para camelCase (ex.: 'upperBody'), para que
-- sirvam de chave direta nos arquivos .ts de tradução, sem aspas.
--
-- Genérico: cada hífen é removido e a palavra seguinte recebe a
-- inicial maiúscula. A primeira palavra é mantida em minúsculas.
-- Idempotente: só toca linhas que ainda contêm hífen, então pode
-- ser reexecutado com segurança.
-- ================================================
BEGIN;

UPDATE public.muscles
SET slug = (
  SELECT string_agg(
    CASE WHEN ord = 1 THEN word ELSE initcap(word) END,
    ''
    ORDER BY ord
  )
  FROM unnest(string_to_array(slug, '-')) WITH ORDINALITY AS parts(word, ord)
)
WHERE slug LIKE '%-%';

UPDATE public.equipments
SET slug = (
  SELECT string_agg(
    CASE WHEN ord = 1 THEN word ELSE initcap(word) END,
    ''
    ORDER BY ord
  )
  FROM unnest(string_to_array(slug, '-')) WITH ORDINALITY AS parts(word, ord)
)
WHERE slug LIKE '%-%';

COMMIT;
