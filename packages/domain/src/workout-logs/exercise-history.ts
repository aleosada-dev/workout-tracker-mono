import type { WorkoutSetType } from '../set/sets';

export type ExerciseHistorySessionSet = {
  setOrder: number;
  setType: WorkoutSetType;
  weightKg: number | null;
  reps: number | null;
  repsMin: number | null;
  repsMax: number | null;
};

export type ExerciseHistorySession = {
  workoutLogId: string;
  startedAt: string;
  maxWeightKg: number | null;
  totalVolumeKg: number;
  maxReps: number | null;
  totalSets: number;
  sets: ExerciseHistorySessionSet[];
};

export type ExerciseHistoryRecords = {
  maxWeightKg: number | null;
  maxVolumeKg: number | null;
  maxReps: number | null;
  maxSets: number | null;
};

export type ExerciseHistoryVariation = {
  exerciseName: string;
  variationName: string | null;
  equipmentSlug: string;
  equipmentPreposition: string;
  muscleSlug: string;
  secondaryMuscleSlug: string | null;
  youtubeUrl: string | null;
  uploadedVideoObjectKey: string | null;
};

export type ExerciseHistory = {
  variationId: string;
  variation: ExerciseHistoryVariation;
  sessions: ExerciseHistorySession[];
  lastSession: ExerciseHistorySession | null;
  records: ExerciseHistoryRecords;
};

export type GetExerciseHistoryFilter = {
  userId: string;
  variationId: string;
};
