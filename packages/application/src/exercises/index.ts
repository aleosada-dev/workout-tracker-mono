import type { ExerciseRepository } from '@workout-tracker/domain';
import { makeCreateExercise } from './create-exercise';
import { makeGetExerciseDetail } from './get-exercise-detail';
import { makeGetExerciseForEdit } from './get-exercise-for-edit';
import { makeListExercises } from './list-exercises';
import { makeUpdateExercise } from './update-exercise';

export function makeExerciseApp(repository: ExerciseRepository) {
  return {
    list: makeListExercises(repository),
    getExerciseDetail: makeGetExerciseDetail(repository),
    getExerciseForEdit: makeGetExerciseForEdit(repository),
    createExercise: makeCreateExercise(repository),
    updateExercise: makeUpdateExercise(repository),
  };
}

export * from './create-exercise';
export * from './get-exercise-for-edit';
export * from './list-exercises';
export * from './update-exercise';
