import type { ExerciseMeasurementType } from '@workout-tracker/domain';
import { setVolume } from '@workout-tracker/domain';
import type { ExerciseMetricKey } from '@/features/exercises/lib/detail-types';
import type { GetWorkoutLastLogResponse } from '@/features/workouts/api/workouts';
import type { CompletedExecution } from './completed-execution';

export type ComparisonStatus = 'kept' | 'new' | 'removed';

export type SessionComparisonExercise = {
  variationId: string;
  exerciseName: string;
  variationName: string | null;
  measurementType: ExerciseMeasurementType;
  status: ComparisonStatus;
  currentSets: number;
  previousSets: number | null;
  /** Total reps across the session; null when reps aren't tracked (duration/distance). */
  currentReps: number | null;
  previousReps: number | null;
  /** The metric compared besides sets, picked by measurement type; null for reps. */
  primaryMetric: ExerciseMetricKey | null;
  currentPrimary: number;
  previousPrimary: number | null;
};

export type SessionComparison = {
  previousDate: string | null;
  exercises: SessionComparisonExercise[];
};

type Entry = {
  variationId: string;
  exerciseName: string;
  variationName: string | null;
  measurementType: ExerciseMeasurementType;
  position: number;
  sets: number;
  reps: number;
  volumeKg: number;
  durationSeconds: number;
  distanceMeters: number;
};

/** Whether total reps are meaningful to compare for this measurement type. */
function repsApplies(measurementType: ExerciseMeasurementType): boolean {
  return measurementType === 'weight_reps' || measurementType === 'reps';
}

/** The metric compared alongside sets for each measurement type. */
function primaryMetricFor(measurementType: ExerciseMeasurementType): ExerciseMetricKey | null {
  switch (measurementType) {
    case 'duration':
      return 'totalDuration';
    case 'distance':
      return 'totalDistance';
    case 'reps':
      return null;
    default:
      return 'volume';
  }
}

function primaryValue(entry: Entry): number {
  switch (primaryMetricFor(entry.measurementType)) {
    case 'totalDuration':
      return entry.durationSeconds;
    case 'totalDistance':
      return entry.distanceMeters;
    case 'volume':
      return entry.volumeKg;
    default:
      return 0;
  }
}

function aggregateCurrent(
  execution: CompletedExecution,
  includeWarmup: boolean,
): Map<string, Entry> {
  const byVariation = new Map<string, Entry>();

  for (const exercise of execution.exercises) {
    if (exercise.exerciseType === 'preparatory') continue;

    const variationId = exercise.variation.id;
    let entry = byVariation.get(variationId);
    if (!entry) {
      entry = {
        variationId,
        exerciseName: exercise.variation.exercise.name,
        variationName: exercise.variation.name,
        measurementType: exercise.variation.measurementType,
        position: exercise.position,
        sets: 0,
        reps: 0,
        volumeKg: 0,
        durationSeconds: 0,
        distanceMeters: 0,
      };
      byVariation.set(variationId, entry);
    }

    for (const set of exercise.sets) {
      if (!includeWarmup && set.type === 'warmup') continue;
      entry.sets += 1;
      entry.reps += set.reps ?? 0;
      entry.volumeKg += setVolume({ weight: set.weightKg, reps: set.reps });
      entry.durationSeconds += set.durationSeconds ?? 0;
      entry.distanceMeters += set.distanceMeters ?? 0;
    }
  }

  return byVariation;
}

function aggregatePrevious(
  lastLog: NonNullable<GetWorkoutLastLogResponse>,
  includeWarmup: boolean,
): Map<string, Entry> {
  const byVariation = new Map<string, Entry>();

  for (const exercise of lastLog.exercises) {
    if (exercise.variationId === null) continue;

    const variationId = exercise.variationId;
    let entry = byVariation.get(variationId);
    if (!entry) {
      entry = {
        variationId,
        exerciseName: exercise.exerciseName ?? '',
        variationName: exercise.variationName,
        measurementType: exercise.measurementType,
        position: exercise.position,
        sets: 0,
        reps: 0,
        volumeKg: 0,
        durationSeconds: 0,
        distanceMeters: 0,
      };
      byVariation.set(variationId, entry);
    }

    for (const set of exercise.sets) {
      if (!includeWarmup && set.setType === 'warmup') continue;
      entry.sets += 1;
      entry.reps += set.reps ?? 0;
      entry.volumeKg += setVolume({ weight: set.weightKg, reps: set.reps });
      entry.durationSeconds += set.durationSeconds ?? 0;
      entry.distanceMeters += set.distanceMeters ?? 0;
    }
  }

  return byVariation;
}

export function buildSessionComparison(
  execution: CompletedExecution,
  lastLog: GetWorkoutLastLogResponse,
  includeWarmup: boolean,
): SessionComparison | null {
  const current = aggregateCurrent(execution, includeWarmup);
  const previous = lastLog ? aggregatePrevious(lastLog, includeWarmup) : new Map<string, Entry>();

  const exercises: SessionComparisonExercise[] = [];

  for (const entry of [...current.values()].sort((a, b) => a.position - b.position)) {
    const prev = previous.get(entry.variationId);
    exercises.push({
      variationId: entry.variationId,
      exerciseName: entry.exerciseName,
      variationName: entry.variationName,
      measurementType: entry.measurementType,
      status: prev ? 'kept' : 'new',
      currentSets: entry.sets,
      previousSets: prev ? prev.sets : null,
      currentReps: repsApplies(entry.measurementType) ? entry.reps : null,
      previousReps: prev && repsApplies(entry.measurementType) ? prev.reps : null,
      primaryMetric: primaryMetricFor(entry.measurementType),
      currentPrimary: primaryValue(entry),
      previousPrimary: prev ? primaryValue(prev) : null,
    });
  }

  for (const entry of [...previous.values()].sort((a, b) => a.position - b.position)) {
    if (current.has(entry.variationId)) continue;
    exercises.push({
      variationId: entry.variationId,
      exerciseName: entry.exerciseName,
      variationName: entry.variationName,
      measurementType: entry.measurementType,
      status: 'removed',
      currentSets: 0,
      previousSets: entry.sets,
      currentReps: repsApplies(entry.measurementType) ? 0 : null,
      previousReps: repsApplies(entry.measurementType) ? entry.reps : null,
      primaryMetric: primaryMetricFor(entry.measurementType),
      currentPrimary: 0,
      previousPrimary: primaryValue(entry),
    });
  }

  if (exercises.length === 0) return null;

  return { previousDate: lastLog ? lastLog.finishedAt : null, exercises };
}
