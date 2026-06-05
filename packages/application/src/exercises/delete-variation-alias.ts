import type { DeleteVariationAliasInput, ExerciseRepository } from '@workout-tracker/domain';

export type DeleteVariationAlias = (
  input: DeleteVariationAliasInput,
) => Promise<{ deleted: boolean }>;

export function makeDeleteVariationAlias(repository: ExerciseRepository): DeleteVariationAlias {
  return async (input) => repository.deleteVariationAlias(input);
}
