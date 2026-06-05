import type { WeightUnit } from '../shared/weight-conversion';

/**
 * Load-rounding increments offered per weight unit. The increment is expressed
 * in the unit the athlete trains in — kg plates step differently from lb plates,
 * so a single kg-only ruler never made sense for lb users. `null` means "no
 * rounding".
 */
export const ROUNDING_INCREMENTS: Record<WeightUnit, readonly number[]> = {
  kg: [0.5, 1, 2.5],
  lb: [1.25, 2.5, 5],
};

export type WeightPreference = {
  unit: WeightUnit;
  /** Rounding increment expressed in `unit`; `null` means no rounding. */
  rounding: number | null;
};

export function isValidRounding(unit: WeightUnit, rounding: number | null): boolean {
  return rounding === null || ROUNDING_INCREMENTS[unit].includes(rounding);
}

export const DEFAULT_WEIGHT_PREFERENCE: WeightPreference = { unit: 'kg', rounding: null };

export const PREFERENCE_KEYS = [
  'default_rest_seconds',
  'weight',
  'count_warmup_sets',
  'auto_start_rest_timer',
] as const;

export type PreferenceKey = (typeof PREFERENCE_KEYS)[number];

export type UserPreferences = {
  defaultRestSeconds: number | null;
  weight: WeightPreference;
  countWarmupSets: boolean;
  autoStartRestTimer: boolean;
};

export type PreferencesPatch = Partial<UserPreferences>;

export const DEFAULT_USER_PREFERENCES: UserPreferences = {
  defaultRestSeconds: null,
  weight: DEFAULT_WEIGHT_PREFERENCE,
  countWarmupSets: false,
  autoStartRestTimer: true,
};

export type StoredPreference = {
  key: string;
  value: unknown;
};

/**
 * Parses a stored `weight` value. Returns `null` only when the unit is missing
 * or invalid; a valid unit with an invalid/absent rounding keeps the unit and
 * falls back to no rounding.
 */
export function parseWeightPreference(value: unknown): WeightPreference | null {
  if (typeof value !== 'object' || value === null) return null;
  const { unit, rounding } = value as Record<string, unknown>;
  if (unit !== 'kg' && unit !== 'lb') return null;
  if (typeof rounding === 'number' && isValidRounding(unit, rounding)) {
    return { unit, rounding };
  }
  return { unit, rounding: null };
}

export function parseStoredPreferences(rows: StoredPreference[]): UserPreferences {
  const prefs: UserPreferences = { ...DEFAULT_USER_PREFERENCES };

  for (const { key, value } of rows) {
    switch (key) {
      case 'default_rest_seconds':
        if (typeof value === 'number') prefs.defaultRestSeconds = value;
        break;
      case 'weight': {
        const weight = parseWeightPreference(value);
        if (weight) prefs.weight = weight;
        break;
      }
      case 'count_warmup_sets':
        if (typeof value === 'boolean') prefs.countWarmupSets = value;
        break;
      case 'auto_start_rest_timer':
        if (typeof value === 'boolean') prefs.autoStartRestTimer = value;
        break;
    }
  }

  return prefs;
}

export function preferencesPatchToStored(patch: PreferencesPatch): Record<string, unknown> {
  const stored: Record<string, unknown> = {};

  if ('defaultRestSeconds' in patch) stored.default_rest_seconds = patch.defaultRestSeconds;
  if ('weight' in patch) stored.weight = patch.weight;
  if ('countWarmupSets' in patch) stored.count_warmup_sets = patch.countWarmupSets;
  if ('autoStartRestTimer' in patch) stored.auto_start_rest_timer = patch.autoStartRestTimer;

  return stored;
}
