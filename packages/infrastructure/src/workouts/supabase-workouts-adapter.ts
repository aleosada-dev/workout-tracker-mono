import { ForbiddenError, NotFoundError, type WorkoutRepository } from '@workout-tracker/domain';
import type { Supabase } from '../supabase/client';
import { supabaseError } from '../supabase/supabase-error';
import {
  toWorkout,
  toWorkoutDetail,
  type WorkoutDetailRow,
  type WorkoutListRow,
} from './supabase-workouts-mapper';

const LIST_SELECT = `
  id, user_id, name, folder_id, created_at, updated_at,
  folder:workout_folders ( name ),
  workout_exercises (
    position,
    variation:variations (
      slug,
      name,
      exercise:exercises ( slug, name ),
      equipment:equipments ( slug, preposition ),
      muscle:muscles!muscle_id ( slug, level, parent:muscles!parent_id ( slug, level ) )
    )
  ),
  workout_logs ( started_at, deleted_at )
`;

export function makeSupabaseWorkoutRepository(supabase: Supabase): WorkoutRepository {
  return {
    async listWorkouts({ userId, folderId }) {
      let query = supabase
        .from('workouts')
        .select(LIST_SELECT)
        .eq('user_id', userId)
        .eq('workout_exercises.exercise_type', 'strength')
        .is('archived_at', null)
        .order('name', { ascending: true });

      if (folderId === null) {
        query = query.is('folder_id', null);
      } else if (typeof folderId === 'string') {
        query = query.eq('folder_id', folderId);
      }

      const { data, error } = await query;
      if (error) {
        throw supabaseError('Failed to list workouts', error);
      }

      const rows = (data ?? []) as unknown as WorkoutListRow[];
      return rows.map(toWorkout);
    },

    async getWorkout({ userId, workoutId }) {
      const { data, error } = await supabase
        .from('workouts')
        .select(
          `
          id, user_id, name, description, folder_id, created_at, updated_at,
          workout_exercises (
            id, position, superset_group_id, superset_order, note, rest_seconds, exercise_type,
            variation:variations (
              id, slug, name, measurement_type,
              exercise:exercises ( slug, name, exercise_type ),
              equipment:equipments ( slug, preposition ),
              muscle:muscles!muscle_id ( slug ),
              secondary_muscle:muscles!secondary_muscle_id ( slug )
            ),
            workout_sets (
              id, set_order, set_type, reps_min, reps_max, duration_seconds, distance_meters, linked_set_id, load_percent_of_previous, round_order
            )
          )
        `,
        )
        .eq('id', workoutId)
        .eq('user_id', userId)
        .is('archived_at', null)
        .maybeSingle();

      if (error) {
        throw supabaseError('Failed to get workout', error);
      }
      if (!data) {
        return null;
      }

      const row = data as unknown as WorkoutDetailRow;
      return toWorkoutDetail(row);
    },

    async deleteWorkouts({ userId, workoutIds }) {
      if (workoutIds.length === 0) {
        return { deletedIds: [] };
      }

      const { data, error } = await supabase
        .from('workouts')
        .update({ archived_at: new Date().toISOString() })
        .in('id', workoutIds)
        .eq('user_id', userId)
        .is('archived_at', null)
        .select('id');

      if (error) {
        throw supabaseError('Failed to delete workouts', error);
      }

      return { deletedIds: (data ?? []).map((row) => row.id) };
    },

    async moveWorkouts({ userId, workoutIds, targetFolderId }) {
      if (workoutIds.length === 0) {
        return { movedIds: [] };
      }

      const { data, error } = await supabase
        .from('workouts')
        .update({ folder_id: targetFolderId })
        .in('id', workoutIds)
        .eq('user_id', userId)
        .is('archived_at', null)
        .select('id');

      if (error) {
        throw supabaseError('Failed to move workouts', error);
      }

      return { movedIds: (data ?? []).map((row) => row.id) };
    },

    async copyWorkouts({ workoutIds, targetUserId, targetFolderId }) {
      if (workoutIds.length === 0) {
        return { newWorkoutIds: [] };
      }

      const { data, error } = await supabase.rpc('wt_copy_workouts', {
        p_source_workout_ids: workoutIds,
        p_target_user_id: targetUserId,
        p_target_folder_id: targetFolderId ?? undefined,
      });

      if (error) {
        if (error.code === '42501') {
          throw new ForbiddenError('not authorized to copy workouts for this athlete');
        }
        if (error.code === 'P0002') {
          throw new NotFoundError('source workout or target folder');
        }
        throw supabaseError('Failed to copy workouts', error);
      }

      return { newWorkoutIds: (data as string[] | null) ?? [] };
    },
  };
}
