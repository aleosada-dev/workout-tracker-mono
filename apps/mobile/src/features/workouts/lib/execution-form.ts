import {
  EXERCISE_TYPES,
  MEASUREMENT_TYPES,
  type MeasurementType,
  matchSets,
  type SetLike,
  WORKOUT_EXERCISE_TYPES,
  WORKOUT_SET_TYPES,
} from '@workout-tracker/domain';
import { z } from 'zod';
import {
  countFractionDigits,
  parseLocalizedNumber,
} from '@/features/shared/lib/utils/numeric-input';
import type {
  GetWorkoutLastLogResponse,
  GetWorkoutResponse,
} from '@/features/workouts/api/workouts';

const MAX_WEIGHT_KG = 1000;
const MAX_WEIGHT_FRACTION_DIGITS = 2;
const MIN_REPS = 1;
const MAX_REPS = 99;
const MAX_DURATION_SECONDS = 5999;

const optionalWeightField = z
  .string()
  .refine((v) => v === '' || countFractionDigits(v) <= MAX_WEIGHT_FRACTION_DIGITS, {
    message: 'weight.tooManyDecimals',
  })
  .transform((v) => (v === '' ? undefined : parseLocalizedNumber(v)))
  .pipe(z.number().nonnegative().lt(MAX_WEIGHT_KG).optional());

const optionalRepsField = z
  .string()
  .transform((v) => (v === '' ? undefined : Number(v)))
  .pipe(z.number().int().min(MIN_REPS).max(MAX_REPS).optional());

const optionalDurationField = z
  .string()
  .transform((v) => (v === '' ? undefined : Number(v)))
  .pipe(z.number().int().min(1).max(MAX_DURATION_SECONDS).optional());

export type MeasurementDimensions = { weight: boolean; reps: boolean; duration: boolean };

export function setDimensions(measurementType: MeasurementType): MeasurementDimensions {
  switch (measurementType) {
    case 'reps':
      return { weight: false, reps: true, duration: false };
    case 'duration':
      return { weight: false, reps: false, duration: true };
    case 'duration_reps':
      return { weight: false, reps: true, duration: true };
    case 'weight_duration':
      return { weight: true, reps: false, duration: true };
    case 'weight_reps_duration':
      return { weight: true, reps: true, duration: true };
    default:
      return { weight: true, reps: true, duration: false };
  }
}

export const ExecutionSetSchema = z
  .object({
    id: z.string(),
    type: z.enum(WORKOUT_SET_TYPES),
    measurementType: z.enum(MEASUREMENT_TYPES),
    repsMin: z.int().positive().nullable(),
    repsMax: z.int().positive().nullable(),
    durationTarget: z.int().positive().nullable(),
    kg: optionalWeightField,
    reps: optionalRepsField,
    duration: optionalDurationField,
    done: z.boolean(),
    lastKg: z.number().nonnegative().nullable().optional(),
    lastReps: z.int().positive().nullable().optional(),
  })
  .superRefine((set, ctx) => {
    const dims = setDimensions(set.measurementType);
    if (dims.weight && set.kg === undefined) {
      ctx.addIssue({ code: 'custom', path: ['kg'], message: 'weight.required' });
    }
    if (dims.reps && set.reps === undefined) {
      ctx.addIssue({ code: 'custom', path: ['reps'], message: 'reps.required' });
    }
  });

export const ExecutionExerciseVariationSchema = z.object({
  id: z.string(),
  slug: z.string().nullable(),
  name: z.string().nullable(),
  exercise: z.object({
    slug: z.string().nullable(),
    name: z.string(),
    type: z.enum(EXERCISE_TYPES),
  }),
  equipment: z.object({
    slug: z.string(),
    preposition: z.string(),
  }),
  muscle: z.object({ slug: z.string() }),
  secondaryMuscle: z.object({ slug: z.string() }).nullable(),
});

export const ExecutionExerciseSchema = z.object({
  id: z.string(),
  exerciseType: z.enum(WORKOUT_EXERCISE_TYPES),
  position: z.int().nonnegative(),
  supersetGroupId: z.string(),
  supersetOrder: z.int().nonnegative(),
  note: z.string().nullable(),
  restSeconds: z.int().nonnegative().nullable(),
  variation: ExecutionExerciseVariationSchema,
  sets: z.array(ExecutionSetSchema),
});

