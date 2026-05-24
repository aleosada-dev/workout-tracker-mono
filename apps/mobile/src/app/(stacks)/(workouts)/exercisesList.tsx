import { FlashList } from '@shopify/flash-list';
import { Button, ConfirmDialog, EmptyState, Input, Text } from '@workout-tracker/ui-mobile';
import { router, useFocusEffect } from 'expo-router';
import type { TFunction } from 'i18next';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, View } from 'react-native';
import Toast from 'react-native-toast-message';
import { useSession } from '@/features/auth/hooks/useSession';
import {
  EMPTY_EXERCISE_LIST_PARAMS,
  type ExerciseListParams,
} from '@/features/exercises/api/exercises';
import { ExerciseCard, ExerciseCardSkeleton } from '@/features/exercises/components/ExerciseCard';
import {
  BrowseToolbar,
  type IconAction,
  SelectionToolbar,
} from '@/features/exercises/components/ExercisesListToolbar';
import { useBulkCopyExercises } from '@/features/exercises/hooks/use-bulk-copy-exercises';
import { useBulkDeleteExercises } from '@/features/exercises/hooks/use-bulk-delete-exercises';
import { useExerciseSelection } from '@/features/exercises/hooks/use-exercise-selection';
import { useExercises } from '@/features/exercises/hooks/use-exercises';
import { toExercise } from '@/features/exercises/lib/format';
import { countActiveFilters } from '@/features/exercises/lib/list.helpers';
import type { ExerciseListItem } from '@/features/exercises/lib/list.types';
import { exerciseFilters$ } from '@/features/exercises/state/exercise-list-filter-store';
import { useReportRequestError } from '@/features/observability/hooks/use-report-request-error';
import { exerciseObservability } from '@/features/observability/lib';
import { handleLocalError } from '@/features/query/lib/error-handling';
import { normalizeString } from '@/features/shared/lib/utils';

