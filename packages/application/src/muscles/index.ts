import type { MuscleRepository } from '@workout-tracker/domain';
import { makeListMuscles, makeListMusclesTree } from './list-muscles';

export function makeMuscleApp(repository: MuscleRepository) {
  return {
    list: makeListMuscles(repository),
    tree: makeListMusclesTree(repository),
  };
}

export * from './list-muscles';
