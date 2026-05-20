import type { ExerciseType } from './models';

export type CreateExerciseInput = {
  userId: string;
  exerciseName: string;
  exerciseType: ExerciseType;
  variationName: string | null;
  muscleId: string;
  secondaryMuscleId: string | null;
  equipmentId: string;
  youtubeVideoUrl: string | null;
};
