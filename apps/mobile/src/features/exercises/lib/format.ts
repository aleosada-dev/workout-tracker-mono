import type { TFunction } from 'i18next';
import type {
  ListExercisesResponseExercise,
  ListExercisesResponseVariation,
} from '@/features/exercises/api/exercises';
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
    visibility: exercise.userId == null ? 'public' : 'private',
    userId: exercise.userId,
  };
}

type FractionDigits = { min?: number; max?: number };

/** Formats a weight in kg using the locale's number formatting (comma decimals in pt). */
export function formatKg(
  value: number,
  language: string,
  { min = 0, max = 2 }: FractionDigits = {},
): string {
  const n = new Intl.NumberFormat(language, {
    minimumFractionDigits: min,
    maximumFractionDigits: max,
  }).format(value);
  return `${n} kg`;
}

/** Formats an integer count with the locale's grouping. */
export function formatCount(value: number, language: string): string {
  return new Intl.NumberFormat(language, { maximumFractionDigits: 0 }).format(value);
}

/** Renders a personal-record value with the unit appropriate to its metric. */
export function formatRecordValue(record: PersonalRecord, language: string): string {
  switch (EXERCISE_METRIC_UNIT[record.metric]) {
    case 'kg':
      return formatKg(record.value, language, { min: 2, max: 2 });
    case 'reps':
    case 'count':
      return formatCount(record.value, language);
  }
}
