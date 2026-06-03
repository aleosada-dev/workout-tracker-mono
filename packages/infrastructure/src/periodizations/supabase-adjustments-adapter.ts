import type {
  PeriodizationAdjustment,
  PeriodizationAdjustmentRepository,
} from '@workout-tracker/domain';
import type { Supabase } from '../supabase/client';
import { supabaseError } from '../supabase/supabase-error';
import { type AdjustmentRow, toAdjustment } from './supabase-adjustments-mapper';

const ADJUSTMENTS_SELECT = `
  id,
  periodization_id,
  cycle_start,
  cycle_end,
  cycle_every,
  type,
  payload,
  created_at
` as const;

export function makeSupabasePeriodizationAdjustmentRepository(
  supabase: Supabase,
): PeriodizationAdjustmentRepository {
  return {
    async listAdjustments(periodizationId) {
      const { data, error } = await supabase
        .from('periodization_adjustments')
        .select(ADJUSTMENTS_SELECT)
        .eq('periodization_id', periodizationId)
        .in('type', ['workout_override', 'note'])
        .order('created_at', { ascending: true });

      if (error) {
        throw supabaseError('Failed to list periodization adjustments', error);
      }

      const rows = (data ?? []) as unknown as AdjustmentRow[];
      return rows
        .map(toAdjustment)
        .filter((adjustment): adjustment is PeriodizationAdjustment => adjustment !== null);
    },
  };
}
