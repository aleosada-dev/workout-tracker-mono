import type { UpsertWorkoutInput, UpsertWorkoutSetInput } from '@workout-tracker/domain';

function toSetPayload(set: UpsertWorkoutSetInput) {
  return {
    id: set.id,
    setOrder: set.setOrder,
    setType: set.setType,
    repsMin: set.repsMin,
    repsMax: set.repsMax,
    durationSeconds: set.durationSeconds,
    distanceMeters: set.distanceMeters,
    roundOrder: set.roundOrder,
    linkedSetId: set.linkedSetId,
    loadPercentOfPrevious: set.loadPercentOfPrevious,
  };
}

export function toUpsertWorkoutPayload(input: UpsertWorkoutInput) {
  return {
    workoutId: input.workoutId,
    userId: input.userId,
    name: input.name,
    description: input.description,
    folderId: input.folderId,
    exercises: input.exercises.map((exercise) => ({
      id: exercise.id,
      variationId: exercise.variationId,
      exerciseType: exercise.exerciseType,
      position: exercise.position,
      supersetGroupId: exercise.supersetGroupId,
      supersetOrder: exercise.supersetOrder,
      note: exercise.note,
      restSeconds: exercise.restSeconds,
      sets: exercise.sets.map(toSetPayload),
      alternative: exercise.alternative
        ? {
            id: exercise.alternative.id,
            variationId: exercise.alternative.variationId,
            note: exercise.alternative.note,
            restSeconds: exercise.alternative.restSeconds,
            sets: exercise.alternative.sets.map(toSetPayload),
          }
        : null,
    })),
  };
}
