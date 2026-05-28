import { observable } from '@legendapp/state';
import { ObservablePersistMMKV } from '@legendapp/state/persist-plugins/mmkv';
import { syncObservable } from '@legendapp/state/sync';
import type { GetWorkoutResponse } from '@/features/workouts/api/workouts';

const persistPlugin = new ObservablePersistMMKV({ id: 'active-workout' });

export type ActiveWorkout = {
  startedAt: string;
  workout: GetWorkoutResponse;
};

export const activeWorkout$ = observable<ActiveWorkout | null>(null);

syncObservable(activeWorkout$, {
  persist: {
    name: 'activeWorkout',
    plugin: persistPlugin,
  },
});
