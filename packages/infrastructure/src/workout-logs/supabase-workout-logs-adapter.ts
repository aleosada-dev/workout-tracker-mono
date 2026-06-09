import {
  ForbiddenError,
  NotFoundError,
  ValidationError,
  type WorkoutLogRepository,
} from '@workout-tracker/domain';
import type { Supabase } from '../supabase/client';
import { supabaseError } from '../supabase/supabase-error';
import { toWorkoutLogCreatePayload } from './supabase-workout-logs-create-mapper';
import { type DetailRow, toWorkoutLogDetail } from './supabase-workout-logs-detail-mapper';
import { type LastLogRow, toWorkoutLogLast } from './supabase-workout-logs-last-mapper';
import { type SummaryRow, toWorkoutLogSummary } from './supabase-workout-logs-summary-mapper';

const LAST_SELECT = `
  id,
  workout_id,
  started_at,
  finished_at,
  workout_exercise_logs(
    variation_id,
    exercise_type,
    position,
    superset_group_id,
    exercise_name,
    variation_name,
    variation:variations_view(name, exercise_name),
    workout_exercise_set_logs(set_order, set_type, weight_kg, reps)
  )
` as const;

const DETAIL_SELECT = `
  id,
  user_id,
  started_at,
  finished_at,
  note,
  workout:workouts(name),
  workout_log_summaries(summary_snapshot),
  workout_exercise_logs(
    variation_id,
    exercise_type,
    position,
    superset_group_id,
    note,
    rest_seconds,
    exercise_name,
    variation_name,
    variation:variations_view(name, exercise_name),
    workout_exercise_set_logs(
      set_order,
      round_order,
      set_type,
      measurement_type,
      weight_kg,
      reps,
      reps_min,
      reps_max,
      duration_seconds,
      distance_meters
    )
  )
` as const;

const SUMMARIES_SELECT = `
  id,
  started_at,
  finished_at,
  workout:workouts(name),
  workout_exercise_logs(
    id,
    exercise_type,
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

    async getById({ userId, workoutLogId }) {
      const { data, error } = await supabase
        .from('workout_logs')
        .select(DETAIL_SELECT)
        .eq('id', workoutLogId)
        .eq('user_id', userId)
        .is('deleted_at', null)
        .maybeSingle();

      if (error) {
        throw supabaseError('Failed to get workout log', error);
      }

      const row = data as unknown as DetailRow | null;
      return row ? toWorkoutLogDetail(row) : null;
    },

    async create(input) {
      const { data, error } = await supabase.rpc('wt_insert_workout_log', {
        payload: toWorkoutLogCreatePayload(input),
      });

      if (error) {
        if (error.code === '42501') {
          throw new ForbiddenError('not authorized to create a workout log for this athlete');
        }
        if (error.code === 'P0002') {
          throw new NotFoundError('variation');
        }
        if (error.code === '22023') {
          throw new ValidationError([{ code: 'validation.invalid' }]);
        }
        throw supabaseError('Failed to create workout log', error);
      }

      const result = data as {
        workoutLogId: string;
        coachSessionId: string | null;
        coachId: string | null;
      };

      return {
        workoutLogId: result.workoutLogId,
        coachSessionId: result.coachSessionId ?? null,
        coachId: result.coachId ?? null,
      };
    },

    async softDelete({ workoutLogId }) {
      const { error } = await supabase.rpc('wt_delete_workout_log', {
        p_workout_log_id: workoutLogId,
      });

      if (error) {
        if (error.code === '42501') {
          throw new ForbiddenError('not authorized to delete this workout log');
        }
        if (error.code === 'P0002') {
          throw new NotFoundError('workout log');
        }
        throw supabaseError('Failed to delete workout log', error);
      }
    },
  };
}
