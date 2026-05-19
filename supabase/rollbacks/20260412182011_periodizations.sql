DROP TRIGGER IF EXISTS set_periodizations_updated_at ON public.periodizations;
DROP FUNCTION IF EXISTS public.list_periodizations(uuid);
DROP FUNCTION IF EXISTS public.upsert_periodization(jsonb);
DROP TABLE IF EXISTS public.periodization_notes;
DROP TABLE IF EXISTS public.periodization_overrides;
DROP TABLE IF EXISTS public.periodization_microcycle_days;
DROP TABLE IF EXISTS public.periodization_microcycles;
DROP TABLE IF EXISTS public.periodizations;
