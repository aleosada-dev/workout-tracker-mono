import type { Workout, WorkoutTopExercise } from '@workout-tracker/domain';

type MuscleRow = {
  slug: string;
  level: number;
  parent: { slug: string; level: number } | null;
} | null;

type ExerciseRow = {
  slug: string | null;
  name: string;
} | null;

type EquipmentRow = {
  slug: string;
  preposition: string;
} | null;

type VariationRow = {
  slug: string | null;
  name: string | null;
  exercise: ExerciseRow;
  muscle: MuscleRow;
  equipment: EquipmentRow;
} | null;

type WorkoutExerciseRow = {
  position: number;
  variation: VariationRow;
};

type WorkoutLogRow = {
  started_at: string;
  deleted_at: string | null;
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
  workout_logs: WorkoutLogRow[] | null;
};

function pickSlug(muscle: MuscleRow): string | null {
  if (!muscle) return null;
  if (muscle.level === 2) return muscle.slug;
  if (muscle.level === 3 && muscle.parent?.level === 2) return muscle.parent.slug;
  return null;
}

function pickLastPerformedAt(logs: WorkoutLogRow[] | null): Date | null {
  if (!logs || logs.length === 0) return null;
  let max: number | null = null;
  for (const log of logs) {
    if (log.deleted_at) continue;
    const t = Date.parse(log.started_at);
    if (Number.isNaN(t)) continue;
    if (max === null || t > max) max = t;
  }
  return max === null ? null : new Date(max);
}

function pickTopExercises(exercises: WorkoutExerciseRow[]): WorkoutTopExercise[] {
  return [...exercises]
    .sort((a, b) => a.position - b.position)
    .slice(0, 2)
    .map((we) => ({
      slug: we.variation?.exercise?.slug ?? null,
      name: we.variation?.exercise?.name ?? '',
      variationSlug: we.variation?.slug ?? null,
      variationName: we.variation?.name ?? null,
      equipmentSlug: we.variation?.equipment?.slug ?? '',
      equipmentPreposition: we.variation?.equipment?.preposition ?? '',
    }));
}

export function toWorkout(row: WorkoutListRow): Workout {
  const exercises = row.workout_exercises ?? [];
  const muscleSlugs = new Set<string>();
  for (const exercise of exercises) {
    const primary = pickSlug(exercise.variation?.muscle ?? null);
    if (primary) muscleSlugs.add(primary);
  }
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    folderId: row.folder_id,
    folderName: row.folder?.name ?? null,
    exerciseCount: exercises.length,
    muscleSlugs: Array.from(muscleSlugs),
    topExercises: pickTopExercises(exercises),
    lastPerformedAt: pickLastPerformedAt(row.workout_logs),
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}
