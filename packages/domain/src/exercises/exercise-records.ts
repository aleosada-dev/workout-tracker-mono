export type ExerciseRecords = {
  variationId: string;
  maxWeightKg: number | null;
  maxVolumeKg: number | null;
  maxReps: number | null;
  maxSets: number | null;
};

export type GetExerciseRecordsFilter = {
  userId: string;
  variationIds: string[];
};
