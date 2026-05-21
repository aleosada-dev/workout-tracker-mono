import type {
  ExerciseDetail,
  ExerciseDetailSession,
  ExerciseDetailSessionSet,
  WorkoutSetType,
} from '@workout-tracker/domain';
import type { BuildUploadedVideoUrl } from '../r2';

export type GetExerciseDetailRpcResponseSet = {
  set_order: number;
  set_type: string;
  weight_kg: number | null;
  reps: number | null;
  reps_min: number | null;
  reps_max: number | null;
};

export type GetExerciseDetailRpcResponseSession = {
  workout_log_id: string;
  started_at: string;
  max_weight_kg: number | null;
  total_volume_kg: number;
  max_reps: number | null;
  total_sets: number;
  sets: GetExerciseDetailRpcResponseSet[];
};

export type GetExerciseDetailRpcResponseRecords = {
  max_weight_kg: number | null;
  max_volume_kg: number | null;
  max_reps: number | null;
  max_sets: number | null;
};

export type GetExerciseDetailRpcResponseVariation = {
  exercise_name: string;
  exercise_slug: string | null;
  variation_name: string | null;
  variation_slug: string | null;
  equipment_slug: string;
  equipment_preposition: string;
  muscle_slug: string;
  secondary_muscle_slug: string | null;
  youtube_url: string | null;
  uploaded_video_object_key: string | null;
};

export type GetExerciseDetailRpcResponse = {
  variation_id: string;
  variation: GetExerciseDetailRpcResponseVariation;
  sessions: GetExerciseDetailRpcResponseSession[];
  last_session: GetExerciseDetailRpcResponseSession | null;
  records: GetExerciseDetailRpcResponseRecords;
};

const toSet = (raw: GetExerciseDetailRpcResponseSet): ExerciseDetailSessionSet => ({
  setOrder: raw.set_order,
  setType: raw.set_type as WorkoutSetType,
  weightKg: raw.weight_kg,
  reps: raw.reps,
  repsMin: raw.reps_min,
  repsMax: raw.reps_max,
});

const toSession = (raw: GetExerciseDetailRpcResponseSession): ExerciseDetailSession => ({
  workoutLogId: raw.workout_log_id,
  startedAt: raw.started_at,
  maxWeightKg: raw.max_weight_kg,
  totalVolumeKg: raw.total_volume_kg,
  maxReps: raw.max_reps,
  totalSets: raw.total_sets,
  sets: raw.sets.map(toSet),
});

export const toExerciseDetail = async (
  raw: GetExerciseDetailRpcResponse,
  buildUploadedVideoUrl: BuildUploadedVideoUrl,
): Promise<ExerciseDetail> => {
  const objectKey = raw.variation.uploaded_video_object_key;
  const videoUrl = objectKey ? await buildUploadedVideoUrl({ objectKey }) : null;

  return {
    variationId: raw.variation_id,
    variation: {
      exerciseName: raw.variation.exercise_name,
      exerciseSlug: raw.variation.exercise_slug,
      variationName: raw.variation.variation_name,
      variationSlug: raw.variation.variation_slug,
      equipmentSlug: raw.variation.equipment_slug,
      equipmentPreposition: raw.variation.equipment_preposition,
      muscleSlug: raw.variation.muscle_slug,
      secondaryMuscleSlug: raw.variation.secondary_muscle_slug,
      youtubeUrl: raw.variation.youtube_url,
      videoUrl,
    },
    sessions: raw.sessions.map(toSession),
    lastSession: raw.last_session ? toSession(raw.last_session) : null,
    records: {
      maxWeightKg: raw.records.max_weight_kg,
      maxVolumeKg: raw.records.max_volume_kg,
      maxReps: raw.records.max_reps,
      maxSets: raw.records.max_sets,
    },
  };
};
