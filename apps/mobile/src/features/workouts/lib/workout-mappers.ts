import type { WorkoutResponse } from '@/features/workouts/api/workouts';
import type { WorkoutCardData } from '@/features/workouts/components/WorkoutCard';

export function toWorkoutCardData(workout: WorkoutResponse): WorkoutCardData {
  return {
    id: workout.id,
    name: workout.name,
    exerciseCount: workout.exerciseCount,
    topExercises: workout.topExercises,
    lastPerformedAt: workout.lastPerformedAt,
  };
}
