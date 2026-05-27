import { EmptyState, Icon, RequestErrorState, Text } from '@workout-tracker/ui-mobile';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { Folder, Pencil, Trash2 } from 'lucide-react-native';
import { useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { useCoachAthletes } from '@/features/coaches/hooks/use-coach-athletes';
import { useReportRequestError } from '@/features/observability/hooks/use-report-request-error';
import { workoutObservability } from '@/features/observability/lib';
import { useProfile } from '@/features/profiles/hooks/use-profile';
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
import {
  WorkoutsCopySheet,
  type WorkoutsCopySheetRef,
} from '@/features/workouts/components/WorkoutsCopySheet';
import {
  WorkoutsDeleteSheet,
  type WorkoutsDeleteSheetRef,
} from '@/features/workouts/components/WorkoutsDeleteSheet';
import {
  WorkoutsMoveSheet,
  type WorkoutsMoveSheetRef,
} from '@/features/workouts/components/WorkoutsMoveSheet';
import { WorkoutsSelectionToolbar } from '@/features/workouts/components/WorkoutsSelectionToolbar';
import { useCopyWorkouts } from '@/features/workouts/hooks/use-copy-workouts';
import { useDeleteWorkoutFolder } from '@/features/workouts/hooks/use-delete-workout-folder';
import { useDeleteWorkouts } from '@/features/workouts/hooks/use-delete-workouts';
import { useMoveWorkouts } from '@/features/workouts/hooks/use-move-workouts';
import { useWorkoutSelection } from '@/features/workouts/hooks/use-workout-selection';
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
  userId?: string;
};

