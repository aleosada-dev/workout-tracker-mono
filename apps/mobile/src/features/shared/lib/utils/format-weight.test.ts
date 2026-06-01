import { formatWeight } from '@/features/shared/lib/utils/format-weight';

describe('formatWeight', () => {
  test('shows kilograms below a tonne', () => {
    expect(formatWeight(0, 'en')).toBe('0 kg');
    expect(formatWeight(696, 'en')).toBe('696 kg');
    expect(formatWeight(999, 'en')).toBe('999 kg');
  });

  test('rounds kilograms to whole numbers', () => {
    expect(formatWeight(696.4, 'en')).toBe('696 kg');
  });

  test('switches to tonnes at 1000 kg', () => {
    expect(formatWeight(1000, 'en')).toBe('1 t');
    expect(formatWeight(2100, 'en')).toBe('2.1 t');
  });

  test('uses the locale decimal separator for tonnes', () => {
    expect(formatWeight(2100, 'pt')).toBe('2,1 t');
  });
});
