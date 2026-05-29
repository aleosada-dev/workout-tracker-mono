import { greaterThan, greaterThanOrNull, nonNegativeInteger } from '../shared/numbers';
import { ValidationError, type ValidationIssue } from '../shared/validation-error';

export const WORKOUT_SET_TYPES = ['warmup', 'normal', 'drop', 'cluster'] as const;
export type WorkoutSetType = (typeof WORKOUT_SET_TYPES)[number];

export const WEIGHT_METRICS = ['libra', 'kg'] as const;
export type WeightMetric = (typeof WEIGHT_METRICS)[number];

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
