import { act, renderHook } from '@testing-library/react-native';
import { AppState, type AppStateStatus } from 'react-native';

jest.mock('expo-router', () => ({
  useFocusEffect: jest.fn(),
}));

import { useElapsedSince } from './use-elapsed-since';

let appStateChangeHandler: ((state: AppStateStatus) => void) | null = null;

beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date('2026-05-21T10:00:00Z'));
  appStateChangeHandler = null;
  jest.spyOn(AppState, 'addEventListener').mockImplementation((type, handler) => {
    if (type === 'change') {
      appStateChangeHandler = handler as (state: AppStateStatus) => void;
    }
    return { remove: jest.fn() };
  });
});

afterEach(() => {
  jest.clearAllMocks();
  jest.useRealTimers();
});

describe('useElapsedSince', () => {
  test('retorna null quando startedAt é nulo', () => {
    const { result } = renderHook(() => useElapsedSince(null));
    expect(result.current).toBeNull();
  });

  test('calcula horas, minutos e segundos no render inicial', () => {
    const startedAt = new Date('2026-05-21T08:30:15Z').toISOString();
    const { result } = renderHook(() => useElapsedSince(startedAt));
    expect(result.current).toEqual({ hours: 1, minutes: 29, seconds: 45 });
  });

  test('atualiza a cada segundo', () => {
    const startedAt = new Date('2026-05-21T09:59:58Z').toISOString();
    const { result } = renderHook(() => useElapsedSince(startedAt));
    expect(result.current).toEqual({ hours: 0, minutes: 0, seconds: 2 });

    act(() => {
      jest.advanceTimersByTime(1_000);
    });
    expect(result.current).toEqual({ hours: 0, minutes: 0, seconds: 3 });

    act(() => {
      jest.advanceTimersByTime(60_000);
    });
    expect(result.current).toEqual({ hours: 0, minutes: 1, seconds: 3 });
  });

  test('recalcula imediatamente ao voltar do background', () => {
    const startedAt = new Date('2026-05-21T09:50:00Z').toISOString();
    const { result } = renderHook(() => useElapsedSince(startedAt));
    expect(result.current).toEqual({ hours: 0, minutes: 10, seconds: 0 });

    act(() => {
      jest.setSystemTime(new Date('2026-05-21T10:15:00Z'));
      appStateChangeHandler?.('active');
    });
    expect(result.current).toEqual({ hours: 0, minutes: 25, seconds: 0 });
  });

  test('reflete novo startedAt', () => {
    const { result, rerender } = renderHook(
      ({ startedAt }: { startedAt: string | null }) => useElapsedSince(startedAt),
      { initialProps: { startedAt: new Date('2026-05-21T09:00:00Z').toISOString() } },
    );
    expect(result.current).toEqual({ hours: 1, minutes: 0, seconds: 0 });

    rerender({ startedAt: new Date('2026-05-21T09:45:00Z').toISOString() });
    expect(result.current).toEqual({ hours: 0, minutes: 15, seconds: 0 });
  });
});
