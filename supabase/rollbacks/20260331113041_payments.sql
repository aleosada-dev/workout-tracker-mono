-- Rollback: Restaurar campos em coach_sessions e remover tabelas de payments

-- 1. Restaurar campos
ALTER TABLE public.coach_sessions
  ADD COLUMN is_paid boolean NOT NULL DEFAULT false,
  ADD COLUMN paid_at timestamptz,
  ADD COLUMN payment_amount numeric(8,2),
  ADD COLUMN payment_method text;

-- 2. Migrar dados de volta
UPDATE public.coach_sessions cs
SET
  is_paid = true,
  paid_at = p.paid_at,
  payment_amount = p.amount,
  payment_method = p.payment_method
FROM public.payment_sessions ps
JOIN public.payments p ON p.id = ps.payment_id
WHERE ps.session_id = cs.id;

-- 3. Remover tabelas
DROP TABLE IF EXISTS public.payment_sessions;
DROP TABLE IF EXISTS public.payments;
