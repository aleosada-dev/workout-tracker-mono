import { EmptyState, Icon, RequestErrorState, Text } from '@workout-tracker/ui-mobile';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { Folder, Pencil, Trash2 } from 'lucide-react-native';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, View } from 'react-native';
import Toast from 'react-native-toast-message';
import { useReportRequestError } from '@/features/observability/hooks/use-report-request-error';
import { workoutObservability } from '@/features/observability/lib';
import { handleLocalError } from '@/features/query/lib/error-handling';
import { useNavTheme } from '@/features/shared/lib/theme';
import { WorkoutCard, WorkoutsLoading } from '@/features/workouts/components/WorkoutCard';
import {
  WorkoutFolderDeleteSheet,
  type WorkoutFolderDeleteSheetRef,
} from '@/features/workouts/components/WorkoutFolderDeleteSheet';
import {
  WorkoutFolderFormSheet,
  type WorkoutFolderFormSheetRef,
} from '@/features/workouts/components/WorkoutFolderFormSheet';
import { useDeleteWorkoutFolder } from '@/features/workouts/hooks/use-delete-workout-folder';
import { useWorkouts } from '@/features/workouts/hooks/use-workouts';
import {
  resolveFolderColor,
  WORKOUT_FOLDER_COLORS,
  type WorkoutFolderColor,
} from '@/features/workouts/lib/folder-colors';
import { toWorkoutCardData } from '@/features/workouts/lib/workout-mappers';

type Params = {
  id?: string;
  name?: string;
  color?: string;
};

export default function WorkoutFolderDetailScreen() {
  const { t } = useTranslation();
  const navTheme = useNavTheme();
  const { id, name, color } = useLocalSearchParams<Params>();
  const folderId = id ?? '';
  const initialColor = (WORKOUT_FOLDER_COLORS as readonly string[]).includes(color ?? '')
    ? (color as WorkoutFolderColor)
    : WORKOUT_FOLDER_COLORS[0];
  const [folderName, setFolderName] = useState(name ?? '');
  const [folderColorName, setFolderColorName] = useState<WorkoutFolderColor>(initialColor);
  const folderColor = resolveFolderColor(folderColorName);
  const deleteSheetRef = useRef<WorkoutFolderDeleteSheetRef>(null);
  const editSheetRef = useRef<WorkoutFolderFormSheetRef>(null);

  const { data: workouts, isLoading, isError, error, refetch } = useWorkouts({ folderId });
  useReportRequestError({ isError, error }, workoutObservability.captureError, {
    action: 'load_workouts_in_folder',
    extra: { folderId },
  });

  const { mutate: deleteFolder, isPending: isDeleting } = useDeleteWorkoutFolder(folderId);

  const handleConfirmDelete = (action: Parameters<typeof deleteFolder>[0]) => {
    deleteFolder(action, {
      onSuccess: () => {
        workoutObservability.trackAction('workout_folder_deleted', { mode: action.mode });
        deleteSheetRef.current?.dismiss();
        Toast.show({
          type: 'success',
          text1: t('workoutsScreen.deleteFolderDialog.success'),
        });
        router.back();
      },
      onError: handleLocalError((err) => {
        workoutObservability.captureError(err, {
          action: 'delete_workout_folder',
          extra: { folderId, mode: action.mode },
        });
        Toast.show({
          type: 'error',
          text1: t('errors.unexpected.title'),
          text2: t('errors.unexpected.message'),
        });
      }),
    });
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: folderName,
          headerRight: () => (
            <View className="flex-row items-center gap-1">
              <Pressable
                onPress={() => editSheetRef.current?.present()}
                hitSlop={12}
                accessibilityRole="button"
                accessibilityLabel={t('workoutsScreen.editFolderSheet.trigger')}
                className="px-2"
                testID="workout-folder-detail.edit"
              >
                <Pencil size={20} color={navTheme.colors.text} />
              </Pressable>
              <Pressable
                onPress={() => deleteSheetRef.current?.present()}
                disabled={isDeleting}
                hitSlop={12}
                accessibilityRole="button"
                accessibilityLabel={t('workoutsScreen.deleteFolderDialog.trigger')}
                className="px-2"
                testID="workout-folder-detail.delete"
              >
                <Trash2 size={20} color={navTheme.colors.notification} />
              </Pressable>
            </View>
          ),
        }}
      />
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

      <WorkoutFolderDeleteSheet
        ref={deleteSheetRef}
        folderId={folderId}
        folderName={folderName}
        workoutCount={workouts?.length ?? 0}
        onConfirm={handleConfirmDelete}
        isPending={isDeleting}
      />

      <WorkoutFolderFormSheet
        ref={editSheetRef}
        folder={{ id: folderId, name: folderName, color: folderColorName }}
        onUpdated={(updated) => {
          setFolderName(updated.name);
          setFolderColorName(updated.color);
          Toast.show({
            type: 'success',
            text1: t('workoutsScreen.editFolderSheet.success'),
          });
        }}
      />
    </>
  );
}
