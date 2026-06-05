import { setVolume } from '@workout-tracker/domain';
import type { ExerciseRecordsResponse } from '@/features/exercises/api/exercises';
import {
  EXERCISE_METRIC_KEYS,
  type ExerciseMetricKey,
} from '@/features/exercises/lib/detail-types';
import type { CompletedExecution } from './completed-execution';
import type { ExecutionExerciseVariation } from './execution-form';

export type SessionRecordMetric = {
  metric: ExerciseMetricKey;
  previous: number;
  current: number;
};

export type SessionExerciseRecord = {
  exerciseName: string;
  variationName: string | null;
  records: SessionRecordMetric[];
};

type SessionMetrics = {
  maxWeight: number | null;
  volume: number;
  maxReps: number | null;
  sets: number;
};

type AggregatedExercise = {
  variation: ExecutionExerciseVariation;
  metrics: SessionMetrics;
};

function aggregateByVariation(
  execution: CompletedExecution,
  includeWarmup: boolean,
): Map<string, AggregatedExercise> {
  const byVariation = new Map<string, AggregatedExercise>();

  for (const exercise of execution.exercises) {
    if (exercise.exerciseType === 'preparatory') continue;

    const variationId = exercise.variation.id;
    let entry = byVariation.get(variationId);
    if (!entry) {
      entry = {
        variation: exercise.variation,
        metrics: { maxWeight: null, volume: 0, maxReps: null, sets: 0 },
      };
      byVariation.set(variationId, entry);
    }

    for (const set of exercise.sets) {
      if (!includeWarmup && set.type === 'warmup') continue;
      const { metrics } = entry;
      if (set.weightKg !== null) {
        metrics.maxWeight = Math.max(metrics.maxWeight ?? set.weightKg, set.weightKg);
      }
      if (set.reps !== null) {
        metrics.maxReps = Math.max(metrics.maxReps ?? set.reps, set.reps);
      }
      metrics.volume += setVolume({ weight: set.weightKg, reps: set.reps });
      metrics.sets += 1;
    }
  }

  return byVariation;
}

const METRIC_VALUE: Record<ExerciseMetricKey, (m: SessionMetrics) => number | null> = {
  maxWeight: (m) => m.maxWeight,
  volume: (m) => m.volume,
  maxReps: (m) => m.maxReps,
  sets: (m) => m.sets,
};

const PREVIOUS_VALUE: Record<
  ExerciseMetricKey,
  (record: ExerciseRecordsResponse[number]) => number | null
> = {
  maxWeight: (r) => r.maxWeightKg,
  volume: (r) => r.maxVolumeKg,
  maxReps: (r) => r.maxReps,
  sets: (r) => r.maxSets,
};

export function buildSessionRecords(
  execution: CompletedExecution,
  baseline: ExerciseRecordsResponse,
  includeWarmup: boolean,
): SessionExerciseRecord[] {
  // Records vêm segmentados por alias; o PR a comparar é o geral (aliasId null).
  const baselineByVariation = new Map(
    baseline
      .filter((record) => record.aliasId === null)
      .map((record) => [record.variationId, record]),
  );
  const result: SessionExerciseRecord[] = [];
  const aggregateByVariationVar = aggregateByVariation(execution, includeWarmup);

  for (const [variationId, { variation, metrics }] of aggregateByVariationVar) {
    const previousRecord = baselineByVariation.get(variationId);
    const records: SessionRecordMetric[] = [];

    for (const metric of EXERCISE_METRIC_KEYS) {
      const current = METRIC_VALUE[metric](metrics);

      if (!previousRecord) {
        records.push({ metric, previous: 0, current: current ?? 0 });
        continue;
      }

      if (current === null) continue;
      const previous = PREVIOUS_VALUE[metric](previousRecord) ?? 0;
      if (current > previous) {
        records.push({ metric, previous, current });
      }
    }

    if (records.length > 0) {
      result.push({
        exerciseName: variation.exercise.name,
        variationName: variation.name,
        records,
      });
    }
  }

  return result;
}
