import {
  ConflictError,
  type CreateExerciseInput,
  type ExerciseListItem,
  type ExerciseRepository,
  type ListExerciseName,
  type ListExerciseNamesFilter,
  type ListExercisesFilter,
  NotFoundError,
  type UpdateExerciseInput,
} from '@workout-tracker/domain';
import type { BuildUploadedVideoUrl } from '../r2';
import type { Supabase } from '../supabase/client';
import { supabaseError } from '../supabase/supabase-error';
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
    async listNames(_filter: ListExerciseNamesFilter): Promise<ListExerciseName[]> {
      // RLS em variations_view (security_invoker) já limita as linhas ao que o
      // usuário pode ver — biblioteca pública + suas variações + compartilhadas.
      // A view não filtra soft-deletes (preserva histórico), por isso o IS NULL
      // explícito em deleted_at. Como cada exercício tem N variações, deduplica
      // por exercise_id no mapper.
      const { data, error } = await supabase
        .from('variations_view')
        .select('exercise_id, exercise_name, exercise_slug')
        .is('deleted_at', null);

      if (error) {
        throw supabaseError('Failed to list exercise names', error);
      }

      // exercise_id / exercise_name vêm de colunas NOT NULL com INNER JOIN, mas o
      // generator de tipos do Supabase marca toda coluna de view como nullable.
      const byId = new Map<string, ListExerciseName>();
      for (const row of data ?? []) {
        if (row.exercise_id === null || row.exercise_name === null) continue;
        if (!byId.has(row.exercise_id)) {
          byId.set(row.exercise_id, {
            id: row.exercise_id,
            name: row.exercise_name,
            slug: row.exercise_slug,
          });
        }
      }
      return Array.from(byId.values());
    },

    async list(filter: ListExercisesFilter): Promise<ExerciseListItem[]> {
      const { data, error } = await supabase.rpc('wt_list_exercises_summaries', {
        p_user_id: filter.userId,
        p_muscle_ids: filter.muscleIds ?? [],
        p_equipment_ids: filter.equipmentIds ?? [],
        p_visibility: filter.visibility,
        p_exercise_types: filter.exerciseTypes ?? [],
      });

      if (error) {
        throw supabaseError('Failed to list exercises', error);
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
        throw supabaseError('Failed to get exercise history', error);
      }

      return toExerciseDetail(
        data as unknown as GetExerciseDetailRpcResponse,
        deps.buildUploadedVideoUrl,
      );
    },

    async getExerciseRecords({ userId, variationIds }) {
      const { data, error } = await supabase
        .from('workout_variation_records')
        .select('variation_id, max_weight_kg, max_volume_kg, max_reps, max_sets')
        .eq('user_id', userId)
        .in('variation_id', variationIds);

      if (error) {
        throw supabaseError('Failed to get variation records', error);
      }

      return (data ?? []).map((row) => ({
        variationId: row.variation_id,
        maxWeightKg: row.max_weight_kg,
        maxVolumeKg: row.max_volume_kg,
        maxReps: row.max_reps,
        maxSets: row.max_sets,
      }));
    },

    async getExerciseForEdit({ userId, variationId }) {
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
        .is('deleted_at', null)
        .maybeSingle();

      if (error) {
        throw supabaseError('Failed to get exercise for edit', error);
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
        throw supabaseError('Failed to create exercise', error);
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
        throw supabaseError('Failed to update exercise', error);
      }

      return { id: input.variationId };
    },

    async deleteExercises({ variationIds }) {
      const { data, error } = await supabase.rpc('wt_delete_user_exercises', {
        p_variation_ids: variationIds,
      });

      if (error) {
        throw supabaseError('Failed to delete exercises', error);
      }

      return { deletedCount: data ?? 0 };
    },

    async copyExercises({ variationIds }) {
      const { data, error } = await supabase.rpc('wt_copy_user_exercises', {
        p_source_variation_ids: variationIds,
      });

      if (error) {
        throw supabaseError('Failed to copy exercises', error);
      }

      return { copiedCount: data ?? 0 };
    },
  };
}
