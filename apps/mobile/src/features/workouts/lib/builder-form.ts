import {
  deriveRoundOrders,
  MAX_DISTANCE_METERS,
  MAX_DURATION_SECONDS,
  MAX_LOAD_PERCENT,
  MAX_REPS,
  MEASUREMENT_TYPES,
  MIN_REPS,
  measurementDimensions,
  WORKOUT_EXERCISE_TYPES,
  WORKOUT_SET_TYPES,
  type WorkoutExerciseType,
  type WorkoutSetType,
} from '@workout-tracker/domain';
import { z } from 'zod';
import type { PickedExercise } from '@/features/exercises/state/exercise-picker-bridge';
import type { GetWorkoutResponse } from '@/features/workouts/api/workouts';
import {
  ExecutionExerciseVariationSchema,
  setMeasurementTypeForVariation,
} from '@/features/workouts/lib/execution-form';

const MAX_NAME_LENGTH = 100;

const optionalRepsField = z
  .string()
  .transform((v) => (v === '' ? null : Number(v)))
  .pipe(z.int().min(MIN_REPS).max(MAX_REPS).nullable());

const optionalDurationField = z
  .string()
  .transform((v) => (v === '' ? null : Number(v)))
  .pipe(z.int().min(1).max(MAX_DURATION_SECONDS).nullable());

const optionalDistanceField = z
  .string()
  .transform((v) => (v === '' ? null : Number(v)))
  .pipe(z.int().min(1).max(MAX_DISTANCE_METERS).nullable());

const optionalLoadPercentField = z
  .string()
  .transform((v) => (v === '' ? null : Number(v)))
  .pipe(z.int().min(1).max(MAX_LOAD_PERCENT).nullable());

export const BuilderSetSchema = z
  .object({
    id: z.string(),
    type: z.enum(WORKOUT_SET_TYPES),
    measurementType: z.enum(MEASUREMENT_TYPES),
    roundOrder: z.int().nonnegative(),
    repsMin: optionalRepsField,
    repsMax: optionalRepsField,
    duration: optionalDurationField,
    distance: optionalDistanceField,
    loadPercent: optionalLoadPercentField,
    linkedSetId: z.string().nullable(),
  })
  .superRefine((set, ctx) => {
    const dims = measurementDimensions(set.measurementType);
    if (dims.reps && set.repsMin == null) {
      ctx.addIssue({
        code: 'custom',
        path: ['repsMin'],
        message: 'workoutFormScreen.validation.reps.required',
      });
    }
    if (set.repsMin != null && set.repsMax != null && set.repsMax < set.repsMin) {
      ctx.addIssue({
        code: 'custom',
        path: ['repsMax'],
        message: 'workoutFormScreen.validation.reps.maxBelowMin',
      });
    }
    if (dims.duration && set.duration == null) {
      ctx.addIssue({
        code: 'custom',
        path: ['duration'],
        message: 'workoutFormScreen.validation.duration.required',
      });
    }
  })
  .transform((set) => ({
    ...set,
    repsMax: set.repsMax ?? set.repsMin,
  }));

export const BuilderExerciseSchema = z.object({
  id: z.string(),
  exerciseType: z.enum(WORKOUT_EXERCISE_TYPES),
  position: z.int().nonnegative(),
  supersetGroupId: z.string(),
  supersetOrder: z.int().nonnegative(),
  note: z.string().nullable(),
  restSeconds: z.int().nonnegative().nullable(),
  variation: ExecutionExerciseVariationSchema,
  sets: z.array(BuilderSetSchema).min(1),
});

export const WorkoutFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'workoutFormScreen.validation.name.required')
    .max(MAX_NAME_LENGTH, 'workoutFormScreen.validation.name.tooLong'),
  description: z.string(),
  exercises: z.array(BuilderExerciseSchema),
});

export type WorkoutFormInput = z.input<typeof WorkoutFormSchema>;
export type WorkoutFormValues = z.output<typeof WorkoutFormSchema>;
export type BuilderExerciseInput = WorkoutFormInput['exercises'][number];
export type BuilderSetInput = BuilderExerciseInput['sets'][number];

export function buildBuilderSet(
  id: string,
  type: WorkoutSetType,
  measurementType: BuilderSetInput['measurementType'],
  roundOrder: number,
): BuilderSetInput {
  return {
    id,
    type,
    measurementType,
    roundOrder,
    repsMin: '',
    repsMax: '',
    duration: '',
    distance: '',
    loadPercent: '',
    linkedSetId: null,
  };
}

