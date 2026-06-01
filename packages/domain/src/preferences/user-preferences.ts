import type { WeightUnit } from '../shared/weight-conversion';

export const PREFERENCE_KEYS = [
  'default_rest_seconds',
  'weight_unit',
  'count_warmup_sets',
  'auto_start_rest_timer',
] as const;

export type PreferenceKey = (typeof PREFERENCE_KEYS)[number];

export type UserPreferences = {
  defaultRestSeconds: number | null;
  weightUnit: WeightUnit;
  countWarmupSets: boolean;
  autoStartRestTimer: boolean;
};

export type PreferencesPatch = Partial<UserPreferences>;

export const DEFAULT_USER_PREFERENCES: UserPreferences = {
  defaultRestSeconds: null,
  weightUnit: 'kg',
  countWarmupSets: false,
  autoStartRestTimer: true,
};

export type StoredPreference = {
  key: string;
  value: unknown;
};

export function parseStoredPreferences(rows: StoredPreference[]): UserPreferences {
  const prefs: UserPreferences = { ...DEFAULT_USER_PREFERENCES };

  for (const { key, value } of rows) {
    switch (key) {
      case 'default_rest_seconds':
        if (typeof value === 'number') prefs.defaultRestSeconds = value;
        break;
      case 'weight_unit':
        if (value === 'kg' || value === 'lb') prefs.weightUnit = value;
        break;
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
  if ('weightUnit' in patch) stored.weight_unit = patch.weightUnit;
  if ('countWarmupSets' in patch) stored.count_warmup_sets = patch.countWarmupSets;
  if ('autoStartRestTimer' in patch) stored.auto_start_rest_timer = patch.autoStartRestTimer;

  return stored;
}
