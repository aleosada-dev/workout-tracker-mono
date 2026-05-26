import { EmptyState, Icon, RequestErrorState, Text } from '@workout-tracker/ui-mobile';
import { Stack, useLocalSearchParams } from 'expo-router';
import { Folder } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { ScrollView, View } from 'react-native';
import { useReportRequestError } from '@/features/observability/hooks/use-report-request-error';
import { workoutObservability } from '@/features/observability/lib';
import { WorkoutCard, WorkoutsLoading } from '@/features/workouts/components/WorkoutCard';
import { useWorkouts } from '@/features/workouts/hooks/use-workouts';
import { resolveFolderColor } from '@/features/workouts/lib/folder-colors';
import { toWorkoutCardData } from '@/features/workouts/lib/workout-mappers';

type Params = {
  id?: string;
  name?: string;
  color?: string;
};

export default function WorkoutFolderDetailScreen() {
  const { t } = useTranslation();
  const { id, name, color } = useLocalSearchParams<Params>();
  const folderId = id ?? '';
  const folderName = name ?? '';
  const folderColor = resolveFolderColor(color ?? '');

  const { data: workouts, isLoading, isError, error, refetch } = useWorkouts({ folderId });
  useReportRequestError({ isError, error }, workoutObservability.captureError, {
    action: 'load_workouts_in_folder',
    extra: { folderId },
  });

  return (
    <>
      <Stack.Screen options={{ title: folderName }} />
      <View className="flex-1 bg-background">
        <View className="flex-row items-center gap-3 px-4 pt-4">
          <View className={`h-10 w-10 items-center justify-center rounded-xl ${folderColor.color}`}>
            <Icon as={Folder} size={20} className={folderColor.iconColor} />
          </View>
          <Text variant="small" className="text-muted-foreground">
            {workouts != null
              ? t('workoutsScreen.folderDetail.workoutCount', { count: workouts.length })
              : ''}
          </Text>
        </View>

        <ScrollView contentContainerClassName="p-4 pb-8">
          <View className="gap-3">
            {isLoading ? (
              <WorkoutsLoading />
            ) : isError && !workouts ? (
              <RequestErrorState
                title={t('workoutsScreen.error.title')}
                subtitle={t('workoutsScreen.error.subtitle')}
                retry={{ label: t('workoutsScreen.error.retry'), onPress: refetch }}
                testID="workout-folder-detail.error"
              />
            ) : workouts && workouts.length === 0 ? (
              <EmptyState
                title={t('workoutsScreen.folderDetail.emptyTitle')}
                subtitle={t('workoutsScreen.folderDetail.emptySubtitle')}
                testID="workout-folder-detail.empty"
              />
            ) : (
              workouts?.map((workout) => (
                <WorkoutCard key={workout.id} workout={toWorkoutCardData(workout)} />
              ))
            )}
          </View>
        </ScrollView>
      </View>
    </>
  );
}
