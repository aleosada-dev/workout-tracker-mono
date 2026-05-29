import { convertWeight, type WeightUnit } from '@workout-tracker/domain';
import { parseLocalizedNumber } from '@/features/shared/lib/utils';

export const KG_LBS_MAX_FRACTION_DIGITS = 2;

export function formatConvertedWeight(
  value: string,
  from: WeightUnit,
  to: WeightUnit,
  language: string,
): string {
  if (value === '' || value === ',' || value === '.') return '';
  const parsed = parseLocalizedNumber(value);
  if (!Number.isFinite(parsed)) return '';
  const result = convertWeight(parsed, from, to);
  return new Intl.NumberFormat(language, {
    minimumFractionDigits: 0,
    maximumFractionDigits: KG_LBS_MAX_FRACTION_DIGITS,
  }).format(result);
}
