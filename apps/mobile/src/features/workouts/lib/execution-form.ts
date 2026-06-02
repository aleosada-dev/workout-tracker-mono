import {
  assignLogicalKeys,
  EXERCISE_TYPES,
  MEASUREMENT_TYPES,
  matchSets,
  measurementDimensions,
  type SetLike,
  WORKOUT_EXERCISE_TYPES,
  WORKOUT_SET_TYPES,
} from '@workout-tracker/domain';
import { z } from 'zod';
import type { ExerciseLastSetsResponse } from '@/features/exercises/api/exercises';
import type { PickedExercise } from '@/features/exercises/state/exercise-picker-bridge';
import {
  countFractionDigits,
  parseLocalizedNumber,
} from '@/features/shared/lib/utils/numeric-input';
import type { GetWorkoutResponse } from '@/features/workouts/api/workouts';

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
  .pipe(z.number().positive().lt(MAX_WEIGHT_KG).optional());

const optionalRepsField = z
  .string()
  .transform((v) => (v === '' ? undefined : Number(v)))
  .pipe(z.number().int().min(MIN_REPS).max(MAX_REPS).optional());

const optionalDurationField = z
  .string()
  .transform((v) => (v === '' ? undefined : Number(v)))
  .pipe(z.number().int().min(1).max(MAX_DURATION_SECONDS).optional());

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
    linkedSetId: z.string().nullable().optional(),
    loadPercentOfPrevious: z.int().nonnegative().nullable().optional(),
  })
  .superRefine((set, ctx) => {
    if (!set.done) return;
    const dims = measurementDimensions(set.measurementType);
    if (dims.weight && set.kg === undefined) {
      ctx.addIssue({ code: 'custom', path: ['kg'], message: 'weight.required' });
    }
    if (dims.reps && set.reps === undefined) {
      ctx.addIssue({ code: 'custom', path: ['reps'], message: 'reps.required' });
    }
    if (dims.duration && set.duration === undefined) {
      ctx.addIssue({ code: 'custom', path: ['duration'], message: 'duration.required' });
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

type LastSetsExerciseSets = ExerciseLastSetsResponse[number]['sets'];
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

/**
 * Casa os sets da execução com o último set por slot lógico (vindo de /exercises/last).
 * A referência já traz a `logicalKey`; aqui só computamos a logical key dos sets atuais
 * (mesma `assignLogicalKeys` do domínio) e fazemos lookup direto.
 */
export function matchExecutionSetsByLogicalKey(
  sets: ExecutionSetInput[],
  reference: LastSetsExerciseSets | undefined,
): LastValues[] {
  if (!reference || reference.length === 0) {
    return sets.map(() => ({ lastKg: null, lastReps: null }));
  }
  const keyed = assignLogicalKeys(
    sets.map((set, index) => ({ setType: set.type, setOrder: index })),
  );
  const byKey = new Map(reference.map((ref) => [ref.logicalKey, ref]));
  return keyed.map((k) => {
    const ref = byKey.get(k.logicalKey);
    return { lastKg: ref?.weightKg ?? null, lastReps: ref?.reps ?? null };
  });
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

export function buildExecutionExerciseFromPicked(
  picked: PickedExercise,
  position: number,
  generateId: () => string,
): ExecutionExerciseInput {
  const id = generateId();
  return {
    id,
    exerciseType: picked.exercise.type === 'preparatorio' ? 'preparatory' : 'strength',
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
      equipment: {
        slug: picked.variation.equipment.slug,
        preposition: picked.variation.equipment.preposition,
      },
      muscle: { slug: picked.variation.muscle.slug },
      secondaryMuscle: picked.variation.secondaryMuscle
        ? { slug: picked.variation.secondaryMuscle.slug }
        : null,
    },
    sets: [
      {
        id: generateId(),
        type: 'normal',
        measurementType: 'weight_reps',
        repsMin: null,
        repsMax: null,
        durationTarget: null,
        kg: '',
        reps: '',
        duration: '',
        done: false,
        linkedSetId: null,
        loadPercentOfPrevious: null,
      },
    ],
  };
}

export function buildExecutionFromWorkout(
  workout: GetWorkoutResponse,
  lastSets: ExerciseLastSetsResponse | null = null,
): ExecutionFormInput {
  return {
    exercises: workout.exercises.map((exercise) => {
      const lastExercise = lastSets?.find((e) => e.variationId === exercise.variation.id);
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
        linkedSetId: set.linkedSetId,
        loadPercentOfPrevious: set.loadPercentOfPrevious,
      }));
      const matched = matchExecutionSetsByLogicalKey(sets, lastExercise?.sets);
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
