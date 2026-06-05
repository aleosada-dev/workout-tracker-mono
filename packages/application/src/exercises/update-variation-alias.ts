import type {
  ExerciseRepository,
  UpdateVariationAliasInput,
  VariationAlias,
} from '@workout-tracker/domain';

export type UpdateVariationAlias = (
  input: UpdateVariationAliasInput,
) => Promise<VariationAlias | null>;

export function makeUpdateVariationAlias(repository: ExerciseRepository): UpdateVariationAlias {
  return async (input) => repository.updateVariationAlias(input);
}
