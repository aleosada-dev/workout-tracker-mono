import { ptBR } from 'date-fns/locale';
import type { WorkoutLogSummary } from '@/workout-logs/api/workout-logs';
import { toCardProps } from '@/workout-logs/lib/format';

const REFERENCE = new Date('2026-05-09T15:00:00Z');

beforeAll(() => {
  jest.useFakeTimers().setSystemTime(REFERENCE);
});

afterAll(() => {
  jest.useRealTimers();
});

const MUSCLE_LABELS: Record<string, string> = {
  chest: 'Peito',
  triceps: 'Tríceps',
};

const fakeT = ((key: string, opts?: { count?: number; date?: string; time?: string }) => {
  if (key === 'workoutLogs.exerciseCount') {
    return opts?.count === 1 ? '1 exercício' : `${opts?.count ?? 0} exercícios`;
  }
  if (key === 'workoutLogs.untitled') {
    return 'Treino registrado';
  }
  if (key === 'common.dateAtTime') {
    return `${opts?.date ?? ''} às ${opts?.time ?? ''}`;
  }
  if (key.startsWith('muscles.')) {
    const slug = key.slice('muscles.'.length);
    return MUSCLE_LABELS[slug] ?? slug;
  }
  return key;
}) as unknown as (key: string, opts?: { count?: number; date?: string; time?: string }) => string;

describe('toCardProps', () => {
  const summary: WorkoutLogSummary = {
    id: 'a1',
    title: 'Treino A',
    startedAt: '2026-05-08T14:00:00Z',
    durationSeconds: 56 * 60,
    exerciseCount: 6,
    muscleGroupSlugs: ['chest', 'triceps'],
    prCount: 0,
  };

  test('maps fields, translates muscle slugs and computes hasRecord from prCount', () => {
    const props = toCardProps(summary, fakeT as never, ptBR);
    expect(props.title).toBe('Treino A');
    expect(props.muscleGroups).toEqual(['Peito', 'Tríceps']);
    expect(props.duration).toBe('56 minutos');
    expect(props.exerciseCount).toBe('6 exercícios');
    expect(props.hasRecord).toBe(false);
    expect(props.subtitle.charAt(0)).toBe(props.subtitle.charAt(0).toUpperCase());
  });

  test('hasRecord true when prCount > 0', () => {
    const props = toCardProps({ ...summary, prCount: 1 }, fakeT as never, ptBR);
    expect(props.hasRecord).toBe(true);
  });

  test('falls back to workoutLogs.untitled when title is null', () => {
    const props = toCardProps({ ...summary, title: null }, fakeT as never, ptBR);
    expect(props.title).toBe('Treino registrado');
  });
});
