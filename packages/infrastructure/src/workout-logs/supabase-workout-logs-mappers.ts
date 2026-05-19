import type {
  ExerciseHistory,
  ExerciseHistorySession,
  ExerciseHistorySessionSet,
  WorkoutSetType,
} from '@workout-tracker/domain';

export type GetExerciseHistoryRpcResponseSet = {
  set_order: number;
  set_type: string;
  weight_kg: number | null;
  reps: number | null;
  reps_min: number | null;
  reps_max: number | null;
};

export type GetExerciseHistoryRpcResponseSession = {
  workout_log_id: string;
  started_at: string;
  max_weight_kg: number | null;
  total_volume_kg: number;
  max_reps: number | null;
  total_sets: number;
  sets: GetExerciseHistoryRpcResponseSet[];
};

export type GetExerciseHistoryRpcResponseRecords = {
  max_weight_kg: number | null;
  max_volume_kg: number | null;
  max_reps: number | null;
  max_sets: number | null;
};

export type GetExerciseHistoryRpcResponseVariation = {
  exercise_name: string;
  variation_name: string | null;
  equipment_slug: string;
  equipment_preposition: string;
  muscle_slug: string;
  secondary_muscle_slug: string | null;
  youtube_url: string | null;
  uploaded_video_object_key: string | null;
};

export type GetExerciseHistoryRpcResponse = {
  variation_id: string;
  variation: GetExerciseHistoryRpcResponseVariation;
  sessions: GetExerciseHistoryRpcResponseSession[];
  last_session: GetExerciseHistoryRpcResponseSession | null;
  records: GetExerciseHistoryRpcResponseRecords;
};

const toSet = (raw: GetExerciseHistoryRpcResponseSet): ExerciseHistorySessionSet => ({
  setOrder: raw.set_order,
  setType: raw.set_type as WorkoutSetType,
  weightKg: raw.weight_kg,
  reps: raw.reps,
  repsMin: raw.reps_min,
  repsMax: raw.reps_max,
});

const toSession = (raw: GetExerciseHistoryRpcResponseSession): ExerciseHistorySession => ({
  workoutLogId: raw.workout_log_id,
  startedAt: raw.started_at,
  maxWeightKg: raw.max_weight_kg,
  totalVolumeKg: raw.total_volume_kg,
  maxReps: raw.max_reps,
  totalSets: raw.total_sets,
  sets: raw.sets.map(toSet),
});

export const toExerciseHistory = (raw: GetExerciseHistoryRpcResponse): ExerciseHistory => ({
  variationId: raw.variation_id,
  variation: {
    exerciseName: raw.variation.exercise_name,
    variationName: raw.variation.variation_name,
    equipmentSlug: raw.variation.equipment_slug,
    equipmentPreposition: raw.variation.equipment_preposition,
    muscleSlug: raw.variation.muscle_slug,
    secondaryMuscleSlug: raw.variation.secondary_muscle_slug,
    youtubeUrl: raw.variation.youtube_url,
    uploadedVideoObjectKey: raw.variation.uploaded_video_object_key,
  },
  sessions: raw.sessions.map(toSession),
  lastSession: raw.last_session ? toSession(raw.last_session) : null,
  records: {
    maxWeightKg: raw.records.max_weight_kg,
    maxVolumeKg: raw.records.max_volume_kg,
    maxReps: raw.records.max_reps,
    maxSets: raw.records.max_sets,
  },
});
