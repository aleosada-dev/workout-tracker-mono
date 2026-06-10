import type { ExerciseMeasurementType } from '../exercises/models';
import type { WorkoutSetType } from '../set/sets';

export type WorkoutLogLastSet = {
  setOrder: number;
  setType: WorkoutSetType;
  weightKg: number | null;
  reps: number | null;
  durationSeconds: number | null;
  distanceMeters: number | null;
};

export type WorkoutLogLastExercise = {
  variationId: string | null;
  exerciseName: string | null;
  variationName: string | null;
  measurementType: ExerciseMeasurementType;
  position: number;
  supersetGroupId: string | null;
  sets: WorkoutLogLastSet[];
};

export type WorkoutLogLast = {
  workoutLogId: string;
  workoutId: string;
  startedAt: string;
  finishedAt: string;
  exercises: WorkoutLogLastExercise[];
};

export type GetLastWorkoutLogFilter = {
  workoutId: string;
};

export type GetLastWorkoutLogResult =
  | { workoutFound: false }
  | { workoutFound: true; log: WorkoutLogLast | null };
