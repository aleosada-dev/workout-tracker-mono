import type {
  GetOccurrenceTargetInput,
  ListOccurrencesFilter,
  OccurrenceExecutionTarget,
  PeriodizationOccurrence,
  UpdateOccurrenceStatusInput,
} from './occurrence';

export interface PeriodizationOccurrenceRepository {
  listOccurrences(filter: ListOccurrencesFilter): Promise<PeriodizationOccurrence[]>;
  getOccurrenceTarget(input: GetOccurrenceTargetInput): Promise<OccurrenceExecutionTarget | null>;
  updateOccurrenceStatus(
    input: UpdateOccurrenceStatusInput,
  ): Promise<PeriodizationOccurrence | null>;
}
