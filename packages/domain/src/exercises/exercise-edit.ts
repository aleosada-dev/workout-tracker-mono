import type { VideoContentType } from '../media/video';
import type { ExerciseMeasurementType } from './models';

export type GetExerciseForEditFilter = {
  userId: string;
  variationId: string;
};

/** Uploaded device video of a variation, as the edit form needs it. */
export type ExerciseForEditVideo = {
  objectKey: string;
  thumbnailKey: string;
  durationSeconds: number;
  sizeBytes: number;
  contentType: VideoContentType;
  processingStatus: string;
  /** Playable URL of the uploaded video, or `null` when it cannot be resolved. */
  url: string | null;
};

/** Everything the exercise edit form needs to pre-fill its fields and title. */
export type ExerciseForEdit = {
  variationId: string;
  exerciseName: string;
  measurementType: ExerciseMeasurementType;
  variationName: string | null;
  muscleId: string;
  secondaryMuscleId: string | null;
  equipmentId: string;
  /** Equipment slug and preposition — used to compose the screen title. */
  equipmentSlug: string;
  equipmentPreposition: string;
  youtubeVideoUrl: string | null;
  video: ExerciseForEditVideo | null;
};