export default function ExercisesListScreen() {
  const { t, i18n } = useTranslation();
  const { session } = useSession();
  const currentUserId = session?.user.id ?? null;

  const [filters, setFilters] = useState<ExerciseListParams>(() => exerciseFilters$.get());
  useFocusEffect(
    useCallback(() => {
      setFilters(exerciseFilters$.get());
    }, []),
  );

  // The filter is scoped to this screen — drop it when the list unmounts.
  useEffect(() => {
    return () => {
      exerciseFilters$.set(EMPTY_EXERCISE_LIST_PARAMS);
    };
  }, []);

  const { data, isLoading, isError, error, refetch, dataUpdatedAt } = useExercises(filters);
  useReportRequestError({ isError, error }, exerciseObservability.captureError, {
    action: 'load_exercises',
  });

  const exercises = useMemo<ExerciseListItem[]>(
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

  const [query, setQuery] = useState('');
  const filteredExercises = useMemo(() => {
    const q = normalizeString(query.trim());
    if (!q) return exercises;
    return exercises.filter(
      (e) =>
        normalizeString(e.name).includes(q) ||
        (e.variationName ? normalizeString(e.variationName).includes(q) : false),
    );
  }, [exercises, query]);

  const { mode, selected, allSelected, enterSelect, exitSelect, toggle, toggleSelectAll } =
    useExerciseSelection(filteredExercises.map((e) => e.id));

  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [confirmCopyOpen, setConfirmCopyOpen] = useState(false);
  const { mutate: bulkDelete } = useBulkDeleteExercises();
  const { mutate: bulkCopy } = useBulkCopyExercises();

  const requestDelete = () => {
    const items = exercises.filter((e) => selected.has(e.id));
    if (items.length === 0) return;
    const hasNonOwned =
      !currentUserId || items.some((e) => e.userId == null || e.userId !== currentUserId);
    if (hasNonOwned) {
      Toast.show({
        type: 'error',
        text1: t('exerciseListScreen.bulkDelete.onlyOwn.title'),
        text2: t('exerciseListScreen.bulkDelete.onlyOwn.message'),
      });
      return;
    }
    setConfirmDeleteOpen(true);
  };

  const confirmDelete = () => {
    setConfirmDeleteOpen(false);
    const ids = Array.from(selected);
    bulkDelete(ids, {
      onSuccess: () => {
        exerciseObservability.trackAction('exercises_bulk_deleted');
        Toast.show({
          type: 'success',
          text1: t('exerciseListScreen.bulkDelete.success.title'),
          text2: t('exerciseListScreen.bulkDelete.success.message', { count: ids.length }),
        });
        exitSelect();
      },
      onError: handleLocalError((err) => {
        exerciseObservability.captureError(err, { action: 'bulk_delete_exercises' });
        Toast.show({
          type: 'error',
          text1: t('exerciseListScreen.bulkDelete.error.title'),
          text2: t('exerciseListScreen.bulkDelete.error.message'),
        });
      }),
    });
  };

  const requestCopy = () => {
    const items = exercises.filter((e) => selected.has(e.id));
    if (items.length === 0) return;
    const hasOwned = items.some((e) => e.userId != null && e.userId === currentUserId);
    if (hasOwned) {
      Toast.show({
        type: 'error',
        text1: t('exerciseListScreen.bulkCopy.onlyPublicOrShared.title'),
        text2: t('exerciseListScreen.bulkCopy.onlyPublicOrShared.message'),
      });
      return;
    }
    setConfirmCopyOpen(true);
  };

  const confirmCopy = () => {
    setConfirmCopyOpen(false);
    const ids = Array.from(selected);
    bulkCopy(ids, {
      onSuccess: () => {
        exerciseObservability.trackAction('exercises_bulk_copied');
        Toast.show({
          type: 'success',
          text1: t('exerciseListScreen.bulkCopy.success.title'),
          text2: t('exerciseListScreen.bulkCopy.success.message', { count: ids.length }),
        });
        exitSelect();
      },
      onError: handleLocalError((err) => {
        exerciseObservability.captureError(err, { action: 'bulk_copy_exercises' });
        Toast.show({
          type: 'error',
          text1: t('exerciseListScreen.bulkCopy.error.title'),
          text2: t('exerciseListScreen.bulkCopy.error.message'),
        });
      }),
    });
  };

  // FlashList memoizes cells; bump this whenever selection state the cells read changes.
  const listExtraData = useMemo(() => ({ mode, selected }), [mode, selected]);
  // Remounts the FlashList when the applied filter changes OR when a refetch
  // brings fresh data (`dataUpdatedAt`). An in-place data swap while the list
  // is off-screen — e.g. behind the addExercise modal — doesn't render on
  // Android (FlashList 2.x, still unfixed as of 2.3.1), so forcing a fresh
  // mount is the only reliable way to surface a just-created exercise.
  const listKey = useMemo(
    () => `${JSON.stringify(filters)}:${dataUpdatedAt}`,
    [filters, dataUpdatedAt],
  );

  if (isLoading) return <ExercisesListLoading />;
  if (isError && exercises.length === 0) {
    return (
      <ExercisesListError
        onRetry={refetch}
        message={t('exerciseListScreen.error.title')}
        retryLabel={t('exerciseListScreen.error.retry')}
      />
    );
  }

  return (
    <>
      <View className="flex-1 bg-background" testID="exercises-list">
        <View className="px-4 pt-4 pb-3">
          <Input
            value={query}
            onChangeText={setQuery}
            placeholder={t('exerciseListScreen.searchPlaceholder')}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
            clearButtonMode="while-editing"
            testID="exercises-list.search"
          />
        </View>
        <FlashList
          key={listKey}
          data={filteredExercises}
          keyExtractor={(exercise) => exercise.id}
          renderItem={({ item }) => (
            <ExerciseCard
              exercise={item}
              selectable={mode === 'select'}
              selected={selected.has(item.id)}
              onPress={() => {
                if (mode === 'select') {
                  toggle(item.id);
                  return;
                }
                router.push({ pathname: '/exerciseDetail', params: { id: item.id } });
              }}
              onLongPress={() => {
                if (mode === 'browse') enterSelect(item.id);
              }}
            />
          )}
          extraData={listExtraData}
          ItemSeparatorComponent={() => <View className="h-3" />}
          contentContainerClassName="px-4 pb-4"
          contentInsetAdjustmentBehavior="automatic"
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            <EmptyState
              title={t(
                query.trim()
                  ? 'exerciseListScreen.searchEmptyTitle'
                  : 'exerciseListScreen.emptyTitle',
              )}
              subtitle={t(
                query.trim()
                  ? 'exerciseListScreen.searchEmptySubtitle'
                  : 'exerciseListScreen.emptySubtitle',
              )}
              testID={query.trim() ? 'exercises-list.search-empty' : 'exercises-list.empty'}
            />
          }
          ListFooterComponent={<View className="h-28" />}
        />
      </View>

      {mode === 'browse' ? (
        <BrowseToolbar
          primary={browsePrimary(t)}
          overflow={browseOverflow(t, countActiveFilters(filters), () => enterSelect())}
        />
      ) : (
        <SelectionToolbar
          count={selected.size}
          onCancel={exitSelect}
          allSelected={allSelected}
          onToggleSelectAll={toggleSelectAll}
          actions={selectionActions(t, requestCopy, requestDelete)}
        />
      )}

      <ConfirmDialog
        open={confirmDeleteOpen}
        onOpenChange={setConfirmDeleteOpen}
        title={t('exerciseListScreen.bulkDelete.confirm.title')}
        description={t('exerciseListScreen.bulkDelete.confirm.message', { count: selected.size })}
        cancelLabel={t('exerciseListScreen.bulkDelete.confirm.cancel')}
        confirmLabel={t('exerciseListScreen.bulkDelete.confirm.confirm')}
        onConfirm={confirmDelete}
        confirmTestID="exercises-list.bulk-delete.confirm"
      />

      <ConfirmDialog
        open={confirmCopyOpen}
        onOpenChange={setConfirmCopyOpen}
        destructive={false}
        title={t('exerciseListScreen.bulkCopy.confirm.title')}
        description={t('exerciseListScreen.bulkCopy.confirm.message', { count: selected.size })}
        cancelLabel={t('exerciseListScreen.bulkCopy.confirm.cancel')}
        confirmLabel={t('exerciseListScreen.bulkCopy.confirm.confirm')}
        onConfirm={confirmCopy}
        confirmTestID="exercises-list.bulk-copy.confirm"
      />
    </>
  );
}

