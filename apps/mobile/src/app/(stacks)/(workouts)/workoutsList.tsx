import { RequestErrorState, Text } from '@workout-tracker/ui-mobile';
import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, View } from 'react-native';
import { useReportRequestError } from '@/features/observability/hooks/use-report-request-error';
import { workoutObservability } from '@/features/observability/lib';
import type { WorkoutFolderResponse } from '@/features/workouts/api/workouts';
import { WorkoutCard, type WorkoutCardData } from '@/features/workouts/components/WorkoutCard';
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
import { resolveFolderColor } from '@/features/workouts/lib/folder-colors';

const MOCK_WORKOUTS: WorkoutCardData[] = [
  {
    id: '1',
    name: 'Lower 1',
    muscleGroups: ['Panturrilhas', 'Posterior de Coxa', 'Quadríceps'],
    exerciseCount: 6,
  },
  {
    id: '2',
    name: 'Upper 1',
    muscleGroups: ['Peito', 'Tríceps', 'Ombros'],
    exerciseCount: 7,
  },
  {
    id: '3',
    name: 'Lower 2',
    muscleGroups: ['Glúteos', 'Posterior de Coxa', 'Panturrilhas'],
    exerciseCount: 5,
  },
];

export default function WorkoutListScreen() {
  const { t } = useTranslation();
  const { data: folders, isLoading, isError, error, refetch } = useWorkoutFolders();
  const folderFormSheetRef = useRef<WorkoutFolderFormSheetRef>(null);
  useReportRequestError({ isError, error }, workoutObservability.captureError, {
    action: 'load_workout_folders',
  });

  if (isError && !folders) {
    return (
      <RequestErrorState
        title={t('workoutsScreen.error.title')}
        subtitle={t('workoutsScreen.error.subtitle')}
        retry={{ label: t('workoutsScreen.error.retry'), onPress: refetch }}
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
          {isLoading ? (
            <WorkoutFoldersLoading />
          ) : (
            folders?.map((folder) => (
              <WorkoutFolderItem key={folder.id} folder={toFolderViewModel(folder)} />
            ))
          )}
          <AddWorkoutFolderItem
            label={t('workoutsScreen.newFolder')}
            onPress={() => folderFormSheetRef.current?.present()}
          />
        </ScrollView>

        <Text variant="h5" className="mt-4">
          Treinos
        </Text>
        <View className="gap-3 py-4">
          {MOCK_WORKOUTS.map((workout) => (
            <WorkoutCard key={workout.id} workout={workout} />
          ))}
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
