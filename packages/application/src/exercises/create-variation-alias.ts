import type {
  CreateVariationAliasInput,
  ExerciseRepository,
  VariationAlias,
} from '@workout-tracker/domain';

export type CreateVariationAlias = (input: CreateVariationAliasInput) => Promise<VariationAlias>;

export function makeCreateVariationAlias(repository: ExerciseRepository): CreateVariationAlias {
  return async (input) => repository.createVariationAlias(input);
}
