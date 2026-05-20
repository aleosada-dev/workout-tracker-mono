import {
  type ExerciseListItem,
  type ExerciseRepository,
  type ListExercisesFilter,
  NotFoundError,
} from '@workout-tracker/domain';
import type { BuildUploadedVideoUrl } from '../r2';
import type { Supabase } from '../supabase/client';
import {
  type GetExerciseDetailRpcResponse,
  toExerciseDetail,
} from './supabase-exercises-detail-mappers';
import toExerciseListItems, {
  type ListExerciseItemRpcRow,
} from './supabase-exercises-list-mappers';

export type SupabaseExerciseRepositoryDeps = {
  /** Turns an uploaded video's R2 object key into a playable URL. */
  buildUploadedVideoUrl: BuildUploadedVideoUrl;
};

export function makeSupabaseExerciseRepository(
  supabase: Supabase,
  deps: SupabaseExerciseRepositoryDeps,
): ExerciseRepository {
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

    async getExerciseDetail({ userId, variationId }) {
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

      return toExerciseDetail(
        data as unknown as GetExerciseDetailRpcResponse,
        deps.buildUploadedVideoUrl,
      );
    },
  };
}
