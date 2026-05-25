import type { WorkoutResponse } from '@/features/workouts/api/workouts';
import type { WorkoutCardData } from '@/features/workouts/components/WorkoutCard';

type Translate = (key: string, opts?: { defaultValue?: string }) => string;

export function toWorkoutCardData(workout: WorkoutResponse, t: Translate): WorkoutCardData {
  return {
    id: workout.id,
    name: workout.name,
    exerciseCount: workout.exerciseCount,
    muscleGroups: workout.muscleSlugs.map((slug) => t(`muscles.${slug}`, { defaultValue: slug })),
  };
}
