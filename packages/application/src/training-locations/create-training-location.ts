import type {
  CreateTrainingLocationInput,
  TrainingLocation,
  TrainingLocationRepository,
} from '@workout-tracker/domain';

export type CreateTrainingLocation = (
  input: CreateTrainingLocationInput,
) => Promise<TrainingLocation>;

export function makeCreateTrainingLocation(
  repository: TrainingLocationRepository,
): CreateTrainingLocation {
  return async (input) => repository.create(input);
}
