import { measurementDimensions, setVolume } from '@workout-tracker/domain';
import { formatTime } from '@/features/shared/lib/utils/format-time';
import type {
  WorkoutLogDetail,
  WorkoutLogDetailExercise,
  WorkoutLogDetailSet,
} from '@/features/workout-logs/api/workout-logs';

export type WorkoutLogDetailItem =
  | { kind: 'single'; key: string; exercise: WorkoutLogDetailExercise }
  | { kind: 'superset'; key: string; members: WorkoutLogDetailExercise[] };

/**
 * Group exercises (already ordered by position) into single cards and supersets.
 * Members of a superset share a non-null `supersetGroupId`; a group with 2+
 * members renders as a superset, anything else as a standalone exercise.
 */
export function groupDetailExercises(
  exercises: WorkoutLogDetailExercise[],
): WorkoutLogDetailItem[] {
  const byGroup = new Map<string, WorkoutLogDetailExercise[]>();
  for (const exercise of exercises) {
    if (!exercise.supersetGroupId) continue;
    const members = byGroup.get(exercise.supersetGroupId) ?? [];
    members.push(exercise);
    byGroup.set(exercise.supersetGroupId, members);
  }

  const items: WorkoutLogDetailItem[] = [];
  const emitted = new Set<string>();

  exercises.forEach((exercise, index) => {
    const groupId = exercise.supersetGroupId;
    const members = groupId ? byGroup.get(groupId) : undefined;

    if (groupId && members && members.length >= 2) {
      if (emitted.has(groupId)) return;
      emitted.add(groupId);
      items.push({ kind: 'superset', key: groupId, members });
      return;
    }

    items.push({ kind: 'single', key: `${groupId ?? 'x'}-${index}`, exercise });
  });

  return items;
}

function formatDistanceMeters(meters: number, language: string): string {
  if (meters >= 1000) {
    const km = new Intl.NumberFormat(language, { maximumFractionDigits: 2 }).format(meters / 1000);
    return `${km} km`;
  }
  return `${meters} m`;
}

/** Human-readable value for a logged set, e.g. "80,5 kg × 8", "12 reps", "0:45", "5 km". */
export function formatSetValue(set: WorkoutLogDetailSet, language: string): string {
  const dims = measurementDimensions(set.measurementType);
  const parts: string[] = [];

  if (dims.weight && set.weightKg !== null) {
    const kg = new Intl.NumberFormat(language, { maximumFractionDigits: 2 }).format(set.weightKg);
    parts.push(`${kg} kg`);
  }
  if (dims.reps && set.reps !== null) {
    parts.push(dims.weight ? `× ${set.reps}` : `${set.reps}`);
  }
  if (dims.duration && set.durationSeconds !== null) {
    parts.push(formatTime(set.durationSeconds));
  }
  if (dims.distance && set.distanceMeters !== null) {
    parts.push(formatDistanceMeters(set.distanceMeters, language));
  }

  return parts.join(' ');
}

export type WorkoutLogStatsSummary = {
  durationSeconds: number;
  totalSets: number;
  totalVolumeKg: number;
};

/** Aggregate stats for the detail header. Volume sums strength sets, optionally excluding warmups. */
export function summarizeDetail(
  detail: WorkoutLogDetail,
  includeWarmup: boolean,
): WorkoutLogStatsSummary {
  const durationSeconds = Math.max(
    0,
    Math.round(
      (new Date(detail.finishedAt).getTime() - new Date(detail.startedAt).getTime()) / 1000,
    ),
  );

  let totalSets = 0;
  let totalVolumeKg = 0;

  for (const exercise of detail.exercises) {
    if (exercise.exerciseType === 'preparatory') continue;
    for (const set of exercise.sets) {
      if (!includeWarmup && set.setType === 'warmup') continue;
      totalSets += 1;
      totalVolumeKg += setVolume({ weight: set.weightKg, reps: set.reps });
    }
  }

  return { durationSeconds, totalSets, totalVolumeKg };
}
