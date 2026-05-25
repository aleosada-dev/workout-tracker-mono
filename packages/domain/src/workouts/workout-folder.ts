export const WORKOUT_FOLDER_COLORS = [
  'blue',
  'green',
  'amber',
  'red',
  'purple',
  'pink',
  'cyan',
  'slate',
] as const;

export type WorkoutFolderColor = (typeof WORKOUT_FOLDER_COLORS)[number];

export type WorkoutFolder = {
  id: string;
  userId: string;
  name: string;
  color: WorkoutFolderColor;
  workoutCount: number;
  createdAt: Date;
  updatedAt: Date;
};

export type ListWorkoutFoldersFilter = {
  userId: string;
};

export type CreateWorkoutFolderInput = {
  userId: string;
  name: string;
  color: WorkoutFolderColor;
};

export type DeleteWorkoutFolderInput = {
  userId: string;
  folderId: string;
};
