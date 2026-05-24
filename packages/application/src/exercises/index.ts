import type { ExerciseRepository } from '@workout-tracker/domain';
import { makeCopyExercises } from './copy-exercises';
import { makeCreateExercise } from './create-exercise';
import { makeDeleteExercises } from './delete-exercises';
import { makeGetExerciseDetail } from './get-exercise-detail';
import { makeGetExerciseForEdit } from './get-exercise-for-edit';
import { makeListExerciseNames } from './list-exercise-names';
import { makeListExercises } from './list-exercises';
import { makeUpdateExercise } from './update-exercise';

export function makeExerciseApp(repository: ExerciseRepository) {
  return {
    list: makeListExercises(repository),
    listNames: makeListExerciseNames(repository),
    getExerciseDetail: makeGetExerciseDetail(repository),
    getExerciseForEdit: makeGetExerciseForEdit(repository),
    createExercise: makeCreateExercise(repository),
    updateExercise: makeUpdateExercise(repository),
    deleteExercises: makeDeleteExercises(repository),
    copyExercises: makeCopyExercises(repository),
  };
}

export * from './copy-exercises';
export * from './create-exercise';
export * from './delete-exercises';
export * from './get-exercise-for-edit';
export * from './list-exercise-names';
export * from './list-exercises';
export * from './update-exercise';
