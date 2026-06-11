import {
  type ExerciseMeasurementType,
  isSupersetMeasurementType,
  type WorkoutExerciseType,
} from '@workout-tracker/domain';
import * as Crypto from 'expo-crypto';
import type { RefObject } from 'react';
import { useTranslation } from 'react-i18next';
import { workoutObservability } from '@/features/observability/lib';
import type { IconAction } from '@/features/shared/components/SelectionToolbar';
import { impactLight, notifySuccess } from '@/features/shared/lib/haptics';
import type { SupersetReorderSheetRef } from '@/features/workouts/components/SupersetReorderSheet';
import type { useWorkoutSelection } from '@/features/workouts/hooks/use-workout-selection';
import {
  combineIntoSuperset,
  type ExecutionListItem,
  type MappableExercise,
  reorderExercisesWithinType,
  reorderSupersetMembers,
  ungroupSuperset,
} from '@/features/workouts/lib/workout-mappers';

type EditableExercise = MappableExercise & {
  variation: { measurementType: ExerciseMeasurementType };
};

type Selection = ReturnType<typeof useWorkoutSelection>;

/**
 * Edição da lista de exercícios compartilhada entre execução e builder:
 * seleção múltipla (combinar superset, desagrupar, reordenar membros, excluir)
 * e reordenação/exclusão via gestos. Opera sobre o array `exercises` do form
 * através de `getExercises`/`setExercises`, sem conhecer o shape dos sets.
 */
export function useExerciseListEditing<T extends EditableExercise>({
  items,
  exercises,
  selection,
  getExercises,
  setExercises,
  reorderSheetRef,
}: {
  items: ExecutionListItem[];
  exercises: readonly T[];
  selection: Selection;
  getExercises: () => T[];
  setExercises: (next: T[]) => void;
  reorderSheetRef: RefObject<SupersetReorderSheetRef | null>;
}) {
  const { t } = useTranslation();

  const handleDeleteExercises = (exerciseIndexes: number[]) => {
    const drop = new Set(exerciseIndexes);
    const next = getExercises()
      .filter((_, i) => !drop.has(i))
      .map((exercise, i) => ({ ...exercise, position: i }));
    setExercises(next);
  };

  const handleReorder = (type: WorkoutExerciseType, orderedItemIds: string[]) => {
    setExercises(reorderExercisesWithinType(getExercises(), type, orderedItemIds));
  };

  const orderedSelectedItems = [...selection.selected]
    .map((id) => items.find((item) => item.id === id))
    .filter((item): item is ExecutionListItem => item != null);
  const memberCount = (item: ExecutionListItem) =>
    item.kind === 'superset' ? item.members.length : 1;
  const totalMembers = orderedSelectedItems.reduce((sum, item) => sum + memberCount(item), 0);
  const supersetsSelected = orderedSelectedItems.filter((item) => item.kind === 'superset');
  const itemMemberIndexes = (item: ExecutionListItem) =>
    item.kind === 'superset' ? item.members.map((m) => m.exerciseIndex) : [item.exerciseIndex];
  const allMembersCombinable = orderedSelectedItems.flatMap(itemMemberIndexes).every((index) => {
    const measurementType = exercises[index]?.variation.measurementType;
    return measurementType != null && isSupersetMeasurementType(measurementType);
  });
  const canCombine =
    orderedSelectedItems.length >= 2 &&
    totalMembers >= 2 &&
    totalMembers <= 3 &&
    supersetsSelected.length <= 1 &&
    allMembersCombinable;
  const singleSupersetSelected =
    orderedSelectedItems.length === 1 && orderedSelectedItems[0]?.kind === 'superset';

  const itemExerciseIds = (item: ExecutionListItem, current: readonly T[]) =>
    (item.kind === 'superset'
      ? item.members.map((m) => current[m.exerciseIndex]?.id)
      : [current[item.exerciseIndex]?.id]
    ).filter((id): id is string => id != null);

  const handleLongPressItem = (id: string) => {
    impactLight();
    selection.enterSelect(id);
  };

  const handleCombine = () => {
    const current = getExercises();
    const orderedIds = orderedSelectedItems.flatMap((item) => itemExerciseIds(item, current));
    if (orderedIds.length < 2 || orderedIds.length > 3 || !allMembersCombinable) return;
    setExercises(combineIntoSuperset(current, orderedIds, Crypto.randomUUID()));
    notifySuccess();
    workoutObservability.trackAction('superset_created', { members: orderedIds.length });
    selection.exitSelect();
  };

  const handleUngroup = () => {
    const item = orderedSelectedItems[0];
    if (!item || item.kind !== 'superset') return;
    setExercises(ungroupSuperset(getExercises(), item.id));
    workoutObservability.trackAction('superset_ungrouped');
    selection.exitSelect();
  };

  const handleOpenReorder = () => {
    const item = orderedSelectedItems[0];
    if (!item || item.kind !== 'superset') return;
    reorderSheetRef.current?.present(item.members, (orderedExerciseIndexes) => {
      const current = getExercises();
      const orderedIds = orderedExerciseIndexes
        .map((index) => current[index]?.id)
        .filter((id): id is string => id != null);
      setExercises(reorderSupersetMembers(current, orderedIds));
      workoutObservability.trackAction('superset_reordered');
      selection.exitSelect();
    });
  };

  const handleDeleteSelected = () => {
    const indexes = orderedSelectedItems.flatMap(itemMemberIndexes);
    handleDeleteExercises(indexes);
    selection.exitSelect();
  };

  const selectionActions: IconAction[] = singleSupersetSelected
    ? [
        {
          androidIcon: 'swap-vertical',
          iosIcon: 'arrow.up.arrow.down',
          label: t('workoutExecutionScreen.selection.reorder'),
          onPress: handleOpenReorder,
        },
        {
          androidIcon: 'unlink',
          iosIcon: 'scissors',
          label: t('workoutExecutionScreen.selection.ungroup'),
          onPress: handleUngroup,
        },
        {
          androidIcon: 'trash-outline',
          iosIcon: 'trash',
          label: t('workoutExecutionScreen.selection.delete'),
          onPress: handleDeleteSelected,
          destructive: true,
        },
      ]
    : [
        {
          androidIcon: 'link',
          iosIcon: 'link',
          label: t('workoutExecutionScreen.selection.combine'),
          onPress: handleCombine,
          disabled: !canCombine,
        },
        {
          androidIcon: 'trash-outline',
          iosIcon: 'trash',
          label: t('workoutExecutionScreen.selection.delete'),
          onPress: handleDeleteSelected,
          destructive: true,
        },
      ];

  return {
    handleDeleteExercises,
    handleReorder,
    handleLongPressItem,
    selectionActions,
  };
}
