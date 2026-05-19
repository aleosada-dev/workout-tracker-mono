import type { Muscle } from './muscle';

export interface MuscleRepository {
  listAll(): Promise<Muscle[]>;
  listTree(): Promise<Muscle[]>;
}
