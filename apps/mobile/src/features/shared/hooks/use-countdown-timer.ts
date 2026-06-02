import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import {
  cancelTimerNotification,
  ensureNotificationPermission,
  scheduleTimerNotification,
} from '@/features/shared/lib/notifications';

export type CountdownNotificationConfig = {
  /** Título (já traduzido). Opcional — omita para uma notificação só com som/vibração. */
  title?: string;
  /** Mensagem (já traduzida). Opcional. */
  body?: string;
};

export type UseCountdownTimerOptions = {
  durationSeconds: number;
  /** Disparado exatamente uma vez quando a contagem chega a zero (ou no `skip`). */
  onComplete?: () => void;
  /** Quando presente (mesmo `{}`), agenda uma notificação local para o fim em background. */
  notification?: CountdownNotificationConfig;
  autoStart?: boolean;
};

export type UseCountdownTimerResult = {
  remainingSeconds: number;
  isRunning: boolean;
  isPaused: boolean;
  isFinished: boolean;
  start: () => void;
  pause: () => void;
  resume: () => void;
  reset: () => void;
  skip: () => void;
  addSeconds: (n: number) => void;
};

type Status = 'idle' | 'running' | 'paused' | 'finished';

export function useCountdownTimer({
  durationSeconds,
  onComplete,
  notification,
  autoStart = false,
}: UseCountdownTimerOptions): UseCountdownTimerResult {
  const [status, setStatus] = useState<Status>('idle');
  const [remainingMs, setRemainingMs] = useState(() => durationSeconds * 1000);

  // Fonte da verdade da contagem — refs evitam stale closures nos callbacks/efeitos.
  const targetTimeRef = useRef<number | null>(null);
  const pausedRemainingMsRef = useRef<number | null>(null);
  const completionFiredRef = useRef(false);

  // Estado da notificação agendada. O "epoch" invalida operações assíncronas
  // (agendamento) que foram superadas por um cancelamento/reagendamento — ex.: o
  // usuário pausa enquanto o diálogo de permissão ainda está aberto.
  const notificationIdRef = useRef<string | null>(null);
  const notificationEpochRef = useRef(0);
  const permissionGrantedRef = useRef<boolean | null>(null);

  // Refs espelhando valores mutáveis a cada render.
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;
  const notificationRef = useRef(notification);
  notificationRef.current = notification;
  const durationRef = useRef(durationSeconds);
  durationRef.current = durationSeconds;
  const statusRef = useRef(status);
  statusRef.current = status;

  const cancelNotification = useCallback(() => {
    // Invalida qualquer agendamento assíncrono em voo.
    notificationEpochRef.current += 1;
    const id = notificationIdRef.current;
    notificationIdRef.current = null;
    if (id) void cancelTimerNotification(id);
  }, []);

  const scheduleNotification = useCallback(
    (targetTime: number) => {
      // Cancela o agendamento anterior e invalida agendamentos em voo.
      cancelNotification();
      const config = notificationRef.current;
      if (!config) return;
      const epoch = notificationEpochRef.current;
      void (async () => {
        if (permissionGrantedRef.current === null) {
          permissionGrantedRef.current = await ensureNotificationPermission();
        }
        // Superado durante o diálogo de permissão.
        if (notificationEpochRef.current !== epoch) return;
        if (!permissionGrantedRef.current) return;
        const id = await scheduleTimerNotification({
          title: config.title,
          body: config.body,
          date: new Date(targetTime),
        });
        // Superado durante o agendamento — desfaz o que acabou de ser criado.
        if (notificationEpochRef.current !== epoch) {
          if (id) void cancelTimerNotification(id);
          return;
        }
        notificationIdRef.current = id;
      })();
    },
    [cancelNotification],
  );

  // `cancelPending` controla o destino da notificação agendada. No fim natural
  // (`syncFromClock`) deixamos a notificação do SO disparar — é ela quem toca o
  // som; cancelá-la aqui correria com a entrega no foreground. Em encerramentos
  // antecipados (skip, remover além do restante) cancelamos para não disparar
  // uma notificação futura indevida.
  const handleFinish = useCallback(
    (cancelPending = true) => {
      if (completionFiredRef.current) return;
      completionFiredRef.current = true;
      targetTimeRef.current = null;
      pausedRemainingMsRef.current = null;
      if (cancelPending) cancelNotification();
      setRemainingMs(0);
      setStatus('finished');
      onCompleteRef.current?.();
    },
    [cancelNotification],
  );

  // Recalcula o restante a partir do relógio. Usado pelo intervalo de 1s e ao
  // voltar do background.
  const syncFromClock = useCallback(() => {
    if (statusRef.current !== 'running') return;
    const target = targetTimeRef.current;
    if (target == null) return;
    const left = target - Date.now();
    if (left <= 0) handleFinish(false);
    else setRemainingMs(left);
  }, [handleFinish]);

  const start = useCallback(() => {
    completionFiredRef.current = false;
    pausedRemainingMsRef.current = null;
    const durationMs = durationRef.current * 1000;
    const target = Date.now() + durationMs;
    targetTimeRef.current = target;
    scheduleNotification(target);
    setRemainingMs(durationMs);
    setStatus('running');
  }, [scheduleNotification]);

  const pause = useCallback(() => {
    if (statusRef.current !== 'running') return;
    const target = targetTimeRef.current;
    if (target == null) return;
    const left = Math.max(0, target - Date.now());
    pausedRemainingMsRef.current = left;
    targetTimeRef.current = null;
    cancelNotification();
    setRemainingMs(left);
    setStatus('paused');
  }, [cancelNotification]);

  const resume = useCallback(() => {
    if (statusRef.current !== 'paused') return;
    const left = pausedRemainingMsRef.current ?? 0;
    if (left <= 0) {
      handleFinish();
      return;
    }
    const target = Date.now() + left;
    targetTimeRef.current = target;
    pausedRemainingMsRef.current = null;
    scheduleNotification(target);
    setStatus('running');
  }, [scheduleNotification, handleFinish]);

  const reset = useCallback(() => {
    completionFiredRef.current = false;
    targetTimeRef.current = null;
    pausedRemainingMsRef.current = null;
    cancelNotification();
    setRemainingMs(durationRef.current * 1000);
    setStatus('idle');
  }, [cancelNotification]);

  const skip = useCallback(() => {
    const current = statusRef.current;
    if (current !== 'running' && current !== 'paused') return;
    handleFinish();
  }, [handleFinish]);

  const addSeconds = useCallback(
    (n: number) => {
      const deltaMs = n * 1000;
      const current = statusRef.current;
      if (current === 'running') {
        const target = targetTimeRef.current;
        if (target == null) return;
        const newTarget = target + deltaMs;
        if (newTarget - Date.now() <= 0) {
          // Remover além do restante zera o tempo — finaliza normalmente.
          handleFinish();
          return;
        }
        targetTimeRef.current = newTarget;
        scheduleNotification(newTarget);
        setRemainingMs(newTarget - Date.now());
      } else if (current === 'paused') {
        const left = Math.max(0, (pausedRemainingMsRef.current ?? 0) + deltaMs);
        pausedRemainingMsRef.current = left;
        setRemainingMs(left);
      }
    },
    [scheduleNotification, handleFinish],
  );

  // Intervalo de 1s — só dispara a atualização da UI enquanto está rodando.
  useEffect(() => {
    if (status !== 'running') return;
    const id = setInterval(syncFromClock, 1000);
    return () => clearInterval(id);
  }, [status, syncFromClock]);

  // Ao voltar para foreground, recalcula na hora — o intervalo ficou parado
  // enquanto o app esteve suspenso.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (next) => {
      if (next === 'active') syncFromClock();
    });
    return () => subscription.remove();
  }, [syncFromClock]);

  // Inicia automaticamente uma única vez quando `autoStart` for verdadeiro.
  const hasAutoStartedRef = useRef(false);
  useEffect(() => {
    if (autoStart && !hasAutoStartedRef.current) {
      hasAutoStartedRef.current = true;
      start();
    }
  }, [autoStart, start]);

  // Cancela qualquer notificação pendente ao desmontar.
  useEffect(() => cancelNotification, [cancelNotification]);

  return {
    remainingSeconds: Math.max(0, Math.ceil(remainingMs / 1000)),
    isRunning: status === 'running',
    isPaused: status === 'paused',
    isFinished: status === 'finished',
    start,
    pause,
    resume,
    reset,
    skip,
    addSeconds,
  };
}
