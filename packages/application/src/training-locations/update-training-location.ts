import type {
  TrainingLocation,
  TrainingLocationRepository,
  UpdateTrainingLocationInput,
} from '@workout-tracker/domain';

export type UpdateTrainingLocation = (
  input: UpdateTrainingLocationInput,
) => Promise<TrainingLocation | null>;

export function makeUpdateTrainingLocation(
  repository: TrainingLocationRepository,
): UpdateTrainingLocation {
  return async (input) => repository.update(input);
}
