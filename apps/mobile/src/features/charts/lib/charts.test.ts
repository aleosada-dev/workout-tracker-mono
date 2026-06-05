import { formatMetricTick, niceYAxis } from '@/features/charts/lib/charts';

describe('niceYAxis', () => {
  test('starts the domain at 0 and never repeats a tick value', () => {
    for (const values of [
      [8, 8, 8],
      [3],
      [10, 11, 12],
      [216, 225, 270],
      [0.5, 0.7],
      [1234, 5678],
    ]) {
      const { domain, ticks } = niceYAxis(values);
      expect(domain[0]).toBe(0);
      expect(new Set(ticks).size).toBe(ticks.length);
    }
  });

  test('covers the data range', () => {
    const { domain, ticks } = niceYAxis([216, 225, 234, 270]);
    expect(domain[1]).toBeGreaterThanOrEqual(270);
    expect(ticks[0]).toBe(0);
    expect(ticks[ticks.length - 1]).toBe(domain[1]);
  });

  test('uses a step of 2 for a flat series at 8 (matches the design mock)', () => {
    expect(niceYAxis([8, 8, 8, 8])).toEqual({ domain: [0, 8], ticks: [0, 2, 4, 6, 8] });
  });

  test('uses integer steps for a small count series', () => {
    expect(niceYAxis([3, 3, 3])).toEqual({ domain: [0, 3], ticks: [0, 1, 2, 3] });
  });

  test('falls back to [0, 1] when there is no positive data', () => {
    expect(niceYAxis([])).toEqual({ domain: [0, 1], ticks: [0, 1] });
    expect(niceYAxis([0, 0])).toEqual({ domain: [0, 1], ticks: [0, 1] });
  });
});

describe('formatMetricTick', () => {
  test('appends the unit symbol for weight metrics (value already in unit)', () => {
    expect(formatMetricTick('maxWeight', 8, 'kg', 'pt')).toBe('8 kg');
    expect(formatMetricTick('volume', 270, 'kg', 'pt')).toBe('270 kg');
    expect(formatMetricTick('maxWeight', 220, 'lb', 'en')).toBe('220 lb');
  });

  test('renders a bare integer for rep/count metrics', () => {
    expect(formatMetricTick('maxReps', 12, 'kg', 'pt')).toBe('12');
    expect(formatMetricTick('sets', 3, 'kg', 'pt')).toBe('3');
  });
});
