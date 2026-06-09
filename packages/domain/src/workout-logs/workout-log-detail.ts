import type { MeasurementType, WorkoutSetType } from '../set/sets';
import type { WorkoutExerciseType } from '../workouts/workout';

export type WorkoutLogDetailSet = {
  setOrder: number;
  roundOrder: number;
  setType: WorkoutSetType;
  measurementType: MeasurementType;
  weightKg: number | null;
  reps: number | null;
  repsMin: number | null;
  repsMax: number | null;
  durationSeconds: number | null;
  distanceMeters: number | null;
};

export type WorkoutLogDetailExercise = {
  variationId: string | null;
  exerciseName: string | null;
  variationName: string | null;
  exerciseType: WorkoutExerciseType;
  position: number;
  supersetGroupId: string | null;
  note: string | null;
  restSeconds: number | null;
  sets: WorkoutLogDetailSet[];
};

export type WorkoutLogDetail = {
  workoutLogId: string;
  userId: string;
  title: string | null;
  startedAt: string;
  finishedAt: string;
  note: string | null;
  exercises: WorkoutLogDetailExercise[];
  sessionRecords: unknown[];
};

export type GetWorkoutLogFilter = {
  userId: string;
  workoutLogId: string;
};

export type GetWorkoutLogResult = WorkoutLogDetail | null;
