import type { MetricChartPoint } from '@/charts/lib/types';
import type { ExerciseHistoryResponseSession } from '@/exercises/api/exercises';
import type { SetType } from '@/exercises/lib/sets';

/** Metrics tracked for an exercise on its detail screen. */
export type ExerciseMetricKey = 'maxWeight' | 'volume' | 'maxReps' | 'sets';

/** Unit a metric value is expressed in. */
export type ExerciseMetricUnit = 'kg' | 'reps' | 'count';

/** A single set logged in a training session. */
export type ExerciseSetEntry = {
  index: number;
  type: SetType;
  weightKg: number;
  reps: number;
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

/** Everything the exercise detail screen renders (mocked for now). */
export type ExerciseDetailData = {
  id: string;
  name: string;
  variationName: string | null;
  primaryMuscle: string;
  secondaryMuscle: string | null;
  /** URL of the demonstration video, or `null` when the exercise has none. */
  videoUrl: string | null;
  youtubeUrl: string | null;
  metrics: Record<ExerciseMetricKey, ExerciseMetricSeries>;
  lastSession: {
    /** ISO date string. */
    date: string;
    sets: ExerciseSetEntry[];
  };
  personalRecords: PersonalRecord[];
};

export const EXERCISE_METRIC_KEYS: readonly ExerciseMetricKey[] = [
  'maxWeight',
  'volume',
  'maxReps',
  'sets',
];

export const EXERCISE_METRIC_UNIT: Record<ExerciseMetricKey, ExerciseMetricUnit> = {
  maxWeight: 'kg',
  volume: 'kg',
  maxReps: 'reps',
  sets: 'count',
};

/** Maps a history session's sets to the detail-screen rows, ordered by `setOrder`. */
export function toSetEntries(session: ExerciseHistoryResponseSession): ExerciseSetEntry[] {
  return [...session.sets]
    .sort((a, b) => a.setOrder - b.setOrder)
    .map((set) => ({
      index: set.setOrder + 1,
      type: set.setType as SetType,
      weightKg: set.weightKg ?? 0,
      reps: set.reps ?? 0,
    }));
}
