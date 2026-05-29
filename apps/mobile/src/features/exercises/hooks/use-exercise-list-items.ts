import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useSession } from '@/features/auth/hooks/useSession';
import type { ExerciseListParams } from '@/features/exercises/api/exercises';
import { useExercises } from '@/features/exercises/hooks/use-exercises';
import { toExercise } from '@/features/exercises/lib/format';
import type { ExerciseListItem } from '@/features/exercises/lib/list.types';
import type { PickedExercise } from '@/features/exercises/state/exercise-picker-bridge';
import { normalizeString } from '@/features/shared/lib/utils';

type Options = {
  filters: ExerciseListParams;
  query: string;
};

export function useExerciseListItems({ filters, query }: Options) {
  const { t, i18n } = useTranslation();
  const { session } = useSession();
  const currentUserId = session?.user.id ?? null;

  const exercisesQuery = useExercises(filters);
  const { data } = exercisesQuery;

  const items = useMemo<ExerciseListItem[]>(
    () =>
      (data ?? [])
        .flatMap((exercise) =>
          exercise.variations.map((variation) =>
            toExercise(exercise, variation, i18n.language, t, currentUserId),
          ),
        )
        .sort((a, b) => a.name.localeCompare(b.name, i18n.language, { sensitivity: 'base' })),
    [data, i18n.language, t, currentUserId],
  );

  const sourceByVariationId = useMemo<Map<string, PickedExercise>>(() => {
    const map = new Map<string, PickedExercise>();
    for (const exercise of data ?? []) {
      for (const variation of exercise.variations) {
        map.set(variation.id, { exercise, variation });
      }
    }
    return map;
  }, [data]);

  const filteredItems = useMemo(() => {
    const q = normalizeString(query.trim());
    if (!q) return items;
    return items.filter(
      (e) =>
        normalizeString(e.name).includes(q) ||
        (e.variationName ? normalizeString(e.variationName).includes(q) : false),
    );
  }, [items, query]);

  return {
    ...exercisesQuery,
    items,
    filteredItems,
    sourceByVariationId,
    currentUserId,
  };
}
