import type { ExerciseMeasurementType } from '@workout-tracker/domain';
import type { MetricChartPoint } from '@/features/charts/lib/types';
import type { ExerciseDetailResponseSession } from '@/features/exercises/api/exercises';
import type { SetType } from '@/features/exercises/lib/sets';

/** Metrics tracked for an exercise on its detail screen. */
export type ExerciseMetricKey =
  | 'maxWeight'
  | 'volume'
  | 'maxReps'
  | 'sets'
  | 'maxDuration'
  | 'maxDistance';

/** Unit a metric value is expressed in. */
export type ExerciseMetricUnit = 'kg' | 'reps' | 'count' | 'seconds' | 'meters';

/** A single set logged in a training session. */
export type ExerciseSetEntry = {
  index: number;
  type: SetType;
  weightKg: number | null;
  reps: number | null;
  durationSeconds: number | null;
  distanceMeters: number | null;
};

/** A personal record for one metric. */
export type PersonalRecord = {
  metric: ExerciseMetricKey;
  value: number;
};

export type ExerciseMetricSeries = {
  unit: ExerciseMetricUnit;
  points: MetricChartPoint[];
};

export type ExerciseDetailData = {
  id: string;
  variationUserId: string | null;
  isDeleted: boolean;
  deletedAt: string | null;
  deletedByName: string | null;
  name: string;
  variationName: string | null;
  equipmentName: string;
  primaryMuscle: string;
  secondaryMuscle: string | null;
  measurementType: ExerciseMeasurementType;
  videoUrl: string | null;
  youtubeUrl: string | null;
  /** Only the metrics applicable to this exercise's measurement type are present. */
  metrics: Partial<Record<ExerciseMetricKey, ExerciseMetricSeries>>;
  lastSession: {
    /** ISO date string. */
    date: string;
    sets: ExerciseSetEntry[];
  };
  personalRecords: PersonalRecord[];
};

/** Global display order for metrics (used to order records lists). */
export const EXERCISE_METRIC_KEYS: readonly ExerciseMetricKey[] = [
  'maxWeight',
  'volume',
  'maxReps',
  'maxDuration',
  'maxDistance',
  'sets',
];

export const EXERCISE_METRIC_UNIT: Record<ExerciseMetricKey, ExerciseMetricUnit> = {
  maxWeight: 'kg',
  volume: 'kg',
  maxReps: 'reps',
  sets: 'count',
  maxDuration: 'seconds',
  maxDistance: 'meters',
};

/**
 * The metrics that are meaningful for each measurement type, in display order.
 * Single source of truth shared by the detail chart/records and the session
 * summary records. `sets` applies to every type.
 */
export const METRICS_BY_MEASUREMENT: Record<ExerciseMeasurementType, ExerciseMetricKey[]> = {
  weight_reps: ['maxWeight', 'volume', 'maxReps', 'sets'],
  reps: ['maxReps', 'sets'],
  duration: ['maxDuration', 'sets'],
  distance: ['maxDistance', 'sets'],
};

export function metricsFor(measurementType: ExerciseMeasurementType): ExerciseMetricKey[] {
  return METRICS_BY_MEASUREMENT[measurementType] ?? METRICS_BY_MEASUREMENT.weight_reps;
}

/** Maps a detail session's sets to the detail-screen rows, ordered by `setOrder`. */
export function toSetEntries(session: ExerciseDetailResponseSession): ExerciseSetEntry[] {
  return [...session.sets]
    .sort((a, b) => a.setOrder - b.setOrder)
    .map((set) => ({
      index: set.setOrder + 1,
      type: set.setType as SetType,
      weightKg: set.weightKg,
      reps: set.reps,
      durationSeconds: set.durationSeconds,
      distanceMeters: set.distanceMeters,
    }));
}
