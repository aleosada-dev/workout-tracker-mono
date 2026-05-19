import { NotFoundError, type WorkoutLogRepository } from '@workout-tracker/domain';
import type { Supabase } from '../supabase/client';
import {
  type GetExerciseHistoryRpcResponse,
  toExerciseHistory,
} from './supabase-workout-logs-mappers';
import { type SummaryRow, toWorkoutLogSummary } from './supabase-workout-logs-summary-mapper';

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
    async getExerciseHistory({ userId, variationId }) {
      const { data, error } = await supabase.rpc(
        // @ts-expect-error get_exercise_history is added by the migration; regenerate types.ts after applying it
        'get_exercise_history',
        { p_user_id: userId, p_variation_id: variationId },
      );

      if (error) {
        if (error.code === 'P0002') {
          throw new NotFoundError('variation');
        }
        throw new Error(`Failed to get exercise history: ${error.message}`);
      }

      return toExerciseHistory(data as unknown as GetExerciseHistoryRpcResponse);
    },

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
        throw new Error(`Failed to list workout log summaries: ${error.message}`);
      }

      const rows = (data ?? []) as unknown as SummaryRow[];
      const hasMore = rows.length > limit;
      const pageRows = hasMore ? rows.slice(0, limit) : rows;

      return {
        items: pageRows.map(toWorkoutLogSummary),
        hasMore,
      };
    },
  };
}
