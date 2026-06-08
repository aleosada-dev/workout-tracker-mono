import type { WeightUnit } from '../shared/weight-conversion';

export const LOAD_ROUNDING_MODES = ['none', '0.5', '1', '2.5'] as const;
export type LoadRoundingMode = (typeof LOAD_ROUNDING_MODES)[number];

export function isLoadRoundingMode(value: unknown): value is LoadRoundingMode {
  return LOAD_ROUNDING_MODES.includes(value as LoadRoundingMode);
}

export const PREFERENCE_KEYS = [
  'default_rest_seconds',
  'weight_unit',
  'count_warmup_sets',
  'auto_start_rest_timer',
  'load_rounding',
  'default_training_location_id',
] as const;

export type PreferenceKey = (typeof PREFERENCE_KEYS)[number];

export type UserPreferences = {
  defaultRestSeconds: number | null;
  weightUnit: WeightUnit;
  countWarmupSets: boolean;
  autoStartRestTimer: boolean;
  loadRounding: LoadRoundingMode;
  defaultTrainingLocationId: string | null;
};

export type PreferencesPatch = Partial<UserPreferences>;

export const DEFAULT_USER_PREFERENCES: UserPreferences = {
  defaultRestSeconds: null,
  weightUnit: 'kg',
  countWarmupSets: false,
  autoStartRestTimer: true,
  loadRounding: 'none',
  defaultTrainingLocationId: null,
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
      case 'load_rounding':
        if (isLoadRoundingMode(value)) prefs.loadRounding = value;
        break;
      case 'default_training_location_id':
        if (typeof value === 'string') prefs.defaultTrainingLocationId = value;
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
  if ('loadRounding' in patch) stored.load_rounding = patch.loadRounding;
  if ('defaultTrainingLocationId' in patch)
    stored.default_training_location_id = patch.defaultTrainingLocationId;

  return stored;
}
