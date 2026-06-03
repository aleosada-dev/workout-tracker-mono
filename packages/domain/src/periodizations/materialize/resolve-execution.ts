import type { WorkoutDetail } from '../../workouts/workout';
import type { PeriodizationAdjustment, WorkoutOverrideOp } from '../adjustment';
import { materializeWorkout } from './materialize-workout';
import { propagationMatches } from './propagation';

export type WorkoutExecutionContext = {
  workout: WorkoutDetail;
  note: string | null;
};

type ResolveInput = {
  base: WorkoutDetail;
  adjustments: PeriodizationAdjustment[];
  cycle: number;
  workoutId: string;
  positionInDay: number;
};

function cycleApplies(
  adjustment: Pick<PeriodizationAdjustment, 'cycleStart' | 'cycleEnd' | 'cycleEvery'>,
  cycle: number,
  nullMeansAlways: boolean,
): boolean {
  if (adjustment.cycleStart === null || adjustment.cycleEvery === null) return nullMeansAlways;
  return propagationMatches(cycle, {
    cycleStart: adjustment.cycleStart,
    cycleEnd: adjustment.cycleEnd,
    cycleEvery: adjustment.cycleEvery,
  });
}

function selectOverrideOps(
  adjustments: PeriodizationAdjustment[],
  workoutId: string,
  positionInDay: number,
  cycle: number,
): WorkoutOverrideOp[][] {
  return adjustments
    .filter((adjustment) => {
      const { payload } = adjustment;
      if (payload.type !== 'workout_override') return false;
      if (payload.workoutId !== workoutId) return false;
      if (payload.positionInDay !== positionInDay) return false;
      return cycleApplies(adjustment, cycle, true);
    })
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .map((adjustment) => (adjustment.payload as { ops: WorkoutOverrideOp[] }).ops);
}

function selectNote(
  adjustments: PeriodizationAdjustment[],
  workoutId: string,
  cycle: number,
): string | null {
  const match = adjustments.find((adjustment) => {
    const { payload } = adjustment;
    if (payload.type !== 'note') return false;
    if (payload.workoutId !== null && payload.workoutId !== workoutId) return false;
    return cycleApplies(adjustment, cycle, false);
  });
  return match && match.payload.type === 'note' ? match.payload.text : null;
}

/** Filters adjustments by cycle/target and materializes the executable workout for the occurrence. */
export function resolveWorkoutExecutionContext(input: ResolveInput): WorkoutExecutionContext {
  const opsList = selectOverrideOps(
    input.adjustments,
    input.workoutId,
    input.positionInDay,
    input.cycle,
  );
  const workout = materializeWorkout(input.base, opsList);
  const note = selectNote(input.adjustments, input.workoutId, input.cycle);
  return { workout, note };
}
