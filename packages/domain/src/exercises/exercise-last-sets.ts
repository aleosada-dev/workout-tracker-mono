/**
 * Último set executado por slot lógico (warmup-1, normal-1, ...) ao longo de todo o
 * histórico, por variation. Usado para os placeholders durante a execução do treino.
 * A `logicalKey` segue a definição de `assignLogicalKeys` (workouts/matching).
 */
export type ExerciseLastSet = {
  logicalKey: string;
  weightKg: number | null;
  reps: number | null;
};

export type ExerciseLastSets = {
  variationId: string;
  sets: ExerciseLastSet[];
};

export type GetExerciseLastSetsFilter = {
  userId: string;
  variationIds: string[];
};
