import { ConflictError, type WorkoutFolderRepository } from '@workout-tracker/domain';
import type { Supabase } from '../supabase/client';
import { supabaseError } from '../supabase/supabase-error';
import {
  toWorkoutFolder,
  toWorkoutFolderWithCount,
  type WorkoutFolderRow,
  type WorkoutFolderWithCountRow,
} from './supabase-workout-folders-mapper';

export function makeSupabaseWorkoutFolderRepository(supabase: Supabase): WorkoutFolderRepository {
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
      return rows.map(toWorkoutFolderWithCount);
    },

    async createFolder({ userId, name, color }) {
      const { data, error } = await supabase
        .from('workout_folders')
        .insert({ user_id: userId, name, color })
        .select('id, user_id, name, color, created_at, updated_at')
        .single();

      if (error) {
        if (error.code === '23505') {
          throw new ConflictError('workout folder already exists');
        }
        throw supabaseError('Failed to create workout folder', error);
      }

      return toWorkoutFolder(data as WorkoutFolderRow, 0);
    },

    async deleteFolder(input) {
      const { error } = await supabase.rpc('wt_delete_workout_folder', {
        p_folder_id: input.folderId,
        p_mode: input.mode,
        p_target_folder_id:
          input.mode === 'move-workouts' ? (input.targetFolderId ?? undefined) : undefined,
      });

      if (error) {
        if (error.code === 'P0002') {
          return { deleted: false };
        }
        throw supabaseError('Failed to delete workout folder', error);
      }

      return { deleted: true };
    },
  };
}
