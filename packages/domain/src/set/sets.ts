import type { WeightPreference } from '../preferences/user-preferences';
import {
  greaterThan,
  greaterThanOrNull,
  nonNegativeInteger,
  positiveNumberOrNull,
} from '../shared/numbers';
import { ValidationError, type ValidationIssue } from '../shared/validation-error';
import { convertWeight } from '../shared/weight-conversion';

export const WORKOUT_SET_TYPES = ['warmup', 'normal', 'drop', 'cluster'] as const;
export type WorkoutSetType = (typeof WORKOUT_SET_TYPES)[number];

export const MEASUREMENT_TYPES = [
  'weight_reps',
  'reps',
  'duration',
  'duration_reps',
  'weight_duration',
  'weight_reps_duration',
] as const;
export type MeasurementType = (typeof MEASUREMENT_TYPES)[number];

export const WEIGHT_METRICS = ['libra', 'kg'] as const;
export type WeightMetric = (typeof WEIGHT_METRICS)[number];

// ---------- Measurement dimensions ----------

/** Which value dimensions a set tracks — i.e. the fields that are required for it. */
export type MeasurementDimensions = { weight: boolean; reps: boolean; duration: boolean };

export function measurementDimensions(measurementType: MeasurementType): MeasurementDimensions {
  switch (measurementType) {
    case 'reps':
      return { weight: false, reps: true, duration: false };
    case 'duration':
      return { weight: false, reps: false, duration: true };
    case 'duration_reps':
      return { weight: false, reps: true, duration: true };
    case 'weight_duration':
      return { weight: true, reps: false, duration: true };
    case 'weight_reps_duration':
      return { weight: true, reps: true, duration: true };
    default:
      return { weight: true, reps: true, duration: false };
  }
}

// ---------- RepsSet ----------

export type RepsSetProps = {
  order: number;
  type: WorkoutSetType;
  metric: WeightMetric | null;
  weight: number | null;
  reps: number | null;
  repsMin: number | null;
  repsMax: number | null;
};

export class RepsSet implements RepsSetProps {
  readonly kind = 'reps' as const;
  readonly order!: number;
  readonly type!: WorkoutSetType;
  readonly metric!: WeightMetric | null;
  readonly weight!: number | null;
  readonly reps!: number | null;
  readonly repsMin!: number | null;
  readonly repsMax!: number | null;

  private constructor(props: RepsSetProps) {
    Object.assign(this, props);
  }

  static create(props: RepsSetProps): RepsSet {
    const issues: ValidationIssue[] = [
      ...nonNegativeInteger('order', props.order),
      ...positiveNumberOrNull('weight', props.weight),
      ...greaterThanOrNull('reps', props.reps, 0),
      ...greaterThanOrNull('repsMin', props.repsMin, 0),
      ...greaterThanOrNull('repsMax', props.repsMax, 0),
    ];

    const { repsMin, repsMax } = props;

    if ((repsMin === null) !== (repsMax === null)) {
      issues.push({
        code: 'validation.reps_range_incomplete',
        field: repsMin === null ? 'repsMin' : 'repsMax',
      });
    } else if (repsMin !== null && repsMax !== null && repsMax < repsMin) {
      issues.push({ code: 'validation.reps_max_less_than_reps_min', field: 'repsMax' });
    }

    if (issues.length > 0) throw new ValidationError(issues);

    return new RepsSet(props);
  }

  static restore(props: RepsSetProps): RepsSet {
    return new RepsSet(props);
  }

  get volume(): number {
    if (this.weight === null || this.reps === null) return 0;
    return this.weight * this.reps;
  }
}

// ---------- TimeSet ----------

export type TimeSetProps = {
  order: number;
  weight: number | null;
  duration: number;
};

export class TimeSet implements TimeSetProps {
  readonly kind = 'time' as const;
  readonly type = 'normal' as const;
  readonly order!: number;
  readonly weight!: number | null;
  readonly duration!: number;

  private constructor(props: TimeSetProps) {
    Object.assign(this, props);
  }

  static create(props: TimeSetProps): TimeSet {
    const issues: ValidationIssue[] = [
      ...nonNegativeInteger('order', props.order),
      ...positiveNumberOrNull('weight', props.weight),
      ...greaterThan('duration', props.duration, 0),
    ];

    if (issues.length > 0) throw new ValidationError(issues);

    return new TimeSet(props);
  }

  static restore(props: TimeSetProps): TimeSet {
    return new TimeSet(props);
  }

  get volume(): number {
    return (this.weight ?? 0) * this.duration;
  }
}

// ---------- Volume ----------

export type VolumeSetLike = {
  weight: number | null | undefined;
  reps: number | null | undefined;
};

export function setVolume({ weight, reps }: VolumeSetLike): number {
  if (weight == null || reps == null) return 0;
  return weight * reps;
}

// ---------- Suggested load (drop / cluster sets) ----------

/**
 * Rounds a kg value according to the user's weight preference. The rounding
 * increment is expressed in the athlete's unit (kg or lb), so the value is
 * converted into that unit, snapped to the increment, then converted back to kg
 * for storage. With no increment it only trims to two decimals.
 */
export function roundLoad(kgValue: number, weight: WeightPreference): number {
  if (weight.rounding == null) {
    return Math.round(kgValue * 100) / 100;
  }
  const inUnit = convertWeight(kgValue, 'kg', weight.unit);
  const snapped = Math.round(inUnit / weight.rounding) * weight.rounding;
  return Math.round(convertWeight(snapped, weight.unit, 'kg') * 100) / 100;
}

/**
 * Computes the load for a drop/cluster set as a percentage of its associated
 * normal set's load, rounded per the user's preference.
 */
export function computeLinkedLoad(
  baseKg: number,
  loadPercentOfPrevious: number,
  weight: WeightPreference,
): number {
  return roundLoad((baseKg * loadPercentOfPrevious) / 100, weight);
}

// ---------- Union ----------

export type WorkoutSet = RepsSet | TimeSet;

// ---------- Sequence validation ----------

export function getValidSetTypesAt<T extends { type: WorkoutSetType }>(
  sets: readonly T[],
  index: number,
): WorkoutSetType[] {
  return WORKOUT_SET_TYPES.filter((type) =>
    isValidSetSequence(sets.map((s, i) => (i === index ? { type } : { type: s.type }))),
  );
}

export function isValidSetSequence<T extends { type: WorkoutSetType }>(
  sets: readonly T[],
): boolean {
  let seenNonWarmup = false;

  for (const [i, { type }] of sets.entries()) {
    if (type === 'warmup') {
      if (seenNonWarmup) return false;
    } else {
      seenNonWarmup = true;
    }

    if (type === 'drop' || type === 'cluster') {
      const previous = sets[i - 1]?.type;
      if (previous !== 'normal' && previous !== type) return false;
    }
  }

  return true;
}

/**
 * Derives a 0-based round ordinal per set via the block rule: each normal/warmup
 * opens a new round; drop/cluster inherit the preceding set's round. Used as the
 * fallback when stored round_order is unavailable (legacy rows).
 */
export function deriveRoundOrders<T extends { type: WorkoutSetType }>(
  sets: readonly T[],
): number[] {
  let round = -1;
  return sets.map(({ type }) => {
    if (type !== 'drop' && type !== 'cluster') round += 1;
    return Math.max(round, 0);
  });
}
