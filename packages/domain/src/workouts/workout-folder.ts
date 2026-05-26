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

export type UpdateWorkoutFolderInput = {
  userId: string;
  folderId: string;
  name?: string;
  color?: WorkoutFolderColor;
};

export type DeleteWorkoutFolderMode =
  | 'delete-folder-only'
  | 'delete-with-workouts'
  | 'move-workouts';

export type DeleteWorkoutFolderInput =
  | {
      userId: string;
      folderId: string;
      mode: 'delete-folder-only';
    }
  | {
      userId: string;
      folderId: string;
      mode: 'delete-with-workouts';
    }
  | {
      userId: string;
      folderId: string;
      mode: 'move-workouts';
      targetFolderId: string | null;
    };
