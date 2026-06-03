export type OccurrenceKind = 'workout' | 'cardio';

export const OCCURRENCE_STATUSES = ['pending', 'done', 'skipped'] as const;

export type OccurrenceStatus = (typeof OCCURRENCE_STATUSES)[number];

export type PeriodizationOccurrence = {
  occurrenceId: string;
  kind: OccurrenceKind;
  name: string;
  cycle: number;
  durationSeconds: number | null;
  workoutId: string | null;
  cardioProgramId: string | null;
  plannedDate: string;
  positionInDay: number;
};

export type ListOccurrencesFilter = {
  athleteId: string;
  date: string;
  status: OccurrenceStatus;
};

/** Everything needed to materialize the executable workout for a single occurrence. */
export type OccurrenceExecutionTarget = {
  occurrenceId: string;
  periodizationId: string;
  cycle: number;
  workoutId: string;
  positionInDay: number;
  workoutOwnerId: string;
};

export type GetOccurrenceTargetInput = {
  occurrenceId: string;
  athleteId: string;
};