export const ExecutionFormSchema = z.object({
  exercises: z.array(ExecutionExerciseSchema),
});

export type ExecutionFormInput = z.input<typeof ExecutionFormSchema>;
export type ExecutionFormValues = z.output<typeof ExecutionFormSchema>;
export type ExecutionExerciseInput = ExecutionFormInput['exercises'][number];
export type ExecutionSetInput = ExecutionExerciseInput['sets'][number];
export type ExecutionExerciseVariation = z.infer<typeof ExecutionExerciseVariationSchema>;

type LastLogExerciseSets = NonNullable<GetWorkoutLastLogResponse>['exercises'][number]['sets'];
type TemplateExerciseSets = GetWorkoutResponse['exercises'][number]['sets'];

type LastValues = { lastKg: number | null; lastReps: number | null };
type TargetValues = {
  repsMin: number | null;
  repsMax: number | null;
  durationTarget: number | null;
};

export function matchExecutionSets<R extends SetLike>(
  sets: ExecutionSetInput[],
  reference: R[] | undefined,
): Array<R | null> {
  if (!reference || reference.length === 0) {
    return sets.map(() => null);
  }
  const keyed = sets.map((set, index) => ({ setType: set.type, setOrder: index, id: set.id }));
  const byId = new Map<string, R>();
  for (const match of matchSets(keyed, reference)) {
    if (match.a && match.b) {
      byId.set(match.a.id, match.b);
    }
  }
  return sets.map((set) => byId.get(set.id) ?? null);
}

export function matchExecutionSetsToLog(
  sets: ExecutionSetInput[],
  logSets: LastLogExerciseSets | undefined,
): LastValues[] {
  return matchExecutionSets(sets, logSets).map((log) => ({
    lastKg: log?.weightKg ?? null,
    lastReps: log?.reps ?? null,
  }));
}

export function matchExecutionSetsToTemplate(
  sets: ExecutionSetInput[],
  templateSets: TemplateExerciseSets | undefined,
): TargetValues[] {
  return matchExecutionSets(sets, templateSets).map((template) => ({
    repsMin: template?.repsMin ?? null,
    repsMax: template?.repsMax ?? null,
    durationTarget: template?.durationSeconds ?? null,
  }));
}

export function autofillFromLast(current: string, last: number | null | undefined): string | null {
  if (current.length > 0) {
    return null;
  }
  if (last == null) {
    return null;
  }
  return String(last);
}

export function restTimerDuration(restSeconds: number | null | undefined): number | null {
  if (restSeconds == null || restSeconds <= 0) {
    return null;
  }
  return restSeconds;
}

export function buildExecutionFromWorkout(
  workout: GetWorkoutResponse,
  lastLog: GetWorkoutLastLogResponse = null,
): ExecutionFormInput {
  return {
    exercises: workout.exercises.map((exercise) => {
      const logExercise = lastLog?.exercises.find((e) => e.variationId === exercise.variation.id);
      const sets: ExecutionSetInput[] = exercise.sets.map((set) => ({
        id: set.id,
        type: set.setType ?? 'normal',
        measurementType: set.measurementType ?? 'weight_reps',
        repsMin: set.repsMin,
        repsMax: set.repsMax,
        durationTarget: set.durationSeconds ?? null,
        kg: '',
        reps: '',
        duration: '',
        done: false,
        lastKg: null,
        lastReps: null,
      }));
      const matched = matchExecutionSetsToLog(sets, logExercise?.sets);
      return {
        id: exercise.id,
        exerciseType: exercise.exerciseType,
        position: exercise.position,
        supersetGroupId: exercise.supersetGroupId,
        supersetOrder: exercise.supersetOrder,
        note: exercise.note,
        restSeconds: exercise.restSeconds,
        variation: exercise.variation,
        sets: sets.map((set, i) => ({ ...set, ...matched[i] })),
      };
    }),
  };
}
