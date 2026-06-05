import { displayWeight, type WeightUnit } from '@workout-tracker/domain';

const TONNE_THRESHOLD_KG = 1000;
const SHORT_TON_LB = 2000;

type FractionDigits = { min?: number; max?: number };

/** Formats a weight (stored in kg) in the user's unit, e.g. `80,5 kg` or `177.47 lb`. */
export function formatWeightInUnit(
  kg: number,
  unit: WeightUnit,
  language: string,
  { min = 0, max = 2 }: FractionDigits = {},
): string {
  const n = new Intl.NumberFormat(language, {
    minimumFractionDigits: min,
    maximumFractionDigits: max,
  }).format(displayWeight(kg, unit));
  return `${n} ${unit}`;
}

/**
 * Aggregate volume (stored in kg) in the user's unit, collapsing to tonnes for
 * large totals: a metric tonne (1000 kg) in kg, a short ton (2000 lb) in lb.
 */
export function formatVolume(totalKg: number, unit: WeightUnit, language: string): string {
  if (unit === 'lb') {
    const lb = displayWeight(totalKg, 'lb');
    if (lb >= SHORT_TON_LB) {
      const tons = new Intl.NumberFormat(language, {
        minimumFractionDigits: 0,
        maximumFractionDigits: 1,
      }).format(lb / SHORT_TON_LB);
      return `${tons} t`;
    }
    return `${new Intl.NumberFormat(language, { maximumFractionDigits: 0 }).format(lb)} lb`;
  }
  if (totalKg >= TONNE_THRESHOLD_KG) {
    const tonnes = new Intl.NumberFormat(language, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 1,
    }).format(totalKg / TONNE_THRESHOLD_KG);
    return `${tonnes} t`;
  }
  const kg = new Intl.NumberFormat(language, { maximumFractionDigits: 0 }).format(totalKg);
  return `${kg} kg`;
}
