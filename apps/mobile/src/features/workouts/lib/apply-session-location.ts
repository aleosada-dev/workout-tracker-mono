import type { UseFormGetValues, UseFormSetValue } from 'react-hook-form';
import { activeWorkout$ } from '@/features/workouts/state/active-workout-store';
import {
  type ExecutionFormInput,
  matchExecutionSetsByLogicalKey,
  resolveLastBucketSets,
} from './execution-form';

type SessionLocationForm = {
  getValues: UseFormGetValues<ExecutionFormInput>;
  setValue: UseFormSetValue<ExecutionFormInput>;
};

/**
 * Grava o local da sessão no store, marca a escolha como resolvida e, quando o
 * local resolve uma única máquina para a variação, pré-seleciona esse alias e
 * re-semeia as cargas. "Sem local" (null) apenas registra a escolha.
 */
export function applySessionLocation(locationId: string | null, form: SessionLocationForm): void {
  activeWorkout$.selectedLocationId.set(locationId);
  activeWorkout$.locationChosen.set(true);
  if (locationId === null) return;

  const aliases = activeWorkout$.variationAliases.peek() ?? [];
  const lastSets = activeWorkout$.lastSets.peek();
  const exercises = form.getValues('exercises') ?? [];

  exercises.forEach((exercise, exerciseIndex) => {
    const candidates = aliases.filter(
      (alias) => alias.variationId === exercise.variation.id && alias.locationId === locationId,
    );
    // Só pré-seleciona quando o local resolve um único alias para a variação.
    if (candidates.length !== 1) return;
    const aliasId = candidates[0].id;
    form.setValue(`exercises.${exerciseIndex}.aliasId`, aliasId, { shouldDirty: true });

    const lastExercise = lastSets?.find((e) => e.variationId === exercise.variation.id);
    matchExecutionSetsByLogicalKey(
      exercise.sets,
      resolveLastBucketSets(lastExercise, aliasId),
    ).forEach((last, setIndex) => {
      form.setValue(`exercises.${exerciseIndex}.sets.${setIndex}.lastKg`, last.lastKg);
      form.setValue(`exercises.${exerciseIndex}.sets.${setIndex}.lastReps`, last.lastReps);
    });
  });
}
