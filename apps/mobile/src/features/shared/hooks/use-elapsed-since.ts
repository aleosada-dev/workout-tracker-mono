import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { elapsedSince } from '@/features/shared/lib/utils/dates';

type Elapsed = { hours: number; minutes: number; seconds: number };

export function useElapsedSince(startedAt: string | Date | null | undefined): Elapsed | null {
  const [value, setValue] = useState<Elapsed | null>(() =>
    startedAt ? elapsedSince(startedAt) : null,
  );

  useEffect(() => {
    if (!startedAt) {
      setValue(null);
      return;
    }
    const update = () => setValue(elapsedSince(startedAt));
    update();
    const id = setInterval(update, 1000);
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'active') update();
    });
    return () => {
      clearInterval(id);
      sub.remove();
    };
  }, [startedAt]);

  useFocusEffect(
    useCallback(() => {
      if (startedAt) setValue(elapsedSince(startedAt));
    }, [startedAt]),
  );

  return value;
}
