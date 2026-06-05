import type {
  CreateTrainingLocationInput,
  DeleteTrainingLocationInput,
  ListTrainingLocationsFilter,
  TrainingLocation,
  UpdateTrainingLocationInput,
} from './training-location';

export interface TrainingLocationRepository {
  list(filter: ListTrainingLocationsFilter): Promise<TrainingLocation[]>;
  create(input: CreateTrainingLocationInput): Promise<TrainingLocation>;
  update(input: UpdateTrainingLocationInput): Promise<TrainingLocation | null>;
  softDelete(input: DeleteTrainingLocationInput): Promise<{ deleted: boolean }>;
}
