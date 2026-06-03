import {
  NotFoundError,
  type PeriodizationAdjustmentRepository,
  type PeriodizationOccurrenceRepository,
  resolveWorkoutExecutionContext,
  type WorkoutDetail,
  type WorkoutRepository,
} from '@workout-tracker/domain';

export type GetOccurrenceWorkoutInput = {
  occurrenceId: string;
  athleteId: string;
};

export type OccurrenceWorkout = {
  workout: WorkoutDetail;
  note: string | null;
};

export type GetOccurrenceWorkout = (input: GetOccurrenceWorkoutInput) => Promise<OccurrenceWorkout>;

export function makeGetOccurrenceWorkout(deps: {
  occurrenceRepository: PeriodizationOccurrenceRepository;
  adjustmentRepository: PeriodizationAdjustmentRepository;
  workoutRepository: WorkoutRepository;
}): GetOccurrenceWorkout {
  return async ({ occurrenceId, athleteId }) => {
    const target = await deps.occurrenceRepository.getOccurrenceTarget({ occurrenceId, athleteId });
    if (!target) {
      throw new NotFoundError('periodization occurrence');
    }

    const [base, adjustments] = await Promise.all([
      deps.workoutRepository.getWorkout({
        userId: target.workoutOwnerId,
        workoutId: target.workoutId,
      }),
      deps.adjustmentRepository.listAdjustments(target.periodizationId),
    ]);
    if (!base) {
      throw new NotFoundError('workout');
    }

    return resolveWorkoutExecutionContext({
      base,
      adjustments,
      cycle: target.cycle,
      workoutId: target.workoutId,
      positionInDay: target.positionInDay,
    });
  };
}
