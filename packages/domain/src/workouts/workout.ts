export type Workout = {
  id: string;
  userId: string;
  name: string;
  folderId: string | null;
  folderName: string | null;
  exerciseCount: number;
  muscleSlugs: string[];
  createdAt: Date;
  updatedAt: Date;
};

export type ListWorkoutsFilter = {
  userId: string;
  folderId?: string | null;
};
