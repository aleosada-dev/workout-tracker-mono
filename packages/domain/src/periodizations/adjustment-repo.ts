import type { PeriodizationAdjustment } from './adjustment';

export interface PeriodizationAdjustmentRepository {
  listAdjustments(periodizationId: string): Promise<PeriodizationAdjustment[]>;
}
