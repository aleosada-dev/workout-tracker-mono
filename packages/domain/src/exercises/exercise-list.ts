import type { MuscleProps } from '../muscles/muscle';
import type { Nullable } from '../shared/type-helpers';
import type {
  ExerciseMeasurementType,
  ExerciseProps,
  ExerciseType,
  ExerciseVideoProps,
  Visibility,
} from './models';

export type ListExercisesFilter = {
  userId: string;
  visibility: Visibility;
  muscleIds?: string[];
  equipmentIds?: string[];
  exerciseTypes?: ExerciseType[];
  measurementTypes?: ExerciseMeasurementType[];
};

type MuscleSummary = Pick<MuscleProps, 'id' | 'name' | 'slug'>;

export type VariationListItemMuscle = MuscleSummary & {
  level2: Pick<MuscleProps, 'name' | 'slug'>;
};

export type VariationListItemSecondaryMuscle = MuscleSummary;

export type VariationListItemEquipment = {
  id: string;
  name: string;
  slug: string;
  preposition: string;
};

export type VariationListItemVideo = Nullable<
  Pick<ExerciseVideoProps, 'durationSeconds' | 'processingStatus'>
> & {
  url: string | null;
};

export type VariationListItem = {
  id: string;
  name: string | null;
  slug: string | null;
  muscle: VariationListItemMuscle;
  secondaryMuscle: VariationListItemSecondaryMuscle | null;
  equipment: VariationListItemEquipment;
  measurementType: ExerciseMeasurementType;
  video: VariationListItemVideo | null;
  imageUrl: string | null;
};

export type ExerciseListItemProps = Pick<ExerciseProps, 'id' | 'name' | 'userId'> & {
  slug: string | null;
  type: ExerciseType;
  variations: VariationListItem[];
};

export class ExerciseListItem {
  readonly id!: string;
  readonly name!: string;
  readonly slug!: string | null;
  readonly type!: ExerciseType;
  readonly userId!: string | null;
  readonly variations!: VariationListItem[];

  private constructor(props: ExerciseListItemProps) {
    Object.assign(this, props);
  }

  static restore(props: ExerciseListItemProps): ExerciseListItem {
    return new ExerciseListItem(props);
  }
}
