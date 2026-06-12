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

export const BuilderAlternativeSchema = z.object({
  id: z.string(),
  note: z.string().nullable(),
  restSeconds: z.int().nonnegative().nullable(),
  variation: ExecutionExerciseVariationSchema,
  sets: z.array(BuilderSetSchema).min(1),
});

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
  alternative: BuilderAlternativeSchema.nullable().default(null),
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

export type BuilderAlternativeInput = BuilderExerciseInput['alternative'];

export function buildBuilderAlternativeFromPicked(
  picked: PickedExercise,
  principalSets: BuilderSetInput[],
  generateId: () => string,
): NonNullable<BuilderAlternativeInput> {
  const measurementType = setMeasurementTypeForVariation(picked.variation.measurementType);
  return {
    id: generateId(),
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
    sets: principalSets.map((set) => ({
      id: generateId(),
      type: set.type,
      measurementType,
      roundOrder: set.roundOrder,
      repsMin: set.repsMin,
      repsMax: set.repsMax,
      duration: set.duration,
      distance: set.distance,
      loadPercent: set.loadPercent,
      linkedSetId: null,
    })),
  };
}

type ResponseExercise = GetWorkoutResponse['exercises'][number];

function mapResponseSetsToBuilder(exercise: ResponseExercise): BuilderSetInput[] {
  const fallbackRounds = deriveRoundOrders(
    exercise.sets.map((set) => ({ type: set.setType ?? 'normal' })),
  );
  const setMeasurementType = setMeasurementTypeForVariation(exercise.variation.measurementType);
  return exercise.sets.map((set, i) => ({
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
  }));
}

export function buildBuilderFromWorkout(workout: GetWorkoutResponse): WorkoutFormInput {
  const altByPrincipal = new Map(
    workout.exercises
      .filter((exercise) => exercise.alternativeOfId != null)
      .map((exercise) => [exercise.alternativeOfId as string, exercise]),
  );
  return {
    name: workout.name,
    description: workout.description ?? '',
    exercises: workout.exercises
      .filter((exercise) => exercise.alternativeOfId == null)
      .map((exercise) => {
        const alt = altByPrincipal.get(exercise.id) ?? null;
        return {
          id: exercise.id,
          exerciseType: exercise.exerciseType,
          position: exercise.position,
          supersetGroupId: exercise.supersetGroupId,
          supersetOrder: exercise.supersetOrder,
          note: exercise.note,
          restSeconds: exercise.restSeconds,
          variation: exercise.variation,
          sets: mapResponseSetsToBuilder(exercise),
          alternative: alt
            ? {
                id: alt.id,
                note: alt.note,
                restSeconds: alt.restSeconds,
                variation: alt.variation,
                sets: mapResponseSetsToBuilder(alt),
              }
            : null,
        };
      }),
  };
}

type UpsertWorkoutSetBody = {
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
};

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
    sets: UpsertWorkoutSetBody[];
    alternative: {
      id: string;
      variationId: string;
      note: string | null;
      restSeconds: number | null;
      sets: UpsertWorkoutSetBody[];
    } | null;
  }[];
};

/**
 * Achata os valores validados do form no corpo do PUT. `linkedSetId` é derivado
 * aqui (drop/cluster aponta para o set imediatamente anterior) em vez de
 * confiar no valor carregado no form — remoções/reordenações deixariam um id
 * morto para trás.
 */
function mapBuilderSetsToRequest(
  sets: WorkoutFormValues['exercises'][number]['sets'],
): UpsertWorkoutSetBody[] {
  return sets.map((set, index) => ({
    id: set.id,
    setOrder: index,
    setType: set.type,
    repsMin: set.repsMin,
    repsMax: set.repsMax,
    durationSeconds: set.duration,
    distanceMeters: set.distance,
    roundOrder: set.roundOrder,
    linkedSetId:
      (set.type === 'drop' || set.type === 'cluster') && index > 0 ? sets[index - 1].id : null,
    loadPercentOfPrevious: set.type === 'drop' || set.type === 'cluster' ? set.loadPercent : null,
  }));
}

/**
 * As séries do alternativo são sempre iguais às do exercício principal — o form
 * não as edita separadamente. No save espelhamos a prescrição do principal,
 * persistindo com os ids próprios do alternativo (linhas independentes no banco),
 * reaproveitando os ids existentes por posição e cunhando novos para sobras.
 */
function mirrorAlternativeSets(
  principalSets: WorkoutFormValues['exercises'][number]['sets'],
  alternativeSets: WorkoutFormValues['exercises'][number]['sets'],
  generateId: () => string,
): UpsertWorkoutSetBody[] {
  const ids = principalSets.map((_, index) => alternativeSets[index]?.id ?? generateId());
  return principalSets.map((set, index) => ({
    id: ids[index],
    setOrder: index,
    setType: set.type,
    repsMin: set.repsMin,
    repsMax: set.repsMax,
    durationSeconds: set.duration,
    distanceMeters: set.distance,
    roundOrder: set.roundOrder,
    linkedSetId:
      (set.type === 'drop' || set.type === 'cluster') && index > 0 ? ids[index - 1] : null,
    loadPercentOfPrevious: set.type === 'drop' || set.type === 'cluster' ? set.loadPercent : null,
  }));
}

export function toUpsertWorkoutRequest(
  values: WorkoutFormValues,
  {
    userId,
    folderId,
    generateId,
  }: { userId?: string; folderId: string | null; generateId: () => string },
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
      sets: mapBuilderSetsToRequest(exercise.sets),
      alternative: exercise.alternative
        ? {
            id: exercise.alternative.id,
            variationId: exercise.alternative.variation.id,
            note: exercise.alternative.note,
            restSeconds: exercise.alternative.restSeconds,
            sets: mirrorAlternativeSets(exercise.sets, exercise.alternative.sets, generateId),
          }
        : null,
    })),
  };
}
