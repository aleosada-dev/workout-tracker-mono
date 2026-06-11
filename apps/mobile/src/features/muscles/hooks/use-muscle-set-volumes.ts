import { useWatch } from 'react-hook-form';
import { useMuscles } from '@/features/muscles/hooks/use-muscles';
import {
  buildMuscleSetVolumes,
  type MuscleSetVolume,
} from '@/features/muscles/lib/build-muscle-set-volumes';
import { useUserPreferences } from '@/features/preferences/hooks/use-user-preferences';
import type { BuilderExerciseInput } from '@/features/workouts/lib/builder-form';

export type UseMuscleSetVolumesResult = {
  volumes: MuscleSetVolume[];
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
};

/**
 * Lê os exercícios do form via `useWatch` (reativo sob o React Compiler) e
 * agrega a contagem de séries por músculo, respeitando a preferência
 * `countWarmupSets`. Deve ser chamado dentro de um `FormProvider`.
 */
export function useMuscleSetVolumes(): UseMuscleSetVolumesResult {
  const exercises = (useWatch({ name: 'exercises' }) ?? []) as BuilderExerciseInput[];
  const musclesQuery = useMuscles();
  const { data: preferences } = useUserPreferences();
  const includeWarmup = preferences?.countWarmupSets ?? false;

  const muscles = musclesQuery.data;
  const volumes = muscles
    ? buildMuscleSetVolumes(
        exercises.map((exercise) => ({
          primarySlug: exercise.variation.muscle.slug,
          secondarySlug: exercise.variation.secondaryMuscle?.slug ?? null,
          setCount: exercise.sets.filter((set) => includeWarmup || set.type !== 'warmup').length,
        })),
        muscles,
      )
    : [];

  return {
    volumes,
    isLoading: musclesQuery.isPending,
    isError: musclesQuery.isError,
    refetch: () => musclesQuery.refetch(),
  };
}
