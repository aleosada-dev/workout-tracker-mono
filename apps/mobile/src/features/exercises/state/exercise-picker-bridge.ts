import { router } from 'expo-router';
import {
  EMPTY_EXERCISE_LIST_PARAMS,
  type ListExercisesResponseExercise,
  type ListExercisesResponseVariation,
} from '@/features/exercises/api/exercises';
import { exerciseFilters$ } from '@/features/exercises/state/exercise-list-filter-store';

export type PickedExercise = {
  exercise: ListExercisesResponseExercise;
  variation: ListExercisesResponseVariation;
};

type Handler = (picked: PickedExercise[]) => void;

const handlers = new Map<string, Handler>();
let nextId = 0;

function generateRequestId(): string {
  nextId += 1;
  return `picker-${nextId}`;
}

export const exercisePickerBridge = {
  register(handler: Handler): string {
    const id = generateRequestId();
    handlers.set(id, handler);
    return id;
  },
  resolve(id: string, picked: PickedExercise[]) {
    const handler = handlers.get(id);
    if (!handler) return;
    handlers.delete(id);
    handler(picked);
  },
  cancel(id: string) {
    handlers.delete(id);
  },
};

export function openExercisePicker(options: { onPick: Handler }): void {
  // Reset filters before the picker mounts so it reads a clean store from the
  // very first render — no mount-time effect, no double-render.
  exerciseFilters$.set(EMPTY_EXERCISE_LIST_PARAMS);
  const requestId = exercisePickerBridge.register(options.onPick);
  router.push({ pathname: '/exercisePicker', params: { requestId } });
}
