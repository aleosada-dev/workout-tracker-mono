import type { TFunction } from 'i18next';
import type { MetricChartPoint } from '@/features/charts/lib/types';
import type {
  ExerciseDetailResponse,
  ExerciseDetailResponseSession,
} from '@/features/exercises/api/exercises';
import {
  EXERCISE_METRIC_UNIT,
  type ExerciseDetailData,
  type ExerciseMetricKey,
  type ExerciseMetricSeries,
  metricsFor,
  type PersonalRecord,
  toSetEntries,
} from './detail-types';
import { composeExerciseName, resolveExerciseName, resolveVariationName } from './format';

function sortedSessions(
  sessions: ExerciseDetailResponseSession[],
): ExerciseDetailResponseSession[] {
  return [...sessions].sort((a, b) => a.startedAt.localeCompare(b.startedAt));
}

function series(
  sessions: ExerciseDetailResponseSession[],
  value: (s: ExerciseDetailResponseSession) => number | null,
): MetricChartPoint[] {
  const points: MetricChartPoint[] = [];
  for (const session of sessions) {
    const v = value(session);
    if (v != null) points.push({ date: session.startedAt, value: v });
  }
  return points;
}

const RECORD_VALUE: Record<
  ExerciseMetricKey,
  (records: ExerciseDetailResponse['records']) => number | null
> = {
  maxWeight: (r) => r.maxWeightKg,
  volume: (r) => r.maxVolumeKg,
  maxReps: (r) => r.maxReps,
  sets: (r) => r.maxSets,
  maxDuration: (r) => r.maxDurationSeconds,
  totalDuration: (r) => r.maxTotalDurationSeconds,
  maxDistance: (r) => r.maxDistanceMeters,
  totalDistance: (r) => r.maxTotalDistanceMeters,
};

const SERIES_VALUE: Record<
  ExerciseMetricKey,
  (session: ExerciseDetailResponseSession) => number | null
> = {
  maxWeight: (s) => s.maxWeightKg,
  volume: (s) => s.totalVolumeKg,
  maxReps: (s) => s.maxReps,
  sets: (s) => s.totalSets,
  maxDuration: (s) => s.maxDurationSeconds,
  totalDuration: (s) => s.totalDurationSeconds,
  maxDistance: (s) => s.maxDistanceMeters,
  totalDistance: (s) => s.totalDistanceMeters,
};

function toPersonalRecords(
  records: ExerciseDetailResponse['records'],
  metrics: ExerciseMetricKey[],
): PersonalRecord[] {
  return metrics.flatMap((metric) => {
    const value = RECORD_VALUE[metric](records);
    return value != null ? [{ metric, value }] : [];
  });
}

function toMetricSeries(
  sessions: ExerciseDetailResponseSession[],
  metrics: ExerciseMetricKey[],
): Partial<Record<ExerciseMetricKey, ExerciseMetricSeries>> {
  const result: Partial<Record<ExerciseMetricKey, ExerciseMetricSeries>> = {};
  for (const metric of metrics) {
    result[metric] = {
      unit: EXERCISE_METRIC_UNIT[metric],
      points: series(sessions, SERIES_VALUE[metric]),
    };
  }
  return result;
}

/** Maps the exercise detail payload to the data the detail screen renders. */
export function toExerciseDetailData(
  response: ExerciseDetailResponse,
  language: string,
  t: TFunction,
): ExerciseDetailData {
  const sessions = sortedSessions(response.sessions);
  const lastSession = response.lastSession;
  const metricKeys = metricsFor(response.variation.measurementType);
  const equipmentName = t(`equipment.${response.variation.equipmentSlug}`);
  return {
    id: response.variationId,
    variationUserId: response.variation.userId,
    isDeleted: response.variation.deletedAt !== null,
    deletedAt: response.variation.deletedAt,
    deletedByName: response.variation.deletedByName,
    name: composeExerciseName(
      {
        exerciseName: resolveExerciseName(
          response.variation.exerciseSlug,
          response.variation.exerciseName,
          t,
        ),
        equipmentName,
        equipmentPreposition: response.variation.equipmentPreposition,
        equipmentSlug: response.variation.equipmentSlug,
      },
      language,
    ),
    variationName: resolveVariationName(
      response.variation.variationSlug,
      response.variation.variationName,
      t,
    ),
    equipmentName,
    primaryMuscle: t(`muscles.${response.variation.muscleSlug}`),
    secondaryMuscle: response.variation.secondaryMuscleSlug
      ? t(`muscles.${response.variation.secondaryMuscleSlug}`)
      : null,
    measurementType: response.variation.measurementType,
    videoUrl: response.variation.videoUrl,
    youtubeUrl: response.variation.youtubeUrl,
    metrics: toMetricSeries(sessions, metricKeys),
    lastSession: lastSession
      ? { date: lastSession.startedAt, sets: toSetEntries(lastSession) }
      : { date: '', sets: [] },
    personalRecords: toPersonalRecords(response.records, metricKeys),
  };
}
