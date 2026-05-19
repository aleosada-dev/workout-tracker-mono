import type { EquipmentRepository } from '@workout-tracker/domain';
import { makeListEquipments } from './list-equipments';

export function makeEquipmentApp(repository: EquipmentRepository) {
  return {
    list: makeListEquipments(repository),
  };
}

export * from './list-equipments';
