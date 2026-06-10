import type { WorkoutSetType } from '../set/sets';
import type { ExerciseMeasurementType } from './models';

export type ExerciseDetailSessionSet = {
  setOrder: number;
  setType: WorkoutSetType;
  weightKg: number | null;
  reps: number | null;
  repsMin: number | null;
  repsMax: number | null;
  durationSeconds: number | null;
  distanceMeters: number | null;
};

export type ExerciseDetailSession = {
  workoutLogId: string;
  startedAt: string;
  maxWeightKg: number | null;
  totalVolumeKg: number;
  maxReps: number | null;
  totalReps: number | null;
  totalSets: number;
  maxDurationSeconds: number | null;
  maxDistanceMeters: number | null;
  totalDurationSeconds: number | null;
  totalDistanceMeters: number | null;
  sets: ExerciseDetailSessionSet[];
};

export type ExerciseDetailRecords = {
  maxWeightKg: number | null;
  maxVolumeKg: number | null;
  maxReps: number | null;
  maxSets: number | null;
  maxDurationSeconds: number | null;
  maxDistanceMeters: number | null;
  maxTotalDurationSeconds: number | null;
  maxTotalDistanceMeters: number | null;
  maxTotalReps: number | null;
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
  /** How the variation is measured (weight_reps, reps, duration, distance). */
  measurementType: ExerciseMeasurementType;
  youtubeUrl: string | null;
  videoUrl: string | null;
  /** Owner of the variation; `null` for the public library. Drives editability. */
  userId: string | null;
  /** Soft-delete timestamp; `null` while active, set once the user deletes it. */
  deletedAt: string | null;
  /** Id of the user who archived the variation; `null` while active. */
  deletedBy: string | null;
  /** Full name of the deleter (from `profiles`); `null` while active or no profile. */
  deletedByName: string | null;
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
  aliasId?: string | null;
};
