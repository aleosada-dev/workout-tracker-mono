import { describe, expect, it, test } from 'bun:test';
import { convertWeight, displayWeight, kgToLb, lbToKg } from './weight-conversion';

describe('weight-conversion', () => {
  it('converts kg to lb', () => {
    expect(kgToLb(1)).toBeCloseTo(2.20462, 5);
    expect(kgToLb(100)).toBeCloseTo(220.462, 3);
  });

  it('converts lb to kg', () => {
    expect(lbToKg(1)).toBeCloseTo(0.45359, 5);
    expect(lbToKg(220.462)).toBeCloseTo(100, 3);
  });

  it('is reversible', () => {
    expect(lbToKg(kgToLb(42.5))).toBeCloseTo(42.5, 10);
  });

  it('returns the same value when units match', () => {
    expect(convertWeight(10, 'kg', 'kg')).toBe(10);
    expect(convertWeight(10, 'lb', 'lb')).toBe(10);
  });

  it('dispatches by unit', () => {
    expect(convertWeight(1, 'kg', 'lb')).toBeCloseTo(2.20462, 5);
    expect(convertWeight(1, 'lb', 'kg')).toBeCloseTo(0.45359, 5);
  });
});

describe('displayWeight', () => {
  test('returns kg unchanged', () => {
    expect(displayWeight(42.5, 'kg')).toBe(42.5);
  });

  test('converts kg to lb rounded to 2 decimals', () => {
    expect(displayWeight(100, 'lb')).toBe(220.46);
    expect(displayWeight(1, 'lb')).toBe(2.2);
  });

  test('is stable round-trip to 2 decimals', () => {
    expect(displayWeight(lbToKg(100), 'lb')).toBe(100);
  });
});
