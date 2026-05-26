import { EmptyState, RequestErrorState, Text } from '@workout-tracker/ui-mobile';
import { router, Stack } from 'expo-router';
import type { TFunction } from 'i18next';
import { useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, View } from 'react-native';
import { useCoachAthletes } from '@/features/coaches/hooks/use-coach-athletes';
import { useReportRequestError } from '@/features/observability/hooks/use-report-request-error';
import { workoutObservability } from '@/features/observability/lib';
import { useProfile } from '@/features/profiles/hooks/use-profile';
import type { WorkoutFolderResponse } from '@/features/workouts/api/workouts';
import { AthleteContextSelect } from '@/features/workouts/components/AthleteContextSelect';
import { WorkoutCard, WorkoutsLoading } from '@/features/workouts/components/WorkoutCard';
import {
  WorkoutFolderFormSheet,
  type WorkoutFolderFormSheetRef,
} from '@/features/workouts/components/WorkoutFolderFormSheet';
import {
  AddWorkoutFolderItem,
  WorkoutFolderItem,
  WorkoutFolderItemSkeleton,
} from '@/features/workouts/components/WorkoutFolderItem';
import {
  type IconAction,
  SelectionToolbar,
} from '@/features/workouts/components/WorkoutsListToolbar';
import { useWorkoutFolders } from '@/features/workouts/hooks/use-workout-folders';
import { useWorkoutSelection } from '@/features/workouts/hooks/use-workout-selection';
import { useWorkouts } from '@/features/workouts/hooks/use-workouts';
import { resolveFolderColor } from '@/features/workouts/lib/folder-colors';
import { toWorkoutCardData } from '@/features/workouts/lib/workout-mappers';

