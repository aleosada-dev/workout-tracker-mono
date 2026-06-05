import type {
  DeleteTrainingLocationInput,
  TrainingLocationRepository,
} from '@workout-tracker/domain';

export type DeleteTrainingLocation = (
  input: DeleteTrainingLocationInput,
) => Promise<{ deleted: boolean }>;

export function makeDeleteTrainingLocation(
  repository: TrainingLocationRepository,
): DeleteTrainingLocation {
  return async (input) => repository.softDelete(input);
}
