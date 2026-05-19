import { enUS, ptBR } from 'date-fns/locale';
import {
  formatDateAtTime,
  formatDurationSeconds,
  formatRelativeDate,
} from '@/features/shared/lib/utils/dates';

const REFERENCE = new Date('2026-05-09T15:00:00Z');

beforeAll(() => {
  jest.useFakeTimers().setSystemTime(REFERENCE);
});

afterAll(() => {
  jest.useRealTimers();
});

const fakeT = ((key: string, opts?: { date?: string; time?: string }) => {
  if (key === 'common.dateAtTime') return `${opts?.date ?? ''} às ${opts?.time ?? ''}`;
  return key;
}) as unknown as (key: string, opts?: { date?: string; time?: string }) => string;

describe('formatRelativeDate', () => {
  test('returns capitalized relative for today (ptBR)', () => {
    const out = formatRelativeDate('2026-05-09T14:00:00Z', ptBR);
    expect(out).not.toBeNull();
    expect((out as string).charAt(0)).toBe((out as string).charAt(0).toUpperCase());
  });

  test('returns capitalized "ontem" for yesterday (ptBR)', () => {
    const out = formatRelativeDate('2026-05-08T14:00:00Z', ptBR);
    expect(out).not.toBeNull();
    expect((out as string).toLowerCase()).toContain('ontem');
    expect((out as string).charAt(0)).toBe((out as string).charAt(0).toUpperCase());
  });

  test('returns null for dates older than the default 6-day window', () => {
    expect(formatRelativeDate('2026-04-01T14:00:00Z', ptBR)).toBeNull();
  });

  test('returns null for future dates', () => {
    expect(formatRelativeDate('2026-06-01T14:00:00Z', ptBR)).toBeNull();
  });

  test('respects custom windowDays option', () => {
    expect(formatRelativeDate('2026-05-04T14:00:00Z', ptBR, { windowDays: 2 })).toBeNull();
  });

  test('renders in enUS when locale is en', () => {
    const out = formatRelativeDate('2026-05-08T14:00:00Z', enUS);
    expect((out as string).toLowerCase()).toContain('yesterday');
  });

  test('accepts a Date object as input', () => {
    const out = formatRelativeDate(new Date('2026-05-08T14:00:00Z'), ptBR);
    expect((out as string).toLowerCase()).toContain('ontem');
  });
});

describe('formatDateAtTime', () => {
  test('formats date and time using common.dateAtTime key (ptBR)', () => {
    const out = formatDateAtTime('2026-04-01T14:00:00Z', fakeT as never, ptBR);
    expect(out).toMatch(/\d{2}\/\d{2}\/\d{4} às \d{2}:\d{2}/);
  });

  test('accepts a Date object as input', () => {
    const out = formatDateAtTime(new Date('2026-04-01T14:00:00Z'), fakeT as never, ptBR);
    expect(out).toMatch(/\d{2}\/\d{2}\/\d{4} às \d{2}:\d{2}/);
  });
});

describe('formatDurationSeconds', () => {
  test('returns minutes-only for sub-hour durations (ptBR)', () => {
    expect(formatDurationSeconds(56 * 60, ptBR)).toBe('56 minutos');
  });

  test('returns hours and minutes for mixed durations (ptBR)', () => {
    expect(formatDurationSeconds(78 * 60, ptBR)).toBe('1 hora 18 minutos');
  });

  test('returns hours-only when minutes round to zero (ptBR)', () => {
    expect(formatDurationSeconds(3600, ptBR)).toBe('1 hora');
  });

  test('renders enUS', () => {
    expect(formatDurationSeconds(56 * 60, enUS)).toBe('56 minutes');
  });
});
