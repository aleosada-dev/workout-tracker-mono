import {
  NotFoundError,
  type PeriodizationOccurrence,
  type PeriodizationOccurrenceRepository,
  type UpdateOccurrenceStatusInput,
} from '@workout-tracker/domain';

export type UpdateOccurrenceStatus = (
  input: UpdateOccurrenceStatusInput,
) => Promise<PeriodizationOccurrence>;

export function makeUpdateOccurrenceStatus(
  repository: PeriodizationOccurrenceRepository,
): UpdateOccurrenceStatus {
  return async (input) => {
    const occurrence = await repository.updateOccurrenceStatus(input);
    if (!occurrence) {
      throw new NotFoundError('periodization occurrence');
    }
    return occurrence;
  };
}
