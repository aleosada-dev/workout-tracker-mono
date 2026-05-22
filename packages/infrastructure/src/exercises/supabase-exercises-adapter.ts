import {
  ConflictError,
  type CreateExerciseInput,
  type ExerciseListItem,
  type ExerciseRepository,
  type ListExercisesFilter,
  NotFoundError,
  type UpdateExerciseInput,
} from '@workout-tracker/domain';
import type { BuildUploadedVideoUrl } from '../r2';
import type { Supabase } from '../supabase/client';
import {
  type GetExerciseDetailRpcResponse,
  toExerciseDetail,
} from './supabase-exercises-detail-mappers';
import { type ExerciseForEditRow, toExerciseForEdit } from './supabase-exercises-edit-mappers';
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
      const { data, error } = await supabase.rpc('wt_list_exercises_summaries', {
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
      const { data, error } = await supabase.rpc('wt_get_exercise_history', {
        p_user_id: userId,
        p_variation_id: variationId,
      });

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

    async getExerciseForEdit({ userId, variationId }) {
      // Plain query (no RPC): the form needs the variation's ids and the video
      // metadata, composed straight from the tables. `.eq('user_id', userId)` is
      // the ownership guard — a library variation (user_id NULL) or another
      // user's variation simply does not match and surfaces as a 404.
      const { data, error } = await supabase
        .from('variations')
        .select(
          `id, name, muscle_id, secondary_muscle_id, equipment_id, video_url, user_id,
           exercise:exercises!inner(name, exercise_type),
           equipment:equipments!inner(slug, preposition),
           video:variation_videos(object_key, thumbnail_key, duration_seconds, size_bytes, content_type, processing_status)`,
        )
        .eq('id', variationId)
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        throw new Error(`Failed to get exercise for edit: ${error.message}`);
      }
      if (!data) {
        throw new NotFoundError('variation');
      }

      return toExerciseForEdit(data as unknown as ExerciseForEditRow, deps.buildUploadedVideoUrl);
    },

    async createExercise(input: CreateExerciseInput): Promise<{ id: string }> {
      const { error } = await supabase.rpc('wt_create_user_exercise', {
        p_variation_id: input.variationId,
        p_exercise_name: input.exerciseName,
        p_exercise_type: input.exerciseType,
        // @ts-expect-error
        p_variation_name: input.variationName,
        p_muscle_id: input.muscleId,
        p_equipment_id: input.equipmentId,
        // @ts-expect-error
        p_secondary_muscle_id: input.secondaryMuscleId,
        // @ts-expect-error
        p_youtube_video_url: input.youtubeVideoUrl,
        p_video_object_key: input.video?.objectKey,
        p_video_thumbnail_key: input.video?.thumbnailKey,
        p_video_duration_secs: input.video?.durationSeconds,
        p_video_size_bytes: input.video?.sizeBytes,
        p_video_content_type: input.video?.contentType,
      });

      if (error) {
        if (error.code === '23505') {
          throw new ConflictError('exercise variation already exists');
        }
        throw new Error(`Failed to create exercise: ${error.message}`);
      }

      return { id: input.variationId };
    },

    async updateExercise(input: UpdateExerciseInput): Promise<{ id: string }> {
      const { error } = await supabase.rpc('wt_update_user_exercise', {
        p_variation_id: input.variationId,
        p_exercise_name: input.exerciseName,
        p_exercise_type: input.exerciseType,
        // @ts-expect-error
        p_variation_name: input.variationName,
        p_muscle_id: input.muscleId,
        p_equipment_id: input.equipmentId,
        // @ts-expect-error
        p_secondary_muscle_id: input.secondaryMuscleId,
        // @ts-expect-error
        p_youtube_video_url: input.youtubeVideoUrl,
        p_video_object_key: input.video?.objectKey,
        p_video_thumbnail_key: input.video?.thumbnailKey,
        p_video_duration_secs: input.video?.durationSeconds,
        p_video_size_bytes: input.video?.sizeBytes,
        p_video_content_type: input.video?.contentType,
      });

      if (error) {
        if (error.code === '23505') {
          throw new ConflictError('exercise variation already exists');
        }
        if (error.code === 'P0002') {
          throw new NotFoundError('variation');
        }
        throw new Error(`Failed to update exercise: ${error.message}`);
      }

      return { id: input.variationId };
    },
  };
}
