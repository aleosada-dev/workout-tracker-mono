import { router } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import type { ActiveWorkoutSheetRef } from '@/features/workouts/components/ActiveWorkoutSheet';
import { activeWorkout$ } from '@/features/workouts/state/active-workout-store';

type StartParams = {
  workoutId: string;
  occurrenceId?: string | null;
  userId?: string | null;
  athleteName?: string | null;
};

export function useStartWorkout() {
  const sheetRef = useRef<ActiveWorkoutSheetRef>(null);
  const [pendingStart, setPendingStart] = useState<StartParams | null>(null);

  const navigate = useCallback((params: StartParams) => {
    router.push({
      pathname: '/(stacks)/(workouts)/workoutExecution',
      params: {
        workoutId: params.workoutId,
        ...(params.occurrenceId ? { occurrenceId: params.occurrenceId } : {}),
        ...(params.userId ? { userId: params.userId } : {}),
        ...(params.athleteName ? { athleteName: params.athleteName } : {}),
      },
    });
  }, []);

  const start = useCallback(
    (params: StartParams) => {
      if (activeWorkout$.peek()) {
        setPendingStart(params);
        sheetRef.current?.present();
        return;
      }
      navigate(params);
    },
    [navigate],
  );

  const confirmDiscard = useCallback(() => {
    if (!pendingStart) return;
    activeWorkout$.delete();
    setPendingStart(null);
    navigate(pendingStart);
  }, [pendingStart, navigate]);

  return { start, sheetRef, confirmDiscard };
}
