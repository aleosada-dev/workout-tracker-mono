import {
  ConflictError,
  type CreateExerciseInput,
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

    async createExercise(input: CreateExerciseInput): Promise<{ id: string }> {
      const { data, error } = await supabase.rpc('upsert_exercise_variation', {
        p_user_id: input.userId,
        // @ts-expect-error NULL creates a new exercise; the generated types require a string.
        p_exercise_id: null,
        p_name: input.exerciseName,
        // @ts-expect-error NULL creates a new variation; the generated types require a string.
        p_variation_id: null,
        // @ts-expect-error A variation may have no name; the generated types require a string.
        p_variation_name: input.variationName,
        p_muscle_id: input.muscleId,
        p_equipment_id: input.equipmentId,
        p_video_url: input.youtubeVideoUrl ?? '',
        p_image_url: '',
        p_new_variation: true,
        p_secondary_muscle_id: input.secondaryMuscleId ?? undefined,
        p_exercise_type: input.exerciseType,
      });

      if (error) {
        if (error.message.startsWith('BUSINESS:')) {
          throw new ConflictError(error.message.replace(/^BUSINESS:\s*/, ''));
        }
        throw new Error(`Failed to create exercise: ${error.message}`);
      }

      return { id: (data as unknown as { id: string }).id };
    },
  };
}
