import type { WorkoutSetType } from '../set/sets';

export type ExerciseDetailSessionSet = {
  setOrder: number;
  setType: WorkoutSetType;
  weightKg: number | null;
  reps: number | null;
  repsMin: number | null;
  repsMax: number | null;
};

export type ExerciseDetailSession = {
  workoutLogId: string;
  startedAt: string;
  maxWeightKg: number | null;
  totalVolumeKg: number;
  maxReps: number | null;
  totalSets: number;
  sets: ExerciseDetailSessionSet[];
};

export type ExerciseDetailRecords = {
  maxWeightKg: number | null;
  maxVolumeKg: number | null;
  maxReps: number | null;
  maxSets: number | null;
};

export type ExerciseDetailVariation = {
  exerciseName: string;
  exerciseSlug: string | null;
  variationName: string | null;
  variationSlug: string | null;
  equipmentSlug: string;
  equipmentPreposition: string;
  muscleSlug: string;
  secondaryMuscleSlug: string | null;
  youtubeUrl: string | null;
  videoUrl: string | null;
  /** Owner of the variation; `null` for the public library. Drives editability. */
  userId: string | null;
  /** Soft-delete timestamp; `null` while active, set once the user deletes it. */
  deletedAt: string | null;
};

export type ExerciseDetail = {
  variationId: string;
  variation: ExerciseDetailVariation;
  sessions: ExerciseDetailSession[];
  lastSession: ExerciseDetailSession | null;
  records: ExerciseDetailRecords;
};

export type GetExerciseDetailFilter = {
  userId: string;
  variationId: string;
};
