import { EmptyState, RequestErrorState, Text } from '@workout-tracker/ui-mobile';
import { router } from 'expo-router';
import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, View } from 'react-native';
import { useReportRequestError } from '@/features/observability/hooks/use-report-request-error';
import { workoutObservability } from '@/features/observability/lib';
import type { WorkoutFolderResponse } from '@/features/workouts/api/workouts';
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
import { useWorkoutFolders } from '@/features/workouts/hooks/use-workout-folders';
import { useWorkouts } from '@/features/workouts/hooks/use-workouts';
import { resolveFolderColor } from '@/features/workouts/lib/folder-colors';
import { toWorkoutCardData } from '@/features/workouts/lib/workout-mappers';

export default function WorkoutListScreen() {
  const { t } = useTranslation();
  const {
    data: folders,
    isLoading: foldersLoading,
    isError: foldersError,
    error: foldersErrorObj,
    refetch: refetchFolders,
  } = useWorkoutFolders();
  const {
    data: workouts,
    isLoading: workoutsLoading,
    isError: workoutsError,
    error: workoutsErrorObj,
    refetch: refetchWorkouts,
  } = useWorkouts({ folderId: null });
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
                    params: { id: folder.id, name: folder.name, color: folder.color },
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
              <WorkoutCard key={workout.id} workout={toWorkoutCardData(workout, t)} />
            ))
          )}
        </View>
      </ScrollView>
      <WorkoutFolderFormSheet ref={folderFormSheetRef} />
    </View>
  );
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
