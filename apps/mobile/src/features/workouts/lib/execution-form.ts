import { WORKOUT_SET_TYPES } from '@workout-tracker/domain';
import { z } from 'zod';
import {
  countFractionDigits,
  parseLocalizedNumber,
} from '@/features/shared/lib/utils/numeric-input';
import type { GetWorkoutResponse } from '@/features/workouts/api/workouts';

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
  kg: weightField,
  reps: repsField,
  done: z.boolean(),
});

export const ExecutionExerciseSchema = z.object({
  id: z.string(),
  sets: z.array(ExecutionSetSchema),
});

export const ExecutionFormSchema = z.object({
  exercises: z.array(ExecutionExerciseSchema),
});

export type ExecutionFormInput = z.input<typeof ExecutionFormSchema>;
export type ExecutionFormValues = z.output<typeof ExecutionFormSchema>;

export function buildExecutionFromWorkout(workout: GetWorkoutResponse): ExecutionFormInput {
  return {
    exercises: workout.exercises.map((exercise) => ({
      id: exercise.id,
      sets: exercise.sets.map((set) => ({
        id: set.id,
        type: set.setType,
        kg: '',
        reps: '',
        done: false,
      })),
    })),
  };
}
