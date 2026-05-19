import type { ExerciseRepository } from '@workout-tracker/domain';
import { makeListExercises } from './list-exercises';

export function makeExerciseApp(repository: ExerciseRepository) {
  return {
    list: makeListExercises(repository),
  };
}

export * from './list-exercises';