function ExercisesListLoading() {
  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerClassName="p-4 gap-3"
      contentInsetAdjustmentBehavior="automatic"
      testID="exercises-list.loading"
    >
      <ExerciseCardSkeleton />
      <ExerciseCardSkeleton />
      <ExerciseCardSkeleton />
      <ExerciseCardSkeleton />
      <ExerciseCardSkeleton />
    </ScrollView>
  );
}

function ExercisesListError({
  onRetry,
  message,
  retryLabel,
}: {
  onRetry: () => void;
  message: string;
  retryLabel: string;
}) {
  return (
    <View
      className="flex-1 items-center justify-center gap-4 bg-background p-6"
      testID="exercises-list.error"
    >
      <Text variant="muted">{message}</Text>
      <Button onPress={onRetry}>
        <Text>{retryLabel}</Text>
      </Button>
    </View>
  );
}

function browsePrimary(t: TFunction): IconAction {
  return {
    iosIcon: 'plus.circle.fill',
    androidIcon: 'add',
    label: t('exerciseListScreen.actions.addExercise'),
    onPress: () => router.push('/exerciseForm'),
  };
}

function browseOverflow(
  t: TFunction,
  activeFilterCount: number,
  onSelectMode: () => void,
): IconAction[] {
  return [
    {
      iosIcon: 'checkmark.circle',
      androidIcon: 'checkmark-circle-outline',
      label: t('exerciseListScreen.actions.select'),
      onPress: onSelectMode,
    },
    {
      iosIcon: 'line.3.horizontal.decrease',
      androidIcon: 'filter',
      label:
        activeFilterCount > 0
          ? t('exerciseListScreen.actions.filterWithCount', { count: activeFilterCount })
          : t('exerciseListScreen.actions.filter'),
      onPress: () => router.push('/exercisesFilter'),
    },
  ];
}

function selectionActions(t: TFunction, onCopy: () => void, onDelete: () => void): IconAction[] {
  return [
    {
      iosIcon: 'doc.on.doc',
      androidIcon: 'copy-outline',
      label: t('exerciseListScreen.actions.copy'),
      onPress: onCopy,
    },
    {
      iosIcon: 'trash',
      androidIcon: 'trash-outline',
      label: t('exerciseListScreen.actions.delete'),
      destructive: true,
      onPress: onDelete,
    },
  ];
}
