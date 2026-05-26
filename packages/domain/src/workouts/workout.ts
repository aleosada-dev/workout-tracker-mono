export type WorkoutTopExercise = {
  slug: string | null;
  name: string;
  variationSlug: string | null;
  variationName: string | null;
  equipmentSlug: string;
  equipmentPreposition: string;
};

export type Workout = {
  id: string;
  userId: string;
  name: string;
  folderId: string | null;
  folderName: string | null;
  exerciseCount: number;
  muscleSlugs: string[];
  topExercises: WorkoutTopExercise[];
  lastPerformedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type ListWorkoutsFilter = {
  userId: string;
  folderId?: string | null;
};