export function buildBuilderExerciseFromPicked(
  picked: PickedExercise,
  position: number,
  generateId: () => string,
  exerciseType: WorkoutExerciseType,
  setsCount = 1,
): BuilderExerciseInput {
  const id = generateId();
  const measurementType = setMeasurementTypeForVariation(picked.variation.measurementType);
  return {
    id,
    exerciseType,
    position,
    supersetGroupId: id,
    supersetOrder: 0,
    note: null,
    restSeconds: null,
    variation: {
      id: picked.variation.id,
      slug: picked.variation.slug,
      name: picked.variation.name,
      exercise: {
        slug: picked.exercise.slug,
        name: picked.exercise.name,
        type: picked.exercise.type,
      },
      measurementType: picked.variation.measurementType,
      equipment: {
        slug: picked.variation.equipment.slug,
        preposition: picked.variation.equipment.preposition,
      },
      muscle: { slug: picked.variation.muscle.slug },
      secondaryMuscle: picked.variation.secondaryMuscle
        ? { slug: picked.variation.secondaryMuscle.slug }
        : null,
    },
    sets: Array.from({ length: Math.max(1, setsCount) }, (_, i) =>
      buildBuilderSet(generateId(), 'normal', measurementType, i),
    ),
  };
}

export function buildBuilderFromWorkout(workout: GetWorkoutResponse): WorkoutFormInput {
  return {
    name: workout.name,
    description: workout.description ?? '',
    exercises: workout.exercises.map((exercise) => {
      const fallbackRounds = deriveRoundOrders(
        exercise.sets.map((set) => ({ type: set.setType ?? 'normal' })),
      );
      const setMeasurementType = setMeasurementTypeForVariation(exercise.variation.measurementType);
      return {
        id: exercise.id,
        exerciseType: exercise.exerciseType,
        position: exercise.position,
        supersetGroupId: exercise.supersetGroupId,
        supersetOrder: exercise.supersetOrder,
        note: exercise.note,
        restSeconds: exercise.restSeconds,
        variation: exercise.variation,
        sets: exercise.sets.map((set, i) => ({
          id: set.id,
          type: set.setType ?? 'normal',
          measurementType: setMeasurementType,
          roundOrder: set.roundOrder ?? fallbackRounds[i],
          repsMin: set.repsMin != null ? String(set.repsMin) : '',
          repsMax: set.repsMax != null ? String(set.repsMax) : '',
          duration: set.durationSeconds != null ? String(set.durationSeconds) : '',
          distance: set.distanceMeters != null ? String(set.distanceMeters) : '',
          loadPercent: set.loadPercentOfPrevious != null ? String(set.loadPercentOfPrevious) : '',
          linkedSetId: set.linkedSetId,
        })),
      };
    }),
  };
}

export type UpsertWorkoutRequestBody = {
  userId?: string;
  name: string;
  description: string | null;
  folderId: string | null;
  exercises: {
    id: string;
    variationId: string;
    exerciseType: WorkoutExerciseType;
    position: number;
    supersetGroupId: string;
    supersetOrder: number;
    note: string | null;
    restSeconds: number | null;
    sets: {
      id: string;
      setOrder: number;
      setType: WorkoutSetType;
      repsMin: number | null;
      repsMax: number | null;
      durationSeconds: number | null;
      distanceMeters: number | null;
      roundOrder: number;
      linkedSetId: string | null;
      loadPercentOfPrevious: number | null;
    }[];
  }[];
};

/**
 * Achata os valores validados do form no corpo do PUT. `linkedSetId` é derivado
 * aqui (drop/cluster aponta para o set imediatamente anterior) em vez de
 * confiar no valor carregado no form — remoções/reordenações deixariam um id
 * morto para trás.
 */
export function toUpsertWorkoutRequest(
  values: WorkoutFormValues,
  { userId, folderId }: { userId?: string; folderId: string | null },
): UpsertWorkoutRequestBody {
  const description = values.description.trim();
  return {
    ...(userId ? { userId } : {}),
    name: values.name,
    description: description.length > 0 ? description : null,
    folderId,
    exercises: values.exercises.map((exercise) => ({
      id: exercise.id,
      variationId: exercise.variation.id,
      exerciseType: exercise.exerciseType,
      position: exercise.position,
      supersetGroupId: exercise.supersetGroupId,
      supersetOrder: exercise.supersetOrder,
      note: exercise.note,
      restSeconds: exercise.restSeconds,
      sets: exercise.sets.map((set, index) => ({
        id: set.id,
        setOrder: index,
        setType: set.type,
        repsMin: set.repsMin,
        repsMax: set.repsMax,
        durationSeconds: set.duration,
        distanceMeters: set.distance,
        roundOrder: set.roundOrder,
        linkedSetId:
          (set.type === 'drop' || set.type === 'cluster') && index > 0
            ? exercise.sets[index - 1].id
            : null,
        loadPercentOfPrevious:
          set.type === 'drop' || set.type === 'cluster' ? set.loadPercent : null,
      })),
    })),
  };
}
