import type { MeasurementType } from '../set/sets';

export type SupersetMemberLike = {
  id: string;
  supersetGroupId: string;
};

export function isSupersetGroup<T extends SupersetMemberLike>(exercises: readonly T[]): boolean {
  return (
    exercises.length >= 2 && exercises.every((exercise) => exercise.supersetGroupId !== exercise.id)
  );
}

/** Only rep-based exercises can take part in a superset. */
export const SUPERSET_MEASUREMENT_TYPES: readonly MeasurementType[] = ['weight_reps', 'reps'];

export function isSupersetMeasurementType(measurementType: MeasurementType): boolean {
  return SUPERSET_MEASUREMENT_TYPES.includes(measurementType);
}
