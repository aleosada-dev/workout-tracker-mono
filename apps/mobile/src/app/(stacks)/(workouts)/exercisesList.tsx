import { FlashList } from '@shopify/flash-list';
import {
  Button,
  ConfirmDestructiveDialog,
  EmptyState,
  Input,
  Text,
} from '@workout-tracker/ui-mobile';
import { router, useFocusEffect } from 'expo-router';
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
import { useBulkDeleteExercises } from '@/features/exercises/hooks/use-bulk-delete-exercises';
import { useExercises } from '@/features/exercises/hooks/use-exercises';
import { toExercise } from '@/features/exercises/lib/format';
import { countActiveFilters } from '@/features/exercises/lib/list.helpers';
import type { ExerciseListItem } from '@/features/exercises/lib/list.types';
import { exerciseFilters$ } from '@/features/exercises/state/exercise-list-filter-store';
import { useReportRequestError } from '@/features/observability/hooks/use-report-request-error';
import { exerciseObservability } from '@/features/observability/lib';
import { handleLocalError } from '@/features/query/lib/error-handling';
import * as ScreenActions from '@/features/shared/components/ScreenActions';
import { normalizeString } from '@/features/shared/lib/utils';

type Mode = 'browse' | 'select';

export default function ExercisesListScreen() {
  const { t, i18n } = useTranslation();
  // The filter lives in a separate modal screen that writes to exerciseFilters$
  // while this list is hidden behind it. On Android, changing the FlashList data
  // in place while it's off-screen leaves the list blank until a manual scroll,
  // so re-read the filter when the screen regains focus and remount the
  // FlashList via `key` — a fresh mount measures correctly, an in-place swap
  // doesn't.
  const [filters, setFilters] = useState<ExerciseListParams>(() => exerciseFilters$.get());
  useFocusEffect(
    useCallback(() => {
      setFilters(exerciseFilters$.get());
    }, []),
  );
  const { data, isLoading, isError, error, refetch, dataUpdatedAt } = useExercises(filters);
  const activeFilterCount = countActiveFilters(filters);
  useReportRequestError({ isError, error }, exerciseObservability.captureError, {
    action: 'load_exercises',
  });

  // The filter is scoped to this screen — drop it when the list unmounts.
  useEffect(() => {
    return () => {
      exerciseFilters$.set(EMPTY_EXERCISE_LIST_PARAMS);
    };
  }, []);
  const exercises = useMemo<ExerciseListItem[]>(
    () =>
      (data ?? [])
        .flatMap((exercise) =>
          exercise.variations.map((variation) => toExercise(exercise, variation, i18n.language, t)),
        )
        .sort((a, b) => a.name.localeCompare(b.name, i18n.language, { sensitivity: 'base' })),
    [data, i18n.language, t],
  );

  const [mode, setMode] = useState<Mode>('browse');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState('');
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const { session } = useSession();
  const { mutate: bulkDelete } = useBulkDeleteExercises();

  const filteredExercises = useMemo(() => {
    const q = normalizeString(query.trim());
    if (!q) return exercises;
    return exercises.filter((e) => {
      if (normalizeString(e.name).includes(q)) return true;
      return e.variationName ? normalizeString(e.variationName).includes(q) : false;
    });
  }, [exercises, query]);

  const enterSelect = (id: string) => {
    setMode('select');
    setSelected(new Set([id]));
  };
  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const exitSelect = () => {
    setMode('browse');
    setSelected(new Set());
  };
  const selectAll = () => setSelected(new Set(filteredExercises.map((e) => e.id)));

  const handleDeletePress = () => {
    const currentUserId = session?.user.id;
    const selectedItems = exercises.filter((e) => selected.has(e.id));
    if (selectedItems.length === 0) return;
    const hasNonOwned =
      !currentUserId || selectedItems.some((e) => e.userId == null || e.userId !== currentUserId);
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

  const handleConfirmDelete = () => {
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
        setMode('browse');
        setSelected(new Set());
      },
      onError: handleLocalError((error) => {
        exerciseObservability.captureError(error, { action: 'bulk_delete_exercises' });
        Toast.show({
          type: 'error',
          text1: t('exerciseListScreen.bulkDelete.error.title'),
          text2: t('exerciseListScreen.bulkDelete.error.message'),
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

  if (isLoading) {
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

  if (isError && exercises.length === 0) {
    return (
      <View
        className="flex-1 items-center justify-center gap-4 bg-background p-6"
        testID="exercises-list.error"
      >
        <Text variant="muted">{t('exerciseListScreen.error.title')}</Text>
        <Button onPress={() => refetch()}>
          <Text>{t('exerciseListScreen.error.retry')}</Text>
        </Button>
      </View>
    );
  }

  const browseOverflow: ScreenActions.IconAction[] = [
    {
      iosIcon: 'checkmark.circle',
      androidIcon: 'checkmark-circle-outline',
      label: t('exerciseListScreen.actions.select'),
      onPress: () => setMode('select'),
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

  const browsePrimary: ScreenActions.IconAction = {
    iosIcon: 'plus.circle.fill',
    androidIcon: 'add',
    label: t('exerciseListScreen.actions.addExercise'),
    onPress: () => router.push('/exerciseForm'),
  };

  const selectionActions: ScreenActions.IconAction[] = [
    {
      iosIcon: 'trash',
      androidIcon: 'trash-outline',
      label: t('exerciseListScreen.actions.delete'),
      destructive: true,
      onPress: handleDeletePress,
    },
  ];

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
            query.trim() ? (
              <EmptyState
                title={t('exerciseListScreen.searchEmptyTitle')}
                subtitle={t('exerciseListScreen.searchEmptySubtitle')}
                testID="exercises-list.search-empty"
              />
            ) : (
              <EmptyState
                title={t('exerciseListScreen.emptyTitle')}
                subtitle={t('exerciseListScreen.emptySubtitle')}
                testID="exercises-list.empty"
              />
            )
          }
          ListFooterComponent={<View className="h-28" />}
        />
      </View>

      {mode === 'browse' && (
        <ScreenActions.ScreenActions primary={browsePrimary} overflow={browseOverflow} />
      )}
      {mode === 'select' && (
        <ScreenActions.SelectionActions
          count={selected.size}
          onCancel={exitSelect}
          onSelectAll={selectAll}
          actions={selectionActions}
        />
      )}

      <ConfirmDestructiveDialog
        open={confirmDeleteOpen}
        onOpenChange={setConfirmDeleteOpen}
        title={t('exerciseListScreen.bulkDelete.confirm.title')}
        description={t('exerciseListScreen.bulkDelete.confirm.message', { count: selected.size })}
        cancelLabel={t('exerciseListScreen.bulkDelete.confirm.cancel')}
        confirmLabel={t('exerciseListScreen.bulkDelete.confirm.confirm')}
        onConfirm={handleConfirmDelete}
        confirmTestID="exercises-list.bulk-delete.confirm"
      />
    </>
  );
}
