import { describe, expect, test } from 'bun:test';
import {
  DEFAULT_USER_PREFERENCES,
  parseStoredPreferences,
  preferencesPatchToStored,
} from './user-preferences';

describe('parseStoredPreferences', () => {
  test('returns defaults when no rows are stored', () => {
    expect(parseStoredPreferences([])).toEqual(DEFAULT_USER_PREFERENCES);
  });

  test('fills only the stored keys, leaving the rest at default', () => {
    const prefs = parseStoredPreferences([{ key: 'count_warmup_sets', value: true }]);

    expect(prefs).toEqual({
      ...DEFAULT_USER_PREFERENCES,
      countWarmupSets: true,
    });
  });

  test('parses every preference key', () => {
    const prefs = parseStoredPreferences([
      { key: 'default_rest_seconds', value: 90 },
      { key: 'weight_unit', value: 'lb' },
      { key: 'count_warmup_sets', value: true },
      { key: 'auto_start_rest_timer', value: false },
    ]);

    expect(prefs).toEqual({
      defaultRestSeconds: 90,
      weightUnit: 'lb',
      countWarmupSets: true,
      autoStartRestTimer: false,
    });
  });

  test('ignores values with the wrong shape', () => {
    const prefs = parseStoredPreferences([
      { key: 'weight_unit', value: 'oz' },
      { key: 'default_rest_seconds', value: 'fast' },
    ]);

    expect(prefs).toEqual(DEFAULT_USER_PREFERENCES);
  });
});

describe('preferencesPatchToStored', () => {
  test('maps present camelCase keys to snake_case, preserving null as reset', () => {
    expect(preferencesPatchToStored({ defaultRestSeconds: null, weightUnit: 'lb' })).toEqual({
      default_rest_seconds: null,
      weight_unit: 'lb',
    });
  });

  test('omits keys that are absent from the patch', () => {
    expect(preferencesPatchToStored({ countWarmupSets: true })).toEqual({
      count_warmup_sets: true,
    });
  });
});
