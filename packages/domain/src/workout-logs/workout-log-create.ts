import type { MeasurementType, WorkoutSetType } from '../set/sets';
import type { WorkoutExerciseType } from '../workouts/workout';

export type CreateWorkoutLogSet = {
  setOrder: number;
  setType: WorkoutSetType;
  measurementType: MeasurementType;
  weightKg: number | null;
  reps: number | null;
  repsMin: number | null;
  repsMax: number | null;
  durationSeconds: number | null;
};

export type CreateWorkoutLogExercise = {
  variationId: string;
  exerciseType: WorkoutExerciseType;
  position: number;
  note: string | null;
  restSeconds: number | null;
  supersetGroupId: string | null;
  sets: CreateWorkoutLogSet[];
};

export type CreateWorkoutLogInput = {
  userId: string;
  actorId: string;
  workoutId: string | null;
  startedAt: string;
  finishedAt: string;
  note: string | null;
  isCoached: boolean;
  coachSessionId: string | null;
  exercises: CreateWorkoutLogExercise[];
};

export type CreateWorkoutLogResult = {
  workoutLogId: string;
  coachSessionId: string | null;
  coachId: string | null;
};
