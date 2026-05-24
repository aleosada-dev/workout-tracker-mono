export type CopyExercisesInput = {
  userId: string;
  variationIds: string[];
};

export type CopyExercisesResult = {
  copiedCount: number;
};
