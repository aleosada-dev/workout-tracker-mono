import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useCountdownTimer } from '@/features/shared/hooks/use-countdown-timer';
import { formatTime } from '@/features/shared/lib/utils';

export const DEFAULT_DURATION = 60;

export type RestTimerController = {
  duration: number;
  totalMs: number;
  progress: number;
  label: string;
  remainingSeconds: number;
  isIdle: boolean;
  isActive: boolean;
  isRunning: boolean;
  isPaused: boolean;
  isFinished: boolean;
  start: () => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  skip: () => void;
  addSeconds: (delta: number) => void;
  setPreset: (seconds: number) => void;
  setDurationFromPicker: (seconds: number) => void;
  requestStart: (durationSeconds: number) => void;
};

export function useRestTimerController(): RestTimerController {
  const { t } = useTranslation();
  const [duration, setDuration] = useState(DEFAULT_DURATION);
  const [totalMs, setTotalMs] = useState(DEFAULT_DURATION * 1000);
  const [pendingAutoStart, setPendingAutoStart] = useState(false);

  const timer = useCountdownTimer({
    durationSeconds: duration,
    notification: {
      title: t('workoutExecutionScreen.timerSheet.notification.title'),
      body: t('workoutExecutionScreen.timerSheet.notification.body'),
    },
    onComplete: () => setTotalMs(duration * 1000),
  });

  const isIdle = !timer.isRunning && !timer.isPaused;
  const isActive = timer.isRunning || timer.isPaused;
  const remainingMs = timer.remainingSeconds * 1000;
  const progress = isIdle ? 1 : totalMs > 0 ? remainingMs / totalMs : 0;
  const label = formatTime(isIdle ? duration : timer.remainingSeconds);

  const setPreset = (seconds: number) => {
    setDuration(seconds);
    setTotalMs(seconds * 1000);
  };

  const setDurationFromPicker = (seconds: number) => {
    const safe = Math.max(1, seconds);
    setDuration(safe);
    setTotalMs(safe * 1000);
  };

  const start = () => {
    setTotalMs(duration * 1000);
    timer.start();
  };

  const stop = () => {
    timer.reset();
    setTotalMs(duration * 1000);
  };

  const addSeconds = (delta: number) => {
    timer.addSeconds(delta);
    setTotalMs((prev) => Math.max(0, prev + delta * 1000));
  };

  const requestStart = (durationSeconds: number) => {
    setDuration(durationSeconds);
    setTotalMs(durationSeconds * 1000);
    setPendingAutoStart(true);
  };

  useEffect(() => {
    if (!pendingAutoStart) return;
    setPendingAutoStart(false);
    setTotalMs(duration * 1000);
    timer.start();
  }, [pendingAutoStart, duration, timer.start]);

  return {
    duration,
    totalMs,
    progress,
    label,
    remainingSeconds: timer.remainingSeconds,
    isIdle,
    isActive,
    isRunning: timer.isRunning,
    isPaused: timer.isPaused,
    isFinished: timer.isFinished,
    start,
    pause: timer.pause,
    resume: timer.resume,
    stop,
    skip: timer.skip,
    addSeconds,
    setPreset,
    setDurationFromPicker,
    requestStart,
  };
}
