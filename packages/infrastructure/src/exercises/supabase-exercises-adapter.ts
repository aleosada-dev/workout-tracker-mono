import type {
  ExerciseListItem,
  ExerciseRepository,
  ListExercisesFilter,
} from '@workout-tracker/domain';
import type { Supabase } from '../supabase/client';
import toExerciseListItems, { type ListExerciseItemRpcRow } from './supabase-exercises-mapper';

export function makeSupabaseExerciseRepository(supabase: Supabase): ExerciseRepository {
  return {
    async list(filter: ListExercisesFilter): Promise<ExerciseListItem[]> {
      const { data, error } = await supabase.rpc('list_variation_views_for_mobile', {
        p_user_id: filter.userId,
        p_muscle_ids: filter.muscleIds ?? [],
        p_equipment_ids: filter.equipmentIds ?? [],
        p_visibility: filter.visibility,
        p_exercise_types: filter.exerciseTypes ?? [],
      });

      if (error) {
        throw new Error(`Failed to list exercises: ${error.message}`);
      }

      const rows = (data ?? []) as unknown as ListExerciseItemRpcRow[];
      return toExerciseListItems(rows);
    },
  };
}
