import type { TrainingLocationRepository } from '@workout-tracker/domain';
import { makeCreateTrainingLocation } from './create-training-location';
import { makeDeleteTrainingLocation } from './delete-training-location';
import { makeListTrainingLocations } from './list-training-locations';
import { makeUpdateTrainingLocation } from './update-training-location';

export function makeTrainingLocationApp(repository: TrainingLocationRepository) {
  return {
    list: makeListTrainingLocations(repository),
    create: makeCreateTrainingLocation(repository),
    update: makeUpdateTrainingLocation(repository),
    delete: makeDeleteTrainingLocation(repository),
  };
}

export * from './create-training-location';
export * from './delete-training-location';
export * from './list-training-locations';
export * from './update-training-location';
