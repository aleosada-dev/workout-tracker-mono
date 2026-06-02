import { observable } from '@legendapp/state';
import { ObservablePersistMMKV } from '@legendapp/state/persist-plugins/mmkv';
import { syncObservable } from '@legendapp/state/sync';
import type {
  ExerciseLastSetsResponse,
  ExerciseRecordsResponse,
} from '@/features/exercises/api/exercises';
import type {
  GetWorkoutLastLogResponse,
  GetWorkoutResponse,
} from '@/features/workouts/api/workouts';
import type { CompletedExecution } from '@/features/workouts/lib/completed-execution';
import type { ExecutionFormInput } from '@/features/workouts/lib/execution-form';

const persistPlugin = new ObservablePersistMMKV({ id: 'active-workout' });

export type ActiveWorkout = {
  startedAt: string;
  athleteId: string | null;
  athleteName: string | null;
  note: string | null;
  workoutTemplate: GetWorkoutResponse;
  workoutExecution: ExecutionFormInput;
  completedExecution: CompletedExecution | null;
  lastLog: GetWorkoutLastLogResponse;
  lastSets: ExerciseLastSetsResponse | null;
  records: ExerciseRecordsResponse | null;
};

export const activeWorkout$ = observable<ActiveWorkout | null>(null);

syncObservable(activeWorkout$, {
  persist: {
    name: 'activeWorkout',
    plugin: persistPlugin,
  },
});
