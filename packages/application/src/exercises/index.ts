import type { ExerciseRepository } from '@workout-tracker/domain';
import { makeCreateExercise } from './create-exercise';
import { makeGetExerciseDetail } from './get-exercise-detail';
import { makeListExercises } from './list-exercises';

export function makeExerciseApp(repository: ExerciseRepository) {
  return {
    list: makeListExercises(repository),
    getExerciseDetail: makeGetExerciseDetail(repository),
    createExercise: makeCreateExercise(repository),
  };
}

export * from './create-exercise';
export * from './list-exercises';
