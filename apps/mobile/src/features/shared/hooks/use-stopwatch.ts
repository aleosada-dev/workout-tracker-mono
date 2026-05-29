import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

type Status = 'idle' | 'running' | 'paused';

export type UseStopwatchResult = {
  elapsedSeconds: number;
  isRunning: boolean;
  isPaused: boolean;
  isIdle: boolean;
  start: () => void;
  pause: () => void;
  resume: () => void;
  reset: () => void;
};

export function useStopwatch(): UseStopwatchResult {
  const [status, setStatus] = useState<Status>('idle');
  const [elapsedMs, setElapsedMs] = useState(0);

  const accumulatedRef = useRef(0);
  const startTimeRef = useRef<number | null>(null);
  const statusRef = useRef(status);
  statusRef.current = status;

  const syncFromClock = useCallback(() => {
    if (statusRef.current !== 'running') return;
    const startedAt = startTimeRef.current;
    if (startedAt == null) return;
    setElapsedMs(accumulatedRef.current + (Date.now() - startedAt));
  }, []);

  useEffect(() => {
    if (status !== 'running') return;
    const id = setInterval(syncFromClock, 250);
    return () => clearInterval(id);
  }, [status, syncFromClock]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (next) => {
      if (next === 'active') syncFromClock();
    });
    return () => subscription.remove();
  }, [syncFromClock]);

  const start = () => {
    accumulatedRef.current = 0;
    startTimeRef.current = Date.now();
    setElapsedMs(0);
    setStatus('running');
  };

  const pause = () => {
    if (statusRef.current !== 'running') return;
    const startedAt = startTimeRef.current ?? Date.now();
    accumulatedRef.current += Date.now() - startedAt;
    startTimeRef.current = null;
    setElapsedMs(accumulatedRef.current);
    setStatus('paused');
  };

  const resume = () => {
    if (statusRef.current !== 'paused') return;
    startTimeRef.current = Date.now();
    setStatus('running');
  };

  const reset = () => {
    accumulatedRef.current = 0;
    startTimeRef.current = null;
    setElapsedMs(0);
    setStatus('idle');
  };

  return {
    elapsedSeconds: Math.floor(elapsedMs / 1000),
    isRunning: status === 'running',
    isPaused: status === 'paused',
    isIdle: status === 'idle',
    start,
    pause,
    resume,
    reset,
  };
}
