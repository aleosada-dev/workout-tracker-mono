export type WorkoutFolder = {
  id: string;
  userId: string;
  name: string;
  color: string;
  workoutCount: number;
  createdAt: Date;
  updatedAt: Date;
};

export type ListWorkoutFoldersFilter = {
  userId: string;
};
