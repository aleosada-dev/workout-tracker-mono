import type {
  ExerciseRepository,
  ListVariationAliasesFilter,
  VariationAlias,
} from '@workout-tracker/domain';

export type ListVariationAliases = (
  filter: ListVariationAliasesFilter,
) => Promise<VariationAlias[]>;

export function makeListVariationAliases(repository: ExerciseRepository): ListVariationAliases {
  return async (filter) => repository.listVariationAliases(filter);
}
