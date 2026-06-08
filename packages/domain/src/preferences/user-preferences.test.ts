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
      { key: 'load_rounding', value: '2.5' },
      { key: 'default_training_location_id', value: 'loc-1' },
    ]);

    expect(prefs).toEqual({
      defaultRestSeconds: 90,
      weightUnit: 'lb',
      countWarmupSets: true,
      autoStartRestTimer: false,
      loadRounding: '2.5',
      defaultTrainingLocationId: 'loc-1',
    });
  });

  test('ignores an invalid load_rounding mode', () => {
    const prefs = parseStoredPreferences([{ key: 'load_rounding', value: '3' }]);

    expect(prefs).toEqual(DEFAULT_USER_PREFERENCES);
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

  test('maps default training location, preserving null as reset', () => {
    expect(preferencesPatchToStored({ defaultTrainingLocationId: 'loc-1' })).toEqual({
      default_training_location_id: 'loc-1',
    });
    expect(preferencesPatchToStored({ defaultTrainingLocationId: null })).toEqual({
      default_training_location_id: null,
    });
  });
});
