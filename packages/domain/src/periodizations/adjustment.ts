import type { MeasurementType, WorkoutSetType } from '../set/sets';
import type { WorkoutDetailExerciseVariation, WorkoutExerciseType } from '../workouts/workout';

export const ADJUSTMENT_TYPES = ['workout_override', 'note'] as const;
export type AdjustmentType = (typeof ADJUSTMENT_TYPES)[number];

/** A set as carried by an override op — mirrors WorkoutDetailSet minus identity fields. */
export type WorkoutSetValue = {
  setType: WorkoutSetType;
  measurementType: MeasurementType;
  repsMin: number | null;
  repsMax: number | null;
  durationSeconds: number | null;
  loadPercent: number | null;
  loadPercentOfPrevious: number | null;
};

/** Shape needed to synthesize a WorkoutDetailExercise via add_exercise. */
export type WorkoutOverrideNewExercise = {
  exerciseType: WorkoutExerciseType;
  supersetGroupId: string;
  supersetOrder: number;
  note: string | null;
  restSeconds: number | null;
  variation: WorkoutDetailExerciseVariation;
  sets: WorkoutSetValue[];
};

export type WorkoutOverrideSetField = 'repsMin' | 'repsMax' | 'load';

export type WorkoutOverrideOp =
  | { kind: 'remove_exercise'; variationId: string }
  | {
      kind: 'add_exercise';
      variationId: string;
      position: number;
      exercise: WorkoutOverrideNewExercise;
    }
  | { kind: 'add_set'; variationId: string; position: number; set: WorkoutSetValue }
  | { kind: 'remove_set'; variationId: string; setIndex: number }
  | { kind: 'change_set_type'; variationId: string; setIndex: number; setType: WorkoutSetType }
  | {
      kind: 'change_set_value';
      variationId: string;
      setIndex: number;
      field: WorkoutOverrideSetField;
      value: number;
    };

export type WorkoutOverridePayload = {
  type: 'workout_override';
  workoutId: string;
  positionInDay: number;
  ops: WorkoutOverrideOp[];
};

export type NotePayload = {
  type: 'note';
  workoutId: string | null;
  text: string;
};

export type AdjustmentPayload = WorkoutOverridePayload | NotePayload;

export type PeriodizationAdjustment = {
  id: string;
  periodizationId: string;
  cycleStart: number | null;
  cycleEnd: number | null;
  cycleEvery: number | null;
  type: AdjustmentType;
  payload: AdjustmentPayload;
  createdAt: string;
};
