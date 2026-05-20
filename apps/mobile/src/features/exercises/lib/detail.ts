import type { TFunction } from 'i18next';
import type { MetricChartPoint } from '@/features/charts/lib/types';
import type {
  ExerciseDetailResponse,
  ExerciseDetailResponseSession,
} from '@/features/exercises/api/exercises';
import {
  EXERCISE_METRIC_UNIT,
  type ExerciseDetailData,
  type PersonalRecord,
  toSetEntries,
} from './detail-types';
import { composeExerciseName } from './format';

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

function toPersonalRecords(records: ExerciseDetailResponse['records']): PersonalRecord[] {
  const candidates: Array<[PersonalRecord['metric'], number | null]> = [
    ['maxWeight', records.maxWeightKg],
    ['volume', records.maxVolumeKg],
    ['maxReps', records.maxReps],
    ['sets', records.maxSets],
  ];
  return candidates.flatMap(([metric, value]) => (value != null ? [{ metric, value }] : []));
}

/** Maps the exercise detail payload to the data the detail screen renders. */
export function toExerciseDetailData(
  response: ExerciseDetailResponse,
  language: string,
  t: TFunction,
): ExerciseDetailData {
  const sessions = sortedSessions(response.sessions);
  const lastSession = response.lastSession;
  return {
    id: response.variationId,
    name: composeExerciseName(
      {
        exerciseName: response.variation.exerciseName,
        equipmentName: t(`equipment.${response.variation.equipmentSlug}`),
        equipmentPreposition: response.variation.equipmentPreposition,
      },
      language,
    ),
    variationName: response.variation.variationName,
    primaryMuscle: t(`muscles.${response.variation.muscleSlug}`),
    secondaryMuscle: response.variation.secondaryMuscleSlug
      ? t(`muscles.${response.variation.secondaryMuscleSlug}`)
      : null,
    videoUrl: response.variation.videoUrl,
    youtubeUrl: response.variation.youtubeUrl,
    metrics: {
      maxWeight: {
        unit: EXERCISE_METRIC_UNIT.maxWeight,
        points: series(sessions, (s) => s.maxWeightKg),
      },
      volume: {
        unit: EXERCISE_METRIC_UNIT.volume,
        points: series(sessions, (s) => s.totalVolumeKg),
      },
      maxReps: { unit: EXERCISE_METRIC_UNIT.maxReps, points: series(sessions, (s) => s.maxReps) },
      sets: { unit: EXERCISE_METRIC_UNIT.sets, points: series(sessions, (s) => s.totalSets) },
    },
    lastSession: lastSession
      ? { date: lastSession.startedAt, sets: toSetEntries(lastSession) }
      : { date: '', sets: [] },
    personalRecords: toPersonalRecords(response.records),
  };
}
