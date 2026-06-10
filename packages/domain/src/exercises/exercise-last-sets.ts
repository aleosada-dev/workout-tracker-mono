/**
 * Último set executado por slot lógico (warmup-1, normal-1, ...) ao longo de todo o
 * histórico, por variation. Usado para os placeholders durante a execução do treino.
 * A `logicalKey` segue a definição de `assignLogicalKeys` (workouts/matching).
 *
 * Segmentado por alias (máquina): cada variation traz um bucket por alias usado no
 * histórico — incluindo o bucket "sem alias" (`aliasId: null`) — e o `lastUsedAliasId`
 * (alias do log mais recente) para a pré-seleção na execução.
 */
export type ExerciseLastSet = {
  logicalKey: string;
  weightKg: number | null;
  reps: number | null;
  durationSeconds: number | null;
  distanceMeters: number | null;
  /** `finished_at` do log de origem; permite mesclar buckets pelo set mais recente por slot. */
  finishedAt: string;
};

export type ExerciseLastSetsBucket = {
  aliasId: string | null;
  sets: ExerciseLastSet[];
};

export type ExerciseLastSets = {
  variationId: string;
  lastUsedAliasId: string | null;
  buckets: ExerciseLastSetsBucket[];
};

export type GetExerciseLastSetsFilter = {
  userId: string;
  variationIds: string[];
};
