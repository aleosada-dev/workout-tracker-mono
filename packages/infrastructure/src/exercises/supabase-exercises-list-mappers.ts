import {
  ExerciseListItem,
  type ExerciseType,
  type VariationListItem,
} from '@workout-tracker/domain';
import type { Database } from '../supabase/types';

type ListExerciseItemRpcReturn =
  Database['public']['Functions']['list_variation_views_for_mobile']['Returns'][number];

type NullableField =
  | 'name'
  | 'secondary_muscle_id'
  | 'secondary_muscle_name'
  | 'secondary_muscle_slug'
  | 'video_url'
  | 'image_url'
  | 'video_object_key'
  | 'video_thumbnail_key'
  | 'video_duration_seconds'
  | 'video_processing_status'
  | 'user_id';

export type ListExerciseItemRpcRow = Omit<ListExerciseItemRpcReturn, NullableField> & {
  [K in NullableField]: ListExerciseItemRpcReturn[K] | null;
};

function toVariation(row: ListExerciseItemRpcRow): VariationListItem {
  const hasVideo =
    row.video_url !== null ||
    row.video_object_key !== null ||
    row.video_thumbnail_key !== null ||
    row.video_duration_seconds !== null ||
    row.video_processing_status !== null;

  return {
    id: row.id,
    name: row.name,
    muscle: {
      id: row.muscle_id,
      name: row.muscle_name,
      slug: row.muscle_slug,
      level2: {
        name: row.muscle_level2_name,
        slug: row.muscle_level2_slug,
      },
    },
    secondaryMuscle: row.secondary_muscle_id
      ? {
          id: row.secondary_muscle_id,
          name: row.secondary_muscle_name as string,
          slug: row.secondary_muscle_slug as string,
        }
      : null,
    equipment: {
      id: row.equipment_id,
      name: row.equipment_name,
      slug: row.equipment_slug,
      preposition: row.equipment_preposition,
    },
    video: hasVideo
      ? {
          url: row.video_url,
          durationSeconds: row.video_duration_seconds,
          processingStatus: row.video_processing_status,
        }
      : null,
    imageUrl: row.image_url,
  };
}

export default function toExerciseListItems(rows: ListExerciseItemRpcRow[]): ExerciseListItem[] {
  const byExerciseId = new Map<
    string,
    {
      id: string;
      name: string;
      type: ExerciseType;
      userId: string | null;
      variations: VariationListItem[];
    }
  >();

  for (const row of rows) {
    let entry = byExerciseId.get(row.exercise_id);
    if (!entry) {
      entry = {
        id: row.exercise_id,
        name: row.exercise_name,
        type: row.exercise_type as ExerciseType,
        userId: row.user_id,
        variations: [],
      };
      byExerciseId.set(row.exercise_id, entry);
    }
    entry.variations.push(toVariation(row));
  }

  return Array.from(byExerciseId.values(), (entry) =>
    ExerciseListItem.restore({
      id: entry.id,
      name: entry.name,
      type: entry.type,
      userId: entry.userId,
      variations: entry.variations,
    }),
  );
}
