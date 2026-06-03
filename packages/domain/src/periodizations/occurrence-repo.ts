import type {
  GetOccurrenceTargetInput,
  ListOccurrencesFilter,
  OccurrenceExecutionTarget,
  PeriodizationOccurrence,
} from './occurrence';

export interface PeriodizationOccurrenceRepository {
  listOccurrences(filter: ListOccurrencesFilter): Promise<PeriodizationOccurrence[]>;
  getOccurrenceTarget(input: GetOccurrenceTargetInput): Promise<OccurrenceExecutionTarget | null>;
}
