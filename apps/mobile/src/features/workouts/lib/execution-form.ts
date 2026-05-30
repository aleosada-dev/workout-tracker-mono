import { EXERCISE_TYPES, matchSets, WORKOUT_SET_TYPES } from '@workout-tracker/domain';
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

const weightField = z
  .string()
  .min(1, { message: 'weight.required' })
  .refine((v) => countFractionDigits(v) <= MAX_WEIGHT_FRACTION_DIGITS, {
    message: 'weight.tooManyDecimals',
  })
  .transform((v) => parseLocalizedNumber(v))
  .pipe(z.number().nonnegative().lt(MAX_WEIGHT_KG));

const repsField = z
  .string()
  .min(1, { message: 'reps.required' })
  .transform((v) => Number(v))
  .pipe(z.number().int().min(MIN_REPS).max(MAX_REPS));

export const ExecutionSetSchema = z.object({
  id: z.string(),
  type: z.enum(WORKOUT_SET_TYPES),
  repsMin: z.int().positive().nullable(),
  repsMax: z.int().positive().nullable(),
  kg: weightField,
  reps: repsField,
  done: z.boolean(),
  lastKg: z.number().nonnegative().nullable().optional(),
  lastReps: z.int().positive().nullable().optional(),
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
  position: z.int().nonnegative(),
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
export type ExecutionExerciseVariation = z.infer<typeof ExecutionExerciseVariationSchema>;

export function buildExecutionFromWorkout(
  workout: GetWorkoutResponse,
  lastLog: GetWorkoutLastLogResponse = null,
): ExecutionFormInput {
  return {
    exercises: workout.exercises.map((exercise) => {
      const logExercise = lastLog?.exercises.find((e) => e.variationId === exercise.variation.id);
      const lastBySetId = new Map<string, { kg: number | null; reps: number | null }>();
      if (logExercise) {
        for (const match of matchSets(exercise.sets, logExercise.sets)) {
          if (match.a && match.b) {
            lastBySetId.set(match.a.id, { kg: match.b.weightKg, reps: match.b.reps });
          }
        }
      }
      return {
        id: exercise.id,
        position: exercise.position,
        note: exercise.note,
        restSeconds: exercise.restSeconds,
        variation: exercise.variation,
        sets: exercise.sets.map((set) => {
          const last = lastBySetId.get(set.id);
          return {
            id: set.id,
            type: set.setType,
            repsMin: set.repsMin,
            repsMax: set.repsMax,
            kg: '',
            reps: '',
            done: false,
            lastKg: last?.kg ?? null,
            lastReps: last?.reps ?? null,
          };
        }),
      };
    }),
  };
}
