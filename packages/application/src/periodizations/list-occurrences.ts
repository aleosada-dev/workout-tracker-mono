import type {
  ListOccurrencesFilter,
  PeriodizationOccurrence,
  PeriodizationOccurrenceRepository,
} from '@workout-tracker/domain';

export type ListOccurrences = (filter: ListOccurrencesFilter) => Promise<PeriodizationOccurrence[]>;

export function makeListOccurrences(
  repository: PeriodizationOccurrenceRepository,
): ListOccurrences {
  return async (filter) => repository.listOccurrences(filter);
}
