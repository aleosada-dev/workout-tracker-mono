import type { ExerciseRepository } from '@workout-tracker/domain';
import { makeGetExerciseDetail } from './get-exercise-detail';
import { makeListExercises } from './list-exercises';

export function makeExerciseApp(repository: ExerciseRepository) {
  return {
    list: makeListExercises(repository),
    getExerciseDetail: makeGetExerciseDetail(repository),
  };
}

export * from './list-exercises';
