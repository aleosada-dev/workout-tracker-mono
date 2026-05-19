import { EXERCISE_TYPES } from '@workout-tracker/domain';
import type { ExerciseListParams } from '@/features/exercises/api/exercises';

/**
 * Counts categories with a non-default value. Used to drive the filter badge.
 * Types: counts as active only when a strict subset is selected (empty or full = no filter).
 */
export function countActiveFilters(filters: ExerciseListParams): number {
  let count = 0;

  const typesLen = filters.query.exerciseTypes?.length;
  if (typesLen && typesLen > 0 && typesLen < EXERCISE_TYPES.length) count += 1;

  if (filters.query.visibility && filters.query.visibility !== 'all') count += 1;
  if (filters.query.muscleIds?.length && filters.query.muscleIds.length > 0) count += 1;
  if (filters.query.equipmentIds?.length && filters.query.equipmentIds.length > 0) count += 1;

  return count;
}
