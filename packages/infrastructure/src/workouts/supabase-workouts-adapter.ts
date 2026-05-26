import type { WorkoutRepository } from '@workout-tracker/domain';
import type { Supabase } from '../supabase/client';
import { supabaseError } from '../supabase/supabase-error';
import { toWorkout, type WorkoutListRow } from './supabase-workouts-mapper';

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
  };
}
