import type { Equipment } from './equipment';

export interface EquipmentRepository {
  listAll(): Promise<Equipment[]>;
}
