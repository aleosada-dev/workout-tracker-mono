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
      { key: 'weight', value: { unit: 'lb', rounding: 5 } },
      { key: 'count_warmup_sets', value: true },
      { key: 'auto_start_rest_timer', value: false },
    ]);

    expect(prefs).toEqual({
      defaultRestSeconds: 90,
      weight: { unit: 'lb', rounding: 5 },
      countWarmupSets: true,
      autoStartRestTimer: false,
    });
  });

  test('keeps the unit but drops a rounding increment invalid for that unit', () => {
    const prefs = parseStoredPreferences([{ key: 'weight', value: { unit: 'kg', rounding: 5 } }]);

    expect(prefs.weight).toEqual({ unit: 'kg', rounding: null });
  });

  test('accepts a null rounding (no rounding)', () => {
    const prefs = parseStoredPreferences([
      { key: 'weight', value: { unit: 'lb', rounding: null } },
    ]);

    expect(prefs.weight).toEqual({ unit: 'lb', rounding: null });
  });

  test('ignores a weight value with an invalid unit', () => {
    const prefs = parseStoredPreferences([
      { key: 'weight', value: { unit: 'oz', rounding: 1 } },
      { key: 'default_rest_seconds', value: 'fast' },
    ]);

    expect(prefs).toEqual(DEFAULT_USER_PREFERENCES);
  });
});

describe('preferencesPatchToStored', () => {
  test('maps present camelCase keys to snake_case, preserving null as reset', () => {
    expect(
      preferencesPatchToStored({
        defaultRestSeconds: null,
        weight: { unit: 'lb', rounding: 2.5 },
      }),
    ).toEqual({
      default_rest_seconds: null,
      weight: { unit: 'lb', rounding: 2.5 },
    });
  });

  test('omits keys that are absent from the patch', () => {
    expect(preferencesPatchToStored({ countWarmupSets: true })).toEqual({
      count_warmup_sets: true,
    });
  });
});
