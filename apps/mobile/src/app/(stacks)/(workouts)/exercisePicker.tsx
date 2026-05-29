import { useValue } from '@legendapp/state/react';
import { FlashList } from '@shopify/flash-list';
import { Button, EmptyState, Text } from '@workout-tracker/ui-mobile';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import type { TFunction } from 'i18next';
import { Funnel } from 'lucide-react-native';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, View } from 'react-native';
import { EMPTY_EXERCISE_LIST_PARAMS } from '@/features/exercises/api/exercises';
import { ExerciseCard, ExerciseCardSkeleton } from '@/features/exercises/components/ExerciseCard';
import { ExerciseSearchField } from '@/features/exercises/components/ExerciseSearchField';
import type { IconAction } from '@/features/exercises/components/ExercisesListToolbar';
import { PickerBrowseToolbar } from '@/features/exercises/components/PickerBrowseToolbar';
import { PickerSelectionToolbar } from '@/features/exercises/components/PickerSelectionToolbar';
import { useExerciseListItems } from '@/features/exercises/hooks/use-exercise-list-items';
import { useExerciseSelection } from '@/features/exercises/hooks/use-exercise-selection';
import { countActiveFilters } from '@/features/exercises/lib/list.helpers';
import { exerciseFilters$ } from '@/features/exercises/state/exercise-list-filter-store';
import {
  exercisePickerBridge,
  type PickedExercise,
} from '@/features/exercises/state/exercise-picker-bridge';
import { useReportRequestError } from '@/features/observability/hooks/use-report-request-error';
import { exerciseObservability } from '@/features/observability/lib';

export default function ExercisePickerScreen() {
  const { t } = useTranslation();
  const { requestId } = useLocalSearchParams<{ requestId?: string }>();

  const filters = useValue(exerciseFilters$);
  useEffect(() => {
    return () => {
      exerciseFilters$.set(EMPTY_EXERCISE_LIST_PARAMS);
    };
  }, []);

  const [query, setQuery] = useState('');
  const {
    items: exercises,
    filteredItems: filteredExercises,
    sourceByVariationId,
    data,
    isLoading,
    isError,
    error,
    refetch,
    dataUpdatedAt,
  } = useExerciseListItems({ filters, query });

  useReportRequestError({ isError, error }, exerciseObservability.captureError, {
    action: 'load_exercises_for_picker',
  });

  const { mode, selected, allSelected, enterSelect, exitSelect, toggle, toggleSelectAll } =
    useExerciseSelection(filteredExercises.map((e) => e.id));

  // Cancel the bridge handler if the user dismisses the modal without picking.
  const resolvedRef = useRef(false);
  useEffect(() => {
    return () => {
      if (!resolvedRef.current && requestId) {
        exercisePickerBridge.cancel(requestId);
      }
    };
  }, [requestId]);

  const finishPick = (variationIds: string[]) => {
    const picked: PickedExercise[] = [];
    for (const id of variationIds) {
      const source = sourceByVariationId.get(id);
      if (source) picked.push(source);
    }
    if (!requestId || picked.length === 0) {
      router.back();
      return;
    }
    resolvedRef.current = true;
    exercisePickerBridge.resolve(requestId, picked);
    exerciseObservability.trackAction('exercises_picked', { count: picked.length });
    router.back();
  };

  const handleConfirmSelection = () => {
    finishPick(Array.from(selected));
  };

  const listExtraData = useMemo(() => ({ mode, selected }), [mode, selected]);
  const listKey = useMemo(
    () => `${JSON.stringify(filters)}:${dataUpdatedAt}`,
    [filters, dataUpdatedAt],
  );

  // `useSession` is per-component and yields `session=null` on the first tick,
  // which leaves the query disabled and `isLoading=false`. Without the `!data`
  // guard the FlashList would briefly render its empty state on mount.
  if (isLoading || (!data && !isError))
    return <ExercisePickerLoading title={t('exerciseListScreen.picker.title')} />;
  if (isError && exercises.length === 0) {
    return (
      <ExercisePickerError
        title={t('exerciseListScreen.picker.title')}
        onRetry={refetch}
        message={t('exerciseListScreen.error.title')}
        retryLabel={t('exerciseListScreen.error.retry')}
      />
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: t('exerciseListScreen.picker.title') }} />
      <View className="flex-1 bg-background" testID="exercise-picker">
        <ExerciseSearchField
          value={query}
          onChangeText={setQuery}
          testID="exercise-picker.search"
        />
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
                finishPick([item.id]);
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
              testID={query.trim() ? 'exercise-picker.search-empty' : 'exercise-picker.empty'}
            />
          }
          ListFooterComponent={<View className="h-28" />}
        />
      </View>

      {mode === 'browse' ? (
        <PickerBrowseToolbar
          headerAction={browseFilterAction(t, countActiveFilters(filters))}
          onCreateExercise={() => router.push('/exerciseForm')}
          onCreateSuperset={() => {
            exerciseObservability.trackAction('exercise_picker_create_superset');
          }}
        />
      ) : (
        <PickerSelectionToolbar
          count={selected.size}
          onCancel={exitSelect}
          allSelected={allSelected}
          onToggleSelectAll={toggleSelectAll}
          primary={{
            iosIcon: 'plus.circle.fill',
            androidIcon: 'add',
            label: t('exerciseListScreen.actions.addToWorkout'),
            onPress: handleConfirmSelection,
          }}
        />
      )}
    </>
  );
}

function ExercisePickerLoading({ title }: { title: string }) {
  return (
    <>
      <Stack.Screen options={{ title }} />
      <ScrollView
        className="flex-1 bg-background"
        contentContainerClassName="p-4 gap-3"
        contentInsetAdjustmentBehavior="automatic"
        testID="exercise-picker.loading"
      >
        <ExerciseCardSkeleton />
        <ExerciseCardSkeleton />
        <ExerciseCardSkeleton />
        <ExerciseCardSkeleton />
        <ExerciseCardSkeleton />
      </ScrollView>
    </>
  );
}

function ExercisePickerError({
  title,
  onRetry,
  message,
  retryLabel,
}: {
  title: string;
  onRetry: () => void;
  message: string;
  retryLabel: string;
}) {
  return (
    <>
      <Stack.Screen options={{ title }} />
      <View
        className="flex-1 items-center justify-center gap-4 bg-background p-6"
        testID="exercise-picker.error"
      >
        <Text variant="muted">{message}</Text>
        <Button onPress={onRetry}>
          <Text>{retryLabel}</Text>
        </Button>
      </View>
    </>
  );
}

function browseFilterAction(t: TFunction, activeFilterCount: number): IconAction {
  return {
    iosIcon: 'line.3.horizontal.decrease',
    androidIcon: 'funnel-outline',
    lucideIcon: Funnel,
    badge: activeFilterCount,
    label:
      activeFilterCount > 0
        ? t('exerciseListScreen.actions.filterWithCount', { count: activeFilterCount })
        : t('exerciseListScreen.actions.filter'),
    onPress: () => router.push('/exercisesFilter'),
  };
}
