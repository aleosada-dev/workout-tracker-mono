import type { WeightUnit } from '@workout-tracker/domain';
import type { TFunction } from 'i18next';
import type {
  ListExercisesResponseExercise,
  ListExercisesResponseVariation,
} from '@/features/exercises/api/exercises';
import { formatWeightInUnit } from '@/features/shared/lib/utils/format-weight';
import { EXERCISE_METRIC_UNIT, type PersonalRecord } from './detail-types';
import type { ExerciseListItem } from './list.types';

/** Minimal fields needed to build an exercise's display name. */
export type ExerciseNameParts = {
  exerciseName: string;
  equipmentName: string;
  equipmentPreposition: string;
};

/**
 * Display name for an exercise variation.
 * PT: `<exercise> <preposition> <equipment>` ("Abdominal na Máquina").
 * Other languages drop the preposition and lead with the equipment:
 * `<equipment> <exercise>` ("Machine Abdominal").
 *
 * The variation suffix (the API's `name`) is not part of the display name — it
 * is rendered separately by the UI.
 */
export function composeExerciseName(
  { exerciseName, equipmentName, equipmentPreposition }: ExerciseNameParts,
  language: string,
): string {
  if (language === 'pt') return `${exerciseName} ${equipmentPreposition} ${equipmentName}`;
  return `${equipmentName} ${exerciseName}`;
}

/**
 * Display name for an exercise: the translation keyed by its `slug`, falling
 * back to the stored `name` when the exercise has no slug (user-created) or no
 * translation registered yet.
 */
export function resolveExerciseName(slug: string | null, name: string, t: TFunction): string {
  return slug ? t(`exerciseNames.${slug}`, { defaultValue: name }) : name;
}

/**
 * Display name for a variation: the translation keyed by its `slug`, falling
 * back to the stored `name` when the variation has no slug (user-created) or no
 * translation registered yet. Returns `null` for an unnamed, unslugged variation.
 */
export function resolveVariationName(
  slug: string | null,
  name: string | null,
  t: TFunction,
): string | null {
  if (!slug) return name;
  return t(`variationNames.${slug}`, { defaultValue: name ?? '' }) || null;
}

export function toExercise(
  exercise: ListExercisesResponseExercise,
  variation: ListExercisesResponseVariation,
  language: string,
  t: TFunction,
  currentUserId: string | null,
): ExerciseListItem {
  return {
    id: variation.id,
    name: composeExerciseName(
      {
        exerciseName: resolveExerciseName(exercise.slug, exercise.name, t),
        equipmentName: t(`equipment.${variation.equipment.slug}`),
        equipmentPreposition: variation.equipment.preposition,
      },
      language,
    ),
    variationName: resolveVariationName(variation.slug, variation.name, t),
    primaryMuscle: t(`muscles.${variation.muscle.slug}`),
    type: exercise.type.toString(),
    visibility:
      exercise.userId == null ? 'public' : exercise.userId === currentUserId ? 'owned' : 'shared',
    userId: exercise.userId,
  };
}

type FractionDigits = { min?: number; max?: number };

/** Formats a weight (stored in kg) in the user's unit using the locale's number formatting. */
export function formatKg(
  value: number,
  unit: WeightUnit,
  language: string,
  opts: FractionDigits = {},
): string {
  return formatWeightInUnit(value, unit, language, opts);
}

/** Formats an integer count with the locale's grouping. */
export function formatCount(value: number, language: string): string {
  return new Intl.NumberFormat(language, { maximumFractionDigits: 0 }).format(value);
}

/** Renders a personal-record value with the unit appropriate to its metric. */
export function formatRecordValue(
  record: PersonalRecord,
  unit: WeightUnit,
  language: string,
): string {
  switch (EXERCISE_METRIC_UNIT[record.metric]) {
    case 'kg':
      return formatKg(record.value, unit, language, { min: 2, max: 2 });
    case 'reps':
    case 'count':
      return formatCount(record.value, language);
  }
}
