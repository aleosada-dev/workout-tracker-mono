-- Rollback: save_periodization_edit RPC

DROP FUNCTION IF EXISTS public.save_periodization_edit(
  uuid, date, date, uuid[], jsonb, uuid[], jsonb, jsonb
);
