import type {
  ExerciseForEdit,
  ExerciseMeasurementType,
  VideoContentType,
} from '@workout-tracker/domain';
import type { BuildUploadedVideoUrl } from '../r2';

type ExerciseForEditVideoRow = {
  object_key: string;
  // A user-created variation's video always carries a thumbnail (the upload flow
  // generates one); the column is only nullable for the non-editable library.
  thumbnail_key: string;
  duration_seconds: number;
  size_bytes: number;
  content_type: string;
  processing_status: string;
};

/** Shape of the `variations` edit query, with the embedded exercise/equipment/video. */
export type ExerciseForEditRow = {
  id: string;
  name: string | null;
  muscle_id: string;
  secondary_muscle_id: string | null;
  equipment_id: string;
  video_url: string | null;
  user_id: string | null;
  measurement_type: string;
  exercise: { name: string };
  equipment: { slug: string; preposition: string };
  video: ExerciseForEditVideoRow | null;
};

/** Maps the `variations` edit query row to the domain {@link ExerciseForEdit}. */
export async function toExerciseForEdit(
  row: ExerciseForEditRow,
  buildUploadedVideoUrl: BuildUploadedVideoUrl,
): Promise<ExerciseForEdit> {
  const video = row.video;
  return {
    variationId: row.id,
    exerciseName: row.exercise.name,
    measurementType: row.measurement_type as ExerciseMeasurementType,
    variationName: row.name,
    muscleId: row.muscle_id,
    secondaryMuscleId: row.secondary_muscle_id,
    equipmentId: row.equipment_id,
    equipmentSlug: row.equipment.slug,
    equipmentPreposition: row.equipment.preposition,
    youtubeVideoUrl: row.video_url,
    video: video
      ? {
          objectKey: video.object_key,
          thumbnailKey: video.thumbnail_key,
          durationSeconds: video.duration_seconds,
          sizeBytes: video.size_bytes,
          contentType: video.content_type as VideoContentType,
          processingStatus: video.processing_status,
          url: await buildUploadedVideoUrl({ objectKey: video.object_key }),
        }
      : null,
  };
}
