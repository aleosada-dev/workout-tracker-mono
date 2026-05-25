import type { WorkoutFolder, WorkoutFolderColor } from '@workout-tracker/domain';

export type WorkoutFolderRow = {
  id: string;
  user_id: string;
  name: string;
  color: WorkoutFolderColor;
  created_at: string;
  updated_at: string;
};

export type WorkoutFolderWithCountRow = WorkoutFolderRow & {
  workouts?: { count: number }[] | null;
};

export function toWorkoutFolder(row: WorkoutFolderRow, workoutCount: number): WorkoutFolder {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    color: row.color,
    workoutCount,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

export function toWorkoutFolderWithCount(row: WorkoutFolderWithCountRow): WorkoutFolder {
  return toWorkoutFolder(row, row.workouts?.[0]?.count ?? 0);
}
