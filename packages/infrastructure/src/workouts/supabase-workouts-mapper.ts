import type {
  ExerciseType,
  MeasurementType,
  Workout,
  WorkoutDetail,
  WorkoutDetailExercise,
  WorkoutDetailSet,
  WorkoutExerciseType,
  WorkoutSetType,
  WorkoutTopExercise,
} from '@workout-tracker/domain';

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

type WorkoutSetRow = {
  id: string;
  set_order: number;
  set_type: WorkoutSetType | null;
  measurement_type: MeasurementType;
  reps_min: number | null;
  reps_max: number | null;
  duration_seconds: number | null;
  linked_set_id: string | null;
  load_percent_of_previous: number | null;
  round_order: number;
};

type DetailVariationRow = {
  id: string;
  slug: string | null;
  name: string | null;
  exercise: { slug: string | null; name: string; exercise_type: ExerciseType } | null;
  equipment: { slug: string; preposition: string } | null;
  muscle: { slug: string } | null;
  secondary_muscle: { slug: string } | null;
};

type DetailWorkoutExerciseRow = {
  id: string;
  exercise_type: WorkoutExerciseType;
  position: number;
  superset_group_id: string;
  superset_order: number;
  note: string | null;
  rest_seconds: number | null;
  variation: DetailVariationRow | null;
  workout_sets: WorkoutSetRow[] | null;
};

export type WorkoutDetailRow = {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  folder_id: string | null;
  created_at: string;
  updated_at: string;
  workout_exercises: DetailWorkoutExerciseRow[] | null;
};

function toWorkoutSet(row: WorkoutSetRow): WorkoutDetailSet {
  return {
    id: row.id,
    setOrder: row.set_order,
    setType: row.set_type ?? 'normal',
    measurementType: row.measurement_type ?? 'weight_reps',
    repsMin: row.reps_min,
    repsMax: row.reps_max,
    durationSeconds: row.duration_seconds,
    linkedSetId: row.linked_set_id,
    loadPercent: null,
    loadPercentOfPrevious: row.load_percent_of_previous,
    roundOrder: row.round_order,
  };
}

function toWorkoutExercise(row: DetailWorkoutExerciseRow): WorkoutDetailExercise {
  const variation = row.variation;
  return {
    id: row.id,
    exerciseType: row.exercise_type ?? 'strength',
    position: row.position,
    supersetGroupId: row.superset_group_id,
    supersetOrder: row.superset_order,
    note: row.note,
    restSeconds: row.rest_seconds,
    variation: {
      id: variation?.id ?? '',
      slug: variation?.slug ?? null,
      name: variation?.name ?? null,
      exercise: {
        slug: variation?.exercise?.slug ?? null,
        name: variation?.exercise?.name ?? '',
        type: variation?.exercise?.exercise_type ?? 'musculacao',
      },
      equipment: {
        slug: variation?.equipment?.slug ?? '',
        preposition: variation?.equipment?.preposition ?? '',
      },
      muscle: { slug: variation?.muscle?.slug ?? '' },
      secondaryMuscle: variation?.secondary_muscle
        ? { slug: variation.secondary_muscle.slug }
        : null,
    },
    sets: [...(row.workout_sets ?? [])].sort((a, b) => a.set_order - b.set_order).map(toWorkoutSet),
  };
}

export function toWorkoutDetail(row: WorkoutDetailRow): WorkoutDetail {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    description: row.description,
    folderId: row.folder_id,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
    exercises: [...(row.workout_exercises ?? [])]
      .sort((a, b) => a.position - b.position)
      .map(toWorkoutExercise),
  };
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
