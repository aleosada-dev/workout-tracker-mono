import type { WorkoutFolderRepository } from '@workout-tracker/domain';
import type { Supabase } from '../supabase/client';
import { supabaseError } from '../supabase/supabase-error';

type WorkoutFolderWithCountRow = {
  id: string;
  user_id: string;
  name: string;
  color: string;
  created_at: string;
  updated_at: string;
  workouts?: { count: number }[] | null;
};

export function makeSupabaseWorkoutRepository(supabase: Supabase): WorkoutFolderRepository {
  return {
    async listFolders({ userId }) {
      const { data, error } = await supabase
        .from('workout_folders')
        .select('id, user_id, name, color, created_at, updated_at, workouts(count)')
        .eq('user_id', userId)
        .is('workouts.archived_at', null)
        .order('created_at', { ascending: true });

      if (error) {
        throw supabaseError('Failed to list workout folders', error);
      }

      const rows = (data ?? []) as WorkoutFolderWithCountRow[];

      return rows.map((row) => ({
        id: row.id,
        userId: row.user_id,
        name: row.name,
        color: row.color,
        workoutCount: row.workouts?.[0]?.count ?? 0,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
      }));
    },
  };
}
