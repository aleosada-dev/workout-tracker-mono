export const EXERCISE_TYPES = ['preparatorio', 'musculacao'] as const;
export type ExerciseType = (typeof EXERCISE_TYPES)[number];

export const VISIBILITIES = ['all', 'public', 'shared', 'owned'] as const;
export type Visibility = (typeof VISIBILITIES)[number];

export type ExerciseVideoProps = {
  variationId: string;
  objectKey: string | null;
  thumbnailKey: string | null;
  durationSeconds: number;
  processingStatus: string;
  sizeBytes: number;
  contentType: string;
  uploadedBy: string;
  uploadedAt: Date;
  processingAttempts: number;
  processingStartedAt: Date | null;
  lastDispatchedAt: Date | null;
  processingError: string | null;
};

export type ExerciseVariationProps = {
  id: string;
  name: string | null;
  exerciseId: string;
  muscleId: string;
  secondaryMuscleId: string | null;
  equipmentId: string;
  video: ExerciseVideoProps | null;
  youtubeVideoUrl: string | null;
  imageUrl: string | null;
  createdBy: string;
  updatedBy: string;
  createdAt: Date;
  updatedAt: Date;
};

export type ExerciseProps = {
  id: string;
  name: string;
  userId: string | null;
  createdBy: string;
  updatedBy: string;
  createdAt: Date;
  updatedAt: Date;
  exerciseType: ExerciseType;
  variations: ExerciseVariationProps[];
};

export class Exercise {
  readonly id!: string;
  readonly name!: string;
  readonly userId!: string | null;
  readonly createdBy!: string;
  readonly updatedBy!: string;
  readonly createdAt!: Date;
  readonly updatedAt!: Date;
  readonly exerciseType!: ExerciseType;
  readonly variations!: ExerciseVariationProps[];

  private constructor(props: ExerciseProps) {
    Object.assign(this, props);
  }

  static restore(props: ExerciseProps): Exercise {
    return new Exercise(props);
  }
}
