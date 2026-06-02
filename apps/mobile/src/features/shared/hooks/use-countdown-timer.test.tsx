import { act, renderHook } from '@testing-library/react-native';
import { AppState, type AppStateStatus } from 'react-native';
import {
  cancelTimerNotification,
  ensureNotificationPermission,
  scheduleTimerNotification,
} from '@/features/shared/lib/notifications';
import { type UseCountdownTimerResult, useCountdownTimer } from './use-countdown-timer';

jest.mock('@/features/shared/lib/notifications', () => ({
  ensureNotificationPermission: jest.fn(() => Promise.resolve(true)),
  scheduleTimerNotification: jest.fn(() => Promise.resolve('notif-id')),
  cancelTimerNotification: jest.fn(() => Promise.resolve()),
}));

const mockSchedule = jest.mocked(scheduleTimerNotification);
const mockCancel = jest.mocked(cancelTimerNotification);
const mockEnsurePermission = jest.mocked(ensureNotificationPermission);

let appStateChangeHandler: ((state: AppStateStatus) => void) | null = null;

/** Flush das microtasks pendentes (agendamento de notificação é assíncrono). */
async function flushPromises() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

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

describe('useCountdownTimer — contagem regressiva', () => {
  test('start mostra a duração cheia imediatamente', () => {
    const { result } = renderHook(() => useCountdownTimer({ durationSeconds: 5 }));
    expect(result.current.remainingSeconds).toBe(5);
    act(() => result.current.start());
    expect(result.current.remainingSeconds).toBe(5);
    expect(result.current.isRunning).toBe(true);
  });

  test('autoStart conta para baixo a cada segundo', () => {
    const { result } = renderHook(() => useCountdownTimer({ durationSeconds: 5, autoStart: true }));
    expect(result.current.remainingSeconds).toBe(5);
    act(() => jest.advanceTimersByTime(1000));
    expect(result.current.remainingSeconds).toBe(4);
    act(() => jest.advanceTimersByTime(2000));
    expect(result.current.remainingSeconds).toBe(2);
  });

  test('finaliza em foreground: dispara onComplete uma vez', () => {
    const onComplete = jest.fn();
    const { result } = renderHook(() =>
      useCountdownTimer({ durationSeconds: 3, autoStart: true, onComplete }),
    );
    act(() => jest.advanceTimersByTime(3000));
    expect(result.current.isFinished).toBe(true);
    expect(result.current.remainingSeconds).toBe(0);
    expect(onComplete).toHaveBeenCalledTimes(1);
  });
});

describe('useCountdownTimer — pause / resume', () => {
  test('pause congela e resume continua de onde parou', () => {
    const { result } = renderHook(() =>
      useCountdownTimer({ durationSeconds: 10, autoStart: true }),
    );
    act(() => jest.advanceTimersByTime(3000));
    expect(result.current.remainingSeconds).toBe(7);

    act(() => result.current.pause());
    expect(result.current.isPaused).toBe(true);
    act(() => jest.advanceTimersByTime(5000));
    expect(result.current.remainingSeconds).toBe(7);

    act(() => result.current.resume());
    expect(result.current.isRunning).toBe(true);
    act(() => jest.advanceTimersByTime(2000));
    expect(result.current.remainingSeconds).toBe(5);
  });
});

describe('useCountdownTimer — skip', () => {
  test('skip finaliza imediatamente e dispara onComplete', () => {
    const onComplete = jest.fn();
    const { result } = renderHook(() =>
      useCountdownTimer({ durationSeconds: 30, autoStart: true, onComplete }),
    );
    act(() => jest.advanceTimersByTime(2000));
    act(() => result.current.skip());
    expect(result.current.isFinished).toBe(true);
    expect(result.current.remainingSeconds).toBe(0);
    expect(onComplete).toHaveBeenCalledTimes(1);
  });
});

describe('useCountdownTimer — addSeconds', () => {
  test('n positivo estende a contagem em andamento', () => {
    const { result } = renderHook(() =>
      useCountdownTimer({ durationSeconds: 60, autoStart: true }),
    );
    act(() => jest.advanceTimersByTime(10_000));
    expect(result.current.remainingSeconds).toBe(50);
    act(() => result.current.addSeconds(15));
    expect(result.current.remainingSeconds).toBe(65);
  });

  test('n negativo remove tempo da contagem', () => {
    const { result } = renderHook(() =>
      useCountdownTimer({ durationSeconds: 60, autoStart: true }),
    );
    act(() => jest.advanceTimersByTime(10_000));
    act(() => result.current.addSeconds(-15));
    expect(result.current.remainingSeconds).toBe(35);
  });

  test('remover mais do que o restante finaliza a contagem', () => {
    const onComplete = jest.fn();
    const { result } = renderHook(() =>
      useCountdownTimer({ durationSeconds: 60, autoStart: true, onComplete }),
    );
    act(() => jest.advanceTimersByTime(10_000));
    act(() => result.current.addSeconds(-120));
    expect(result.current.isFinished).toBe(true);
    expect(onComplete).toHaveBeenCalledTimes(1);
  });
});

