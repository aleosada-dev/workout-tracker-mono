export type DeleteExercisesInput = {
  userId: string;
  variationIds: string[];
};

export type DeleteExercisesResult = {
  deletedCount: number;
};
