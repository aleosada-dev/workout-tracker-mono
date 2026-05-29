import { observable } from '@legendapp/state';
import { ObservablePersistMMKV } from '@legendapp/state/persist-plugins/mmkv';
import { syncObservable } from '@legendapp/state/sync';
import type { GetWorkoutResponse } from '@/features/workouts/api/workouts';
import type { ExecutionFormInput } from '@/features/workouts/lib/execution-form';

const persistPlugin = new ObservablePersistMMKV({ id: 'active-workout' });

export type ActiveWorkout = {
  startedAt: string;
  athleteName: string | null;
  workout_template: GetWorkoutResponse;
  workout_execution: ExecutionFormInput;
};

export const activeWorkout$ = observable<ActiveWorkout | null>(null);

syncObservable(activeWorkout$, {
  persist: {
    name: 'activeWorkout',
    plugin: persistPlugin,
  },
});
