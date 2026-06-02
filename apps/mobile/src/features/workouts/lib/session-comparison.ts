import { setVolume } from '@workout-tracker/domain';
import type { GetWorkoutLastLogResponse } from '@/features/workouts/api/workouts';
import type { CompletedExecution } from './completed-execution';

export type ComparisonStatus = 'kept' | 'new' | 'removed';

export type SessionComparisonExercise = {
  variationId: string;
  exerciseName: string;
  variationName: string | null;
  status: ComparisonStatus;
  currentSets: number;
  previousSets: number | null;
  currentVolumeKg: number;
  previousVolumeKg: number | null;
};

export type SessionComparison = {
  previousDate: string | null;
  exercises: SessionComparisonExercise[];
};

type CurrentEntry = {
  variationId: string;
  exerciseName: string;
  variationName: string | null;
  position: number;
  sets: number;
  volumeKg: number;
};

type PreviousEntry = {
  variationId: string;
  exerciseName: string;
  variationName: string | null;
  position: number;
  sets: number;
  volumeKg: number;
};

function aggregateCurrent(
  execution: CompletedExecution,
  includeWarmup: boolean,
): Map<string, CurrentEntry> {
  const byVariation = new Map<string, CurrentEntry>();

  for (const exercise of execution.exercises) {
    if (exercise.exerciseType === 'preparatory') continue;

    const variationId = exercise.variation.id;
    let entry = byVariation.get(variationId);
    if (!entry) {
      entry = {
        variationId,
        exerciseName: exercise.variation.exercise.name,
        variationName: exercise.variation.name,
        position: exercise.position,
        sets: 0,
        volumeKg: 0,
      };
      byVariation.set(variationId, entry);
    }

    for (const set of exercise.sets) {
      if (!includeWarmup && set.type === 'warmup') continue;
      entry.sets += 1;
      entry.volumeKg += setVolume({ weight: set.weightKg, reps: set.reps });
    }
  }

  return byVariation;
}

function aggregatePrevious(
  lastLog: NonNullable<GetWorkoutLastLogResponse>,
  includeWarmup: boolean,
): Map<string, PreviousEntry> {
  const byVariation = new Map<string, PreviousEntry>();

  for (const exercise of lastLog.exercises) {
    if (exercise.variationId === null) continue;

    const variationId = exercise.variationId;
    let entry = byVariation.get(variationId);
    if (!entry) {
      entry = {
        variationId,
        exerciseName: exercise.exerciseName ?? '',
        variationName: exercise.variationName,
        position: exercise.position,
        sets: 0,
        volumeKg: 0,
      };
      byVariation.set(variationId, entry);
    }

    for (const set of exercise.sets) {
      if (!includeWarmup && set.setType === 'warmup') continue;
      entry.sets += 1;
      entry.volumeKg += setVolume({ weight: set.weightKg, reps: set.reps });
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
  const previous = lastLog
    ? aggregatePrevious(lastLog, includeWarmup)
    : new Map<string, PreviousEntry>();

  const exercises: SessionComparisonExercise[] = [];

  for (const entry of [...current.values()].sort((a, b) => a.position - b.position)) {
    const prev = previous.get(entry.variationId);
    exercises.push({
      variationId: entry.variationId,
      exerciseName: entry.exerciseName,
      variationName: entry.variationName,
      status: prev ? 'kept' : 'new',
      currentSets: entry.sets,
      previousSets: prev ? prev.sets : null,
      currentVolumeKg: entry.volumeKg,
      previousVolumeKg: prev ? prev.volumeKg : null,
    });
  }

  for (const entry of [...previous.values()].sort((a, b) => a.position - b.position)) {
    if (current.has(entry.variationId)) continue;
    exercises.push({
      variationId: entry.variationId,
      exerciseName: entry.exerciseName,
      variationName: entry.variationName,
      status: 'removed',
      currentSets: 0,
      previousSets: entry.sets,
      currentVolumeKg: 0,
      previousVolumeKg: entry.volumeKg,
    });
  }

  if (exercises.length === 0) return null;

  return { previousDate: lastLog ? lastLog.finishedAt : null, exercises };
}
