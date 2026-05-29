import type { WorkoutLogRepository } from '@workout-tracker/domain';
import type { Supabase } from '../supabase/client';
import { supabaseError } from '../supabase/supabase-error';
import { type LastLogRow, toWorkoutLogLast } from './supabase-workout-logs-last-mapper';
import { type SummaryRow, toWorkoutLogSummary } from './supabase-workout-logs-summary-mapper';

const LAST_SELECT = `
  id,
  workout_id,
  started_at,
  finished_at,
  workout_exercise_logs(
    variation_id,
    position,
    superset_group_id,
    exercise_name,
    variation_name,
    variation:variations_view(name, exercise_name),
    workout_exercise_set_logs(set_order, set_type, weight_kg, reps)
  )
` as const;

const SUMMARIES_SELECT = `
  id,
  started_at,
  finished_at,
  workout:workouts(name),
  workout_exercise_logs(
    id,
    variation:variations_view(muscle_slug, muscle_level2_slug)
  ),
  workout_log_summaries(summary_snapshot)
` as const;

export function makeSupabaseWorkoutLogRepository(supabase: Supabase): WorkoutLogRepository {
  return {
    async listSummaries({ userId, limit, cursor }) {
      let query = supabase
        .from('workout_logs')
        .select(SUMMARIES_SELECT)
        .eq('user_id', userId)
        .is('deleted_at', null)
        .order('started_at', { ascending: false })
        .limit(limit + 1);

      if (cursor) {
        query = query.lt('started_at', cursor);
      }

      const { data, error } = await query;

      if (error) {
        throw supabaseError('Failed to list workout log summaries', error);
      }

      const rows = (data ?? []) as unknown as SummaryRow[];
      const hasMore = rows.length > limit;
      const pageRows = hasMore ? rows.slice(0, limit) : rows;

      return {
        items: pageRows.map(toWorkoutLogSummary),
        hasMore,
      };
    },

    async getLast({ workoutId }) {
      const { data: workout, error: workoutError } = await supabase
        .from('workouts')
        .select('id')
        .eq('id', workoutId)
        .is('archived_at', null)
        .maybeSingle();

      if (workoutError) {
        throw supabaseError('Failed to check workout for last log', workoutError);
      }
      if (!workout) {
        return { workoutFound: false };
      }

      const { data, error } = await supabase
        .from('workout_logs')
        .select(LAST_SELECT)
        .eq('workout_id', workoutId)
        .is('deleted_at', null)
        .order('finished_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        throw supabaseError('Failed to get last workout log', error);
      }

      const row = data as unknown as LastLogRow | null;
      return {
        workoutFound: true,
        log: row ? toWorkoutLogLast(row) : null,
      };
    },
  };
}