export default function WorkoutFolderDetailScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const navTheme = useNavTheme();
  const { id, name, color, userId } = useLocalSearchParams<Params>();
  const folderId = id ?? '';
  const initialColor = (WORKOUT_FOLDER_COLORS as readonly string[]).includes(color ?? '')
    ? (color as WorkoutFolderColor)
    : WORKOUT_FOLDER_COLORS[0];
  const [folderName, setFolderName] = useState(name ?? '');
  const [folderColorName, setFolderColorName] = useState<WorkoutFolderColor>(initialColor);
  const folderColor = resolveFolderColor(folderColorName);
  const deleteSheetRef = useRef<WorkoutFolderDeleteSheetRef>(null);
  const editSheetRef = useRef<WorkoutFolderFormSheetRef>(null);
  const deleteWorkoutsSheetRef = useRef<WorkoutsDeleteSheetRef>(null);
  const moveWorkoutsSheetRef = useRef<WorkoutsMoveSheetRef>(null);
  const copyWorkoutsSheetRef = useRef<WorkoutsCopySheetRef>(null);

  const { data: profile } = useProfile();
  const isCoach = profile?.role === 'coach';
  const { data: athletes } = useCoachAthletes({ enabled: isCoach });
  const showCopy = isCoach && (athletes?.length ?? 0) >= 1;

  const {
    data: workouts,
    isLoading,
    isError,
    error,
    refetch,
  } = useWorkouts({ folderId, userId: userId ?? null });
  useReportRequestError({ isError, error }, workoutObservability.captureError, {
    action: 'load_workouts_in_folder',
    extra: { folderId },
  });

  const { mutate: deleteFolder, isPending: isDeleting } = useDeleteWorkoutFolder(folderId, {
    userId: userId ?? null,
  });

  const workoutIds = useMemo(() => workouts?.map((w) => w.id) ?? [], [workouts]);
  const { mode, selected, allSelected, enterSelect, exitSelect, toggle, toggleSelectAll } =
    useWorkoutSelection(workoutIds);
  const { mutate: deleteSelected, isPending: isDeletingWorkouts } = useDeleteWorkouts({
    userId: userId ?? null,
  });
  const { mutate: moveSelected, isPending: isMovingWorkouts } = useMoveWorkouts({
    userId: userId ?? null,
  });
  const { mutate: copySelected, isPending: isCopyingWorkouts } = useCopyWorkouts();

  const openCopyWorkoutsSheet = () => {
    if (selected.size === 0) return;
    copyWorkoutsSheetRef.current?.present();
  };

  const openDeleteWorkoutsSheet = () => {
    if (selected.size === 0) return;
    deleteWorkoutsSheetRef.current?.present();
  };

  const openMoveWorkoutsSheet = () => {
    if (selected.size === 0) return;
    moveWorkoutsSheetRef.current?.present();
  };

  const handleConfirmMoveWorkouts = (targetFolderId: string | null) => {
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    moveSelected(
      { workoutIds: ids, targetFolderId },
      {
        onSuccess: ({ movedIds }) => {
          workoutObservability.trackAction('workouts_moved', {
            count: movedIds.length,
            folderId,
            targetFolderId: targetFolderId ?? 'root',
          });
          moveWorkoutsSheetRef.current?.dismiss();
          exitSelect();
          Toast.show({
            type: 'success',
            text1: t('workoutsScreen.moveWorkoutsDialog.success', { count: movedIds.length }),
          });
        },
        onError: handleLocalError((err) => {
          workoutObservability.captureError(err, {
            action: 'move_workouts',
            extra: { folderId, count: ids.length, targetFolderId },
          });
          Toast.show({
            type: 'error',
            text1: t('errors.unexpected.title'),
            text2: t('errors.unexpected.message'),
          });
        }),
      },
    );
  };

  const handleConfirmCopyWorkouts = ({
    targetUserId,
    target,
  }: {
    targetUserId: string;
    target:
      | { kind: 'root' }
      | { kind: 'existing'; folderId: string }
      | { kind: 'new'; name: string; color: WorkoutFolderColor };
  }) => {
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    copySelected(
      { workoutIds: ids, targetUserId, target },
      {
        onSuccess: ({ newWorkoutIds }) => {
          workoutObservability.trackAction('workouts_copied', {
            count: newWorkoutIds.length,
            folderId,
            targetUserId,
            targetKind: target.kind,
          });
          copyWorkoutsSheetRef.current?.dismiss();
          exitSelect();
          Toast.show({
            type: 'success',
            text1: t('workoutsScreen.copyWorkoutsDialog.success', {
              count: newWorkoutIds.length,
            }),
          });
        },
        onError: handleLocalError((err) => {
          workoutObservability.captureError(err, {
            action: 'copy_workouts',
            extra: { folderId, count: ids.length, targetUserId, targetKind: target.kind },
          });
          Toast.show({
            type: 'error',
            text1: t('errors.unexpected.title'),
            text2: t('errors.unexpected.message'),
          });
        }),
      },
    );
  };

  const handleConfirmDeleteWorkouts = () => {
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    deleteSelected(ids, {
      onSuccess: ({ deletedIds }) => {
        workoutObservability.trackAction('workouts_deleted', {
          count: deletedIds.length,
          folderId,
        });
        deleteWorkoutsSheetRef.current?.dismiss();
        exitSelect();
        Toast.show({
          type: 'success',
          text1: t('workoutsScreen.deleteWorkoutsDialog.success', {
            count: deletedIds.length,
          }),
        });
      },
      onError: handleLocalError((err) => {
        workoutObservability.captureError(err, {
          action: 'delete_workouts',
          extra: { folderId, count: ids.length },
        });
        Toast.show({
          type: 'error',
          text1: t('errors.unexpected.title'),
          text2: t('errors.unexpected.message'),
        });
      }),
    });
  };

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
      {mode === 'browse' && (
        <Stack.Screen
          options={{
            title: folderName,
            headerLeft: undefined,
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
      )}
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

        <ScrollView
          contentContainerClassName="p-4"
          contentContainerStyle={{ paddingBottom: insets.bottom + (mode === 'select' ? 96 : 32) }}
        >
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
        {mode === 'select' && (
          <WorkoutsSelectionToolbar
            count={selected.size}
            onCancel={exitSelect}
            allSelected={allSelected}
            onToggleSelectAll={toggleSelectAll}
            showCopy={showCopy}
            onCopy={isCopyingWorkouts ? undefined : openCopyWorkoutsSheet}
            onMove={isMovingWorkouts ? undefined : openMoveWorkoutsSheet}
            onDelete={isDeletingWorkouts ? undefined : openDeleteWorkoutsSheet}
          />
        )}
      </View>

      <WorkoutsDeleteSheet
        ref={deleteWorkoutsSheetRef}
        count={selected.size}
        onConfirm={handleConfirmDeleteWorkouts}
        isPending={isDeletingWorkouts}
      />

      <WorkoutsMoveSheet
        ref={moveWorkoutsSheetRef}
        count={selected.size}
        userId={userId ?? null}
        excludeFolderId={folderId}
        onConfirm={handleConfirmMoveWorkouts}
        isPending={isMovingWorkouts}
      />

      {showCopy ? (
        <WorkoutsCopySheet
          ref={copyWorkoutsSheetRef}
          count={selected.size}
          athletes={athletes ?? []}
          onConfirm={handleConfirmCopyWorkouts}
          isPending={isCopyingWorkouts}
        />
      ) : null}

      <WorkoutFolderDeleteSheet
        ref={deleteSheetRef}
        folderId={folderId}
        folderName={folderName}
        workoutCount={workouts?.length ?? 0}
        userId={userId ?? null}
        onConfirm={handleConfirmDelete}
        isPending={isDeleting}
      />

      <WorkoutFolderFormSheet
        ref={editSheetRef}
        folder={{ id: folderId, name: folderName, color: folderColorName }}
        userId={userId ?? null}
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