export default function WorkoutListScreen() {
  const { t } = useTranslation();
  const [selectedAthleteId, setSelectedAthleteId] = useState<string | null>(null);
  const { data: profile } = useProfile();
  const isCoach = profile?.role === 'coach';
  const { data: athletes } = useCoachAthletes({ enabled: isCoach });
  const showAthleteSelect = isCoach && (athletes?.length ?? 0) >= 1;
  const queryUserId = showAthleteSelect ? selectedAthleteId : null;
  const {
    data: folders,
    isLoading: foldersLoading,
    isError: foldersError,
    error: foldersErrorObj,
    refetch: refetchFolders,
  } = useWorkoutFolders({ userId: queryUserId });
  const {
    data: workouts,
    isLoading: workoutsLoading,
    isError: workoutsError,
    error: workoutsErrorObj,
    refetch: refetchWorkouts,
  } = useWorkouts({ folderId: null, userId: queryUserId });
  const folderFormSheetRef = useRef<WorkoutFolderFormSheetRef>(null);
  useReportRequestError(
    { isError: foldersError, error: foldersErrorObj },
    workoutObservability.captureError,
    { action: 'load_workout_folders' },
  );
  useReportRequestError(
    { isError: workoutsError, error: workoutsErrorObj },
    workoutObservability.captureError,
    { action: 'load_workouts' },
  );

  const workoutIds = useMemo(() => workouts?.map((w) => w.id) ?? [], [workouts]);
  const { mode, selected, allSelected, enterSelect, exitSelect, toggle, toggleSelectAll } =
    useWorkoutSelection(workoutIds);

  if (foldersError && !folders) {
    return (
      <RequestErrorState
        title={t('workoutsScreen.error.title')}
        subtitle={t('workoutsScreen.error.subtitle')}
        retry={{ label: t('workoutsScreen.error.retry'), onPress: refetchFolders }}
        testID="workouts-list.error"
      />
    );
  }

  return (
    <View className="flex-1 bg-background">
      <ScrollView contentContainerClassName="p-4 pb-8">
        {showAthleteSelect && (
          <View className="pb-4">
            <AthleteContextSelect
              athletes={athletes ?? []}
              selectedAthleteId={selectedAthleteId}
              onChange={setSelectedAthleteId}
            />
          </View>
        )}
        <Text variant="h5">{t('workoutsScreen.folders')}</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerClassName="gap-4 py-4"
        >
          {foldersLoading ? (
            <WorkoutFoldersLoading />
          ) : (
            folders?.map((folder: WorkoutFolderResponse) => (
              <WorkoutFolderItem
                key={folder.id}
                folder={toFolderViewModel(folder)}
                onPress={() =>
                  router.push({
                    pathname: '/(stacks)/(workouts)/workoutFolderDetail',
                    params: {
                      id: folder.id,
                      name: folder.name,
                      color: folder.color,
                      ...(queryUserId ? { userId: queryUserId } : {}),
                    },
                  })
                }
              />
            ))
          )}
          <AddWorkoutFolderItem
            label={t('workoutsScreen.newFolder')}
            onPress={() => folderFormSheetRef.current?.present()}
          />
        </ScrollView>

        <Text variant="h5" className="mt-4">
          {t('workoutsScreen.workouts')}
        </Text>
        <View className="gap-3 py-4">
          {workoutsLoading ? (
            <WorkoutsLoading />
          ) : workoutsError && !workouts ? (
            <RequestErrorState
              title={t('workoutsScreen.error.title')}
              subtitle={t('workoutsScreen.error.subtitle')}
              retry={{ label: t('workoutsScreen.error.retry'), onPress: refetchWorkouts }}
              testID="workouts-list.workouts-error"
            />
          ) : workouts && workouts.length === 0 ? (
            <EmptyState
              title={t('workoutsScreen.emptyTitle')}
              subtitle={t('workoutsScreen.emptySubtitle')}
              testID="workouts-list.empty"
            />
          ) : (
            workouts?.map((workout) => (
              <WorkoutCard
                key={workout.id}
                workout={toWorkoutCardData(workout)}
                selectable={mode === 'select'}
                selected={selected.has(workout.id)}
                onPress={() => {
                  if (mode === 'select') toggle(workout.id);
                }}
                onLongPress={() => {
                  if (mode === 'browse') enterSelect(workout.id);
                }}
              />
            ))
          )}
        </View>
      </ScrollView>
      {mode === 'select' ? (
        <SelectionToolbar
          count={selected.size}
          onCancel={exitSelect}
          allSelected={allSelected}
          onToggleSelectAll={toggleSelectAll}
          actions={workoutSelectionActions(t)}
        />
      ) : (
        <Stack.Screen options={{ headerLeft: undefined, headerRight: undefined }} />
      )}
      <WorkoutFolderFormSheet ref={folderFormSheetRef} userId={queryUserId} />
    </View>
  );
}

function workoutSelectionActions(t: TFunction): IconAction[] {
  return [
    {
      iosIcon: 'square.and.arrow.up',
      androidIcon: 'share-outline',
      label: t('workoutsScreen.actions.share'),
      onPress: () => {},
    },
    {
      iosIcon: 'folder',
      androidIcon: 'folder-outline',
      label: t('workoutsScreen.actions.move'),
      onPress: () => {},
    },
    {
      iosIcon: 'trash',
      androidIcon: 'trash-outline',
      label: t('workoutsScreen.actions.delete'),
      destructive: true,
      onPress: () => {},
    },
  ];
}

function WorkoutFoldersLoading() {
  return (
    <>
      <WorkoutFolderItemSkeleton />
      <WorkoutFolderItemSkeleton />
      <WorkoutFolderItemSkeleton />
      <WorkoutFolderItemSkeleton />
    </>
  );
}

function toFolderViewModel(folder: WorkoutFolderResponse) {
  const { color, iconColor } = resolveFolderColor(folder.color);
  return {
    id: folder.id,
    name: folder.name,
    workoutCount: folder.workoutCount,
    color,
    iconColor,
  };
}
