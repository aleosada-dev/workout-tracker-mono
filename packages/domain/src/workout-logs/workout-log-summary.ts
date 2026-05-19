export type WorkoutLogSummary = {
  id: string;
  title: string | null;
  startedAt: string;
  durationSeconds: number;
  exerciseCount: number;
  muscleGroupSlugs: string[];
  prCount: number;
};

export type WorkoutLogSummaryPage = {
  items: WorkoutLogSummary[];
  hasMore: boolean;
};

export type ListWorkoutLogSummariesFilter = {
  userId: string;
  limit: number;
  cursor?: string;
};
