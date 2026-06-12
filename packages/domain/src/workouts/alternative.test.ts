import { describe, expect, test } from '@jest/globals';
import { areAlternativeMeasurementTypesCompatible } from './alternative';

describe('areAlternativeMeasurementTypesCompatible', () => {
  test('identical measurement types are always compatible', () => {
    expect(areAlternativeMeasurementTypesCompatible('duration', 'duration')).toBe(true);
    expect(areAlternativeMeasurementTypesCompatible('distance', 'distance')).toBe(true);
    expect(areAlternativeMeasurementTypesCompatible('weight_reps', 'weight_reps')).toBe(true);
  });

  test('weight_reps and reps are mutually compatible', () => {
    expect(areAlternativeMeasurementTypesCompatible('weight_reps', 'reps')).toBe(true);
    expect(areAlternativeMeasurementTypesCompatible('reps', 'weight_reps')).toBe(true);
  });

  test('different measurement types are otherwise incompatible', () => {
    expect(areAlternativeMeasurementTypesCompatible('weight_reps', 'duration')).toBe(false);
    expect(areAlternativeMeasurementTypesCompatible('reps', 'distance')).toBe(false);
    expect(areAlternativeMeasurementTypesCompatible('duration', 'distance')).toBe(false);
    expect(areAlternativeMeasurementTypesCompatible('weight_duration', 'weight_reps')).toBe(false);
  });
});
