import type { ExerciseRepository } from '@workout-tracker/domain';
import { makeCopyExercises } from './copy-exercises';
import { makeCreateExercise } from './create-exercise';
import { makeCreateVariationAlias } from './create-variation-alias';
import { makeDeleteExercises } from './delete-exercises';
import { makeDeleteVariationAlias } from './delete-variation-alias';
import { makeGetExerciseDetail } from './get-exercise-detail';
import { makeGetExerciseForEdit } from './get-exercise-for-edit';
import { makeListExerciseLastSets } from './list-exercise-last-sets';
import { makeListExerciseNames } from './list-exercise-names';
import { makeListExerciseRecords } from './list-exercise-records';
import { makeListExercises } from './list-exercises';
import { makeListVariationAliases } from './list-variation-aliases';
import { makeUpdateExercise } from './update-exercise';
import { makeUpdateVariationAlias } from './update-variation-alias';

export function makeExerciseApp(repository: ExerciseRepository) {
  return {
    list: makeListExercises(repository),
    listNames: makeListExerciseNames(repository),
    getExerciseDetail: makeGetExerciseDetail(repository),
    getExerciseForEdit: makeGetExerciseForEdit(repository),
    listExerciseRecords: makeListExerciseRecords(repository),
    listExerciseLastSets: makeListExerciseLastSets(repository),
    createExercise: makeCreateExercise(repository),
    updateExercise: makeUpdateExercise(repository),
    deleteExercises: makeDeleteExercises(repository),
    copyExercises: makeCopyExercises(repository),
    listVariationAliases: makeListVariationAliases(repository),
    createVariationAlias: makeCreateVariationAlias(repository),
    updateVariationAlias: makeUpdateVariationAlias(repository),
    deleteVariationAlias: makeDeleteVariationAlias(repository),
  };
}

export * from './copy-exercises';
export * from './create-exercise';
export * from './create-variation-alias';
export * from './delete-exercises';
export * from './delete-variation-alias';
export * from './get-exercise-for-edit';
export * from './list-exercise-last-sets';
export * from './list-exercise-names';
export * from './list-exercise-records';
export * from './list-exercises';
export * from './list-variation-aliases';
export * from './update-exercise';
export * from './update-variation-alias';
