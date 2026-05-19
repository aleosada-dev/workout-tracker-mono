import type { Muscle, MuscleRepository } from '@workout-tracker/domain';

export type ListMuscles = () => Promise<Muscle[]>;

export function makeListMuscles(respository: MuscleRepository): ListMuscles {
  return async () => respository.listAll();
}

export type ListMusclesTree = () => Promise<Muscle[]>;

export function makeListMusclesTree(repository: MuscleRepository): ListMusclesTree {
  return async () => repository.listTree();
}
