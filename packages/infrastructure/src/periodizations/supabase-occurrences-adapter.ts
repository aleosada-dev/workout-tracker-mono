import type { PeriodizationOccurrenceRepository } from '@workout-tracker/domain';
import type { Supabase } from '../supabase/client';
import { supabaseError } from '../supabase/supabase-error';
import {
  type OccurrenceRow,
  type OccurrenceTargetRow,
  toOccurrence,
} from './supabase-occurrences-mapper';

const OCCURRENCES_SELECT = `
  id,
  planned_date,
  cycle,
  kind,
  position_in_day,
  workout_id,
  cardio_program_id,
  workout:workouts(name),
  cardio_program:cardio_programs(name, duration_seconds),
  periodization:periodizations!inner(id, athlete_id, status)
` as const;

export function makeSupabasePeriodizationOccurrenceRepository(
  supabase: Supabase,
): PeriodizationOccurrenceRepository {
  return {
    async listOccurrences({ athleteId, date, status }) {
      const { data, error } = await supabase
        .from('periodization_occurrences')
        .select(OCCURRENCES_SELECT)
        .eq('planned_date', date)
        .eq('status', status)
        .eq('day_type', 'training')
        .eq('periodization.athlete_id', athleteId)
        .eq('periodization.status', 'active')
        .order('position_in_day', { ascending: true });

      if (error) {
        throw supabaseError('Failed to list periodization occurrences', error);
      }

      const rows = (data ?? []) as unknown as OccurrenceRow[];
      return rows.map(toOccurrence);
    },

    async getOccurrenceTarget({ occurrenceId, athleteId }) {
      const { data, error } = await supabase
        .from('periodization_occurrences')
        .select(
          `
          id,
          periodization_id,
          cycle,
          position_in_day,
          workout_id,
          workout:workouts!inner(user_id),
          periodization:periodizations!inner(athlete_id)
        `,
        )
        .eq('id', occurrenceId)
        .eq('kind', 'workout')
        .eq('periodization.athlete_id', athleteId)
        .maybeSingle();

      if (error) {
        throw supabaseError('Failed to get periodization occurrence', error);
      }
      if (!data) return null;

      const row = data as unknown as OccurrenceTargetRow;
      if (!row.workout_id || !row.workout) return null;

      return {
        occurrenceId: row.id,
        periodizationId: row.periodization_id,
        cycle: row.cycle,
        workoutId: row.workout_id,
        positionInDay: row.position_in_day,
        workoutOwnerId: row.workout.user_id,
      };
    },
  };
}
