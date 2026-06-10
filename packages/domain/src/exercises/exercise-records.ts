/**
 * PRs por variation, segmentados por alias (máquina). A linha com `aliasId: null` é
 * o PR geral (máximo entre todas as máquinas + logs sem alias); as demais são por
 * máquina. Várias linhas podem voltar para a mesma variation.
 */
export type ExerciseRecords = {
  variationId: string;
  aliasId: string | null;
  maxWeightKg: number | null;
  maxVolumeKg: number | null;
  maxReps: number | null;
  maxSets: number | null;
  maxDurationSeconds: number | null;
  maxDistanceMeters: number | null;
  maxTotalDurationSeconds: number | null;
  maxTotalDistanceMeters: number | null;
};

export type GetExerciseRecordsFilter = {
  userId: string;
  variationIds: string[];
};
