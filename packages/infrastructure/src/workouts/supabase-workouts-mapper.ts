import type { Workout } from '@workout-tracker/domain';

type MuscleRow = {
  slug: string;
  level: number;
  parent: { slug: string; level: number } | null;
} | null;

type VariationRow = {
  muscle: MuscleRow;
} | null;

type WorkoutExerciseRow = {
  variation: VariationRow;
};

export type WorkoutListRow = {
  id: string;
  user_id: string;
  name: string;
  folder_id: string | null;
  created_at: string;
  updated_at: string;
  folder: { name: string } | null;
  workout_exercises: WorkoutExerciseRow[] | null;
};

function pickSlug(muscle: MuscleRow): string | null {
  if (!muscle) return null;
  if (muscle.level === 2) return muscle.slug;
  if (muscle.level === 3 && muscle.parent?.level === 2) return muscle.parent.slug;
  return null;
}

export function toWorkout(row: WorkoutListRow): Workout {
  const exercises = row.workout_exercises ?? [];
  const slugs = new Set<string>();
  for (const exercise of exercises) {
    const primary = pickSlug(exercise.variation?.muscle ?? null);
    if (primary) slugs.add(primary);
  }
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    folderId: row.folder_id,
    folderName: row.folder?.name ?? null,
    exerciseCount: exercises.length,
    muscleSlugs: Array.from(slugs),
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}
