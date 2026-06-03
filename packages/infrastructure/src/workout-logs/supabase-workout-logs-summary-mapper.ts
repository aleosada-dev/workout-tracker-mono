import type { WorkoutLogSummary } from '@workout-tracker/domain';
import { pickOne, type Relation } from '../supabase/relation';

export type SummaryRow = {
  id: string;
  started_at: string;
  finished_at: string;
  workout: Relation<{ name: string | null }>;
  workout_exercise_logs: Array<{
    id: string;
    exercise_type: string;
    variation: Relation<{
      muscle_slug: string | null;
      muscle_level2_slug: string | null;
    }>;
  }> | null;
  workout_log_summaries: Relation<{
    summary_snapshot: {
      workoutName?: string;
      sessionRecords?: unknown[];
    } | null;
  }>;
};

const MUSCLE_GROUPS_LIMIT = 3;

const durationSeconds = (startedAt: string, finishedAt: string) =>
  Math.max(0, Math.round((new Date(finishedAt).getTime() - new Date(startedAt).getTime()) / 1000));

const strengthLogs = (row: SummaryRow) =>
  (row.workout_exercise_logs ?? []).filter((log) => log.exercise_type === 'strength');

const collectMuscleGroupSlugs = (row: SummaryRow): string[] => {
  const slugs = new Set<string>();
  for (const log of strengthLogs(row)) {
    const variation = pickOne(log.variation);
    const slug = (variation?.muscle_level2_slug ?? variation?.muscle_slug)?.trim();
    if (slug) slugs.add(slug);
    if (slugs.size >= MUSCLE_GROUPS_LIMIT) break;
  }
  return [...slugs];
};

export const toWorkoutLogSummary = (row: SummaryRow): WorkoutLogSummary => {
  const workout = pickOne(row.workout);
  const snapshot = pickOne(row.workout_log_summaries)?.summary_snapshot;

  return {
    id: row.id,
    title: workout?.name?.trim() || snapshot?.workoutName?.trim() || null,
    startedAt: row.started_at,
    durationSeconds: durationSeconds(row.started_at, row.finished_at),
    exerciseCount: strengthLogs(row).length,
    muscleGroupSlugs: collectMuscleGroupSlugs(row),
    prCount: snapshot?.sessionRecords?.length ?? 0,
  };
};
