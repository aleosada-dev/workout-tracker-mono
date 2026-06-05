import {
  EXERCISE_METRIC_UNIT,
  type ExerciseMetricKey,
} from '@/features/exercises/lib/detail-types';
import { formatCount, formatKg } from '@/features/exercises/lib/format';

/**
 * A 0-based numeric axis with a "nice" round step (≈4 ticks) derived from the
 * data range.
 *
 * Returning an explicit domain + tick values (instead of asking a chart for a
 * fixed tick *count*) avoids the duplicated labels you'd otherwise get when the
 * series is flat or spans a short range — e.g. 5 ticks over `[3, 3]` all render
 * as "3".
 *
 * @param values - the data points the axis must cover (an empty array yields `[0, 1]`).
 * @returns the `[min, max]` domain (always starting at 0) and the tick values.
 */
export function niceYAxis(values: number[]): { domain: [number, number]; ticks: number[] } {
  const max = Math.max(0, ...values);
  if (max === 0) return { domain: [0, 1], ticks: [0, 1] };
  const rawStep = max / 4;
  const magnitude = 10 ** Math.floor(Math.log10(rawStep));
  const normalized = rawStep / magnitude;
  const step = (normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10) * magnitude;
  const top = Math.ceil(max / step) * step;
  const ticks: number[] = [];
  for (let i = 0; i * step <= top + 1e-9; i++) ticks.push(Number((i * step).toFixed(6)));
  return { domain: [0, top], ticks };
}

/** Formats a chart axis tick for the given exercise metric (e.g. `8 kg`, `12`). */
export function formatMetricTick(
  metric: ExerciseMetricKey,
  value: number,
  language: string,
): string {
  return EXERCISE_METRIC_UNIT[metric] === 'kg'
    ? formatKg(value, language, { min: 0, max: 0 })
    : formatCount(value, language);
}
