-- Backfill: periodization_adjustments.payload.ops[].workoutExerciseId → variationId
--
-- Contexto: o schema WorkoutOverrideOpSchema (commit 5396906) renomeou a chave
-- `workoutExerciseId` para `variationId`. Linhas escritas antes do refactor ainda
-- usam a chave legada e são rejeitadas pelo z.strictObject ao salvar.
--
-- Este script é idempotente. Rode manualmente (psql ou Supabase SQL Editor).
-- Recomenda-se executar dentro de uma transação para revisar os RAISE NOTICE
-- antes de comitar.

-- 1) Dry-run: quantos adjustments serão tocados.
SELECT COUNT(*) AS adjustments_to_backfill
FROM public.periodization_adjustments
WHERE type = 'workout_override'
  AND payload::text LIKE '%workoutExerciseId%';

-- 2) Backfill propriamente dito.
DO $$
DECLARE
  rec               record;
  new_ops           jsonb;
  original_count    int;
  remaining_count   int;
  dropped_count     int := 0;
  updated_count     int := 0;
BEGIN
  FOR rec IN
    SELECT id, payload
    FROM public.periodization_adjustments
    WHERE type = 'workout_override'
      AND payload::text LIKE '%workoutExerciseId%'
  LOOP
    SELECT
      jsonb_agg(mapped_op ORDER BY ord)
        FILTER (WHERE mapped_op IS NOT NULL)
    INTO new_ops
    FROM (
      SELECT
        ord,
        CASE
          WHEN op ? 'variationId' THEN op
          WHEN op ? 'workoutExerciseId' AND we.variation_id IS NOT NULL THEN
            (op - 'workoutExerciseId')
              || jsonb_build_object('variationId', we.variation_id)
          ELSE NULL
        END AS mapped_op
      FROM jsonb_array_elements(rec.payload->'ops')
        WITH ORDINALITY AS t(op, ord)
      LEFT JOIN public.workout_exercises we
        ON we.id = (op->>'workoutExerciseId')::uuid
    ) sub;

    original_count  := jsonb_array_length(rec.payload->'ops');
    remaining_count := COALESCE(jsonb_array_length(new_ops), 0);
    dropped_count   := dropped_count + (original_count - remaining_count);

    UPDATE public.periodization_adjustments
    SET payload = jsonb_set(rec.payload, '{ops}', COALESCE(new_ops, '[]'::jsonb))
    WHERE id = rec.id;

    updated_count := updated_count + 1;
  END LOOP;

  RAISE NOTICE 'Adjustments updated: %', updated_count;
  RAISE NOTICE 'Ops dropped (workout_exercise inexistente): %', dropped_count;
END $$;

-- 3) Verificação pós-backfill: deve retornar 0.
SELECT COUNT(*) AS remaining_legacy_payloads
FROM public.periodization_adjustments
WHERE type = 'workout_override'
  AND payload::text LIKE '%workoutExerciseId%';
