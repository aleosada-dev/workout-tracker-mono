import { router } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import type { ActiveWorkoutSheetRef } from '@/features/workouts/components/ActiveWorkoutSheet';
import { activeWorkout$ } from '@/features/workouts/state/active-workout-store';

type StartParams = {
  workoutId: string;
  userId?: string | null;
  athleteName?: string | null;
};

export function useStartWorkout() {
  const sheetRef = useRef<ActiveWorkoutSheetRef>(null);
  const [pending, setPending] = useState<StartParams | null>(null);

  const navigate = useCallback((params: StartParams) => {
    router.push({
      pathname: '/(stacks)/(workouts)/workoutExecution',
      params: {
        workoutId: params.workoutId,
        ...(params.userId ? { userId: params.userId } : {}),
        ...(params.athleteName ? { athleteName: params.athleteName } : {}),
      },
    });
  }, []);

  const start = useCallback(
    (params: StartParams) => {
      if (activeWorkout$.peek()) {
        setPending(params);
        sheetRef.current?.present();
        return;
      }
      navigate(params);
    },
    [navigate],
  );

  const confirmDiscard = useCallback(() => {
    if (!pending) return;
    activeWorkout$.delete();
    setPending(null);
    navigate(pending);
  }, [pending, navigate]);

  return { start, sheetRef, confirmDiscard };
}