describe('useCountdownTimer — reset', () => {
  test('reset volta ao estado idle na duração inicial', () => {
    const { result } = renderHook(() =>
      useCountdownTimer({ durationSeconds: 20, autoStart: true }),
    );
    act(() => jest.advanceTimersByTime(8000));
    act(() => result.current.reset());
    expect(result.current.isRunning).toBe(false);
    expect(result.current.isFinished).toBe(false);
    expect(result.current.remainingSeconds).toBe(20);
  });
});

describe('useCountdownTimer — background', () => {
  test('mostra o tempo correto ao voltar do background', () => {
    const { result } = renderHook(() =>
      useCountdownTimer({ durationSeconds: 60, autoStart: true }),
    );
    // JS suspenso: o relógio avança mas os ticks do interval não disparam.
    jest.setSystemTime(Date.now() + 20_000);
    act(() => appStateChangeHandler?.('active'));
    expect(result.current.remainingSeconds).toBe(40);
  });

  test('expiração em background dispara onComplete uma única vez', () => {
    const onComplete = jest.fn();
    const { result } = renderHook(() =>
      useCountdownTimer({ durationSeconds: 10, autoStart: true, onComplete }),
    );
    jest.setSystemTime(Date.now() + 12_000);
    expect(onComplete).not.toHaveBeenCalled();

    act(() => appStateChangeHandler?.('active'));
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(result.current.isFinished).toBe(true);

    // Um segundo retorno ao foreground não re-dispara.
    act(() => appStateChangeHandler?.('active'));
    expect(onComplete).toHaveBeenCalledTimes(1);
  });
});

describe('useCountdownTimer — stale closure', () => {
  test('usa o onComplete mais recente', () => {
    const first = jest.fn();
    const second = jest.fn();
    const { result, rerender } = renderHook<UseCountdownTimerResult, { onComplete: () => void }>(
      ({ onComplete }) => useCountdownTimer({ durationSeconds: 3, onComplete }),
      { initialProps: { onComplete: first } },
    );
    act(() => result.current.start());
    rerender({ onComplete: second });
    act(() => jest.advanceTimersByTime(3000));
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });
});

describe('useCountdownTimer — notificação', () => {
  const notification = { title: 'Descanso terminou', body: 'Próxima série' };

  test('agenda a notificação local no start', async () => {
    const { result } = renderHook(() => useCountdownTimer({ durationSeconds: 30, notification }));
    act(() => result.current.start());
    await flushPromises();
    expect(mockEnsurePermission).toHaveBeenCalled();
    expect(mockSchedule).toHaveBeenCalledWith({
      title: notification.title,
      body: notification.body,
      date: expect.any(Date),
    });
  });

  test('cancela a notificação ao pausar', async () => {
    const { result } = renderHook(() => useCountdownTimer({ durationSeconds: 30, notification }));
    act(() => result.current.start());
    await flushPromises();
    act(() => result.current.pause());
    expect(mockCancel).toHaveBeenCalledWith('notif-id');
  });

  test('cancela a notificação ao desmontar', async () => {
    const { result, unmount } = renderHook(() =>
      useCountdownTimer({ durationSeconds: 30, notification }),
    );
    act(() => result.current.start());
    await flushPromises();
    unmount();
    expect(mockCancel).toHaveBeenCalledWith('notif-id');
  });

  test('não agenda notificação quando nenhuma config é passada', async () => {
    const { result } = renderHook(() => useCountdownTimer({ durationSeconds: 30 }));
    act(() => result.current.start());
    await flushPromises();
    expect(mockSchedule).not.toHaveBeenCalled();
  });

  test('agenda notificação só com som quando título e corpo são omitidos', async () => {
    const { result } = renderHook(() =>
      useCountdownTimer({ durationSeconds: 30, notification: {} }),
    );
    act(() => result.current.start());
    await flushPromises();
    expect(mockSchedule).toHaveBeenCalledWith({
      title: undefined,
      body: undefined,
      date: expect.any(Date),
    });
  });

  test('não cancela a notificação ao finalizar naturalmente — é ela quem toca o som', async () => {
    const { result } = renderHook(() => useCountdownTimer({ durationSeconds: 3, notification }));
    act(() => result.current.start());
    await flushPromises();
    mockCancel.mockClear();
    act(() => jest.advanceTimersByTime(3000));
    expect(result.current.isFinished).toBe(true);
    expect(mockCancel).not.toHaveBeenCalled();
  });

  test('cancela a notificação ao pular antes do fim', async () => {
    const { result } = renderHook(() => useCountdownTimer({ durationSeconds: 30, notification }));
    act(() => result.current.start());
    await flushPromises();
    mockCancel.mockClear();
    act(() => result.current.skip());
    expect(mockCancel).toHaveBeenCalledWith('notif-id');
  });
});
