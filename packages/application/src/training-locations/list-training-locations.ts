import type {
  ListTrainingLocationsFilter,
  TrainingLocation,
  TrainingLocationRepository,
} from '@workout-tracker/domain';

export type ListTrainingLocations = (
  filter: ListTrainingLocationsFilter,
) => Promise<TrainingLocation[]>;

export function makeListTrainingLocations(
  repository: TrainingLocationRepository,
): ListTrainingLocations {
  return async (filter) => repository.list(filter);
}
