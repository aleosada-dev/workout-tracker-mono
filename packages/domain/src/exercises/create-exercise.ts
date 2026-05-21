import type { VideoContentType } from '../media/video';
import type { ExerciseType } from './models';

export type CreateExerciseVideoInput = {
  objectKey: string;
  thumbnailKey: string;
  durationSeconds: number;
  sizeBytes: number;
  contentType: VideoContentType;
};

export type CreateExerciseInput = {
  userId: string;
  /** Variation id minted by the client so the R2 upload can happen up front. */
  variationId: string;
  exerciseName: string;
  exerciseType: ExerciseType;
  variationName: string | null;
  muscleId: string;
  secondaryMuscleId: string | null;
  equipmentId: string;
  youtubeVideoUrl: string | null;
  video: CreateExerciseVideoInput | null;
};
