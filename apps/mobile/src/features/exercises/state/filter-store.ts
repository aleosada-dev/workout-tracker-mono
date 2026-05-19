import { observable } from '@legendapp/state';
import {
  EMPTY_EXERCISE_LIST_PARAMS,
  type ExerciseListParams,
} from '@/features/exercises/api/exercises';

export const exerciseFilters$ = observable<ExerciseListParams>(EMPTY_EXERCISE_LIST_PARAMS);

export function setExerciseFilters(next: ExerciseListParams) {
  exerciseFilters$.set(next);
}

export function resetExerciseFilters() {
  exerciseFilters$.set(EMPTY_EXERCISE_LIST_PARAMS);
}
