import { formatVolume, formatWeightInUnit } from '@/features/shared/lib/utils/format-weight';

describe('formatWeightInUnit', () => {
  test('formats kg unchanged with the unit label', () => {
    expect(formatWeightInUnit(80.5, 'kg', 'en')).toBe('80.5 kg');
  });

  test('converts to lb rounded to 2 decimals', () => {
    expect(formatWeightInUnit(100, 'lb', 'en')).toBe('220.46 lb');
  });

  test('uses the locale decimal separator', () => {
    expect(formatWeightInUnit(80.5, 'kg', 'pt')).toBe('80,5 kg');
  });

  test('honors explicit fraction digits', () => {
    expect(formatWeightInUnit(100, 'kg', 'en', { min: 2, max: 2 })).toBe('100.00 kg');
  });
});

describe('formatVolume', () => {
  test('shows kilograms below a tonne', () => {
    expect(formatVolume(0, 'kg', 'en')).toBe('0 kg');
    expect(formatVolume(696, 'kg', 'en')).toBe('696 kg');
    expect(formatVolume(999, 'kg', 'en')).toBe('999 kg');
  });

  test('switches to tonnes at 1000 kg', () => {
    expect(formatVolume(1000, 'kg', 'en')).toBe('1 t');
    expect(formatVolume(2100, 'kg', 'en')).toBe('2.1 t');
  });

  test('uses the locale decimal separator for tonnes', () => {
    expect(formatVolume(2100, 'kg', 'pt')).toBe('2,1 t');
  });

  test('shows pounds and stays in lb below a short ton', () => {
    expect(formatVolume(100, 'lb', 'en')).toBe('220 lb');
    expect(formatVolume(900, 'lb', 'en')).toBe('1,984 lb');
  });

  test('switches to short tons at 2000 lb', () => {
    expect(formatVolume(1000, 'lb', 'en')).toBe('1.1 t');
  });
});
