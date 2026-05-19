import type { Equipment, EquipmentRepository } from '@workout-tracker/domain';

export type ListEquipments = () => Promise<Equipment[]>;

export function makeListEquipments(repository: EquipmentRepository): ListEquipments {
  return async () => repository.listAll();
}
