import { EmptyState, RequestErrorState, Text } from '@workout-tracker/ui-mobile';
import { router, Stack } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { useCoachAthletes } from '@/features/coaches/hooks/use-coach-athletes';
import { useReportRequestError } from '@/features/observability/hooks/use-report-request-error';
import { workoutObservability } from '@/features/observability/lib';
import { useProfile } from '@/features/profiles/hooks/use-profile';
import { handleLocalError } from '@/features/query/lib/error-handling';
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
import { useDeleteWorkouts } from '@/features/workouts/hooks/use-delete-workouts';
import { useMoveWorkouts } from '@/features/workouts/hooks/use-move-workouts';
import { useWorkoutFolders } from '@/features/workouts/hooks/use-workout-folders';
import { useWorkoutSelection } from '@/features/workouts/hooks/use-workout-selection';
import { useWorkouts } from '@/features/workouts/hooks/use-workouts';
import { resolveFolderColor } from '@/features/workouts/lib/folder-colors';
import { toWorkoutCardData } from '@/features/workouts/lib/workout-mappers';

export default function WorkoutListScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
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
  const deleteWorkoutsSheetRef = useRef<WorkoutsDeleteSheetRef>(null);
  const moveWorkoutsSheetRef = useRef<WorkoutsMoveSheetRef>(null);
  const copyWorkoutsSheetRef = useRef<WorkoutsCopySheetRef>(null);
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
  const { mutate: deleteSelected, isPending: isDeleting } = useDeleteWorkouts({
    userId: queryUserId,
  });
  const { mutate: moveSelected, isPending: isMoving } = useMoveWorkouts({
    userId: queryUserId,
  });
  const { mutate: copySelected, isPending: isCopying } = useCopyWorkouts();

  const openCopySheet = () => {
    if (selected.size === 0) return;
    copyWorkoutsSheetRef.current?.present();
  };

  const openDeleteSheet = () => {
    if (selected.size === 0) return;
    deleteWorkoutsSheetRef.current?.present();
  };

  const openMoveSheet = () => {
    if (selected.size === 0) return;
    moveWorkoutsSheetRef.current?.present();
  };

  const handleConfirmMove = (targetFolderId: string | null) => {
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    moveSelected(
      { workoutIds: ids, targetFolderId },
      {
        onSuccess: ({ movedIds }) => {
          workoutObservability.trackAction('workouts_moved', {
            count: movedIds.length,
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
            extra: { count: ids.length, targetFolderId },
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

  const handleConfirmCopy = ({
    targetUserId,
    target,
  }: {
    targetUserId: string;
    target:
      | { kind: 'root' }
      | { kind: 'existing'; folderId: string }
      | { kind: 'new'; name: string; color: import('@workout-tracker/domain').WorkoutFolderColor };
  }) => {
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    copySelected(
      { workoutIds: ids, targetUserId, target },
      {
        onSuccess: ({ newWorkoutIds }) => {
          workoutObservability.trackAction('workouts_copied', {
            count: newWorkoutIds.length,
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
            extra: { count: ids.length, targetUserId, targetKind: target.kind },
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

  const handleConfirmDelete = () => {
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    deleteSelected(ids, {
      onSuccess: ({ deletedIds }) => {
        workoutObservability.trackAction('workouts_deleted', { count: deletedIds.length });
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
          extra: { count: ids.length },
        });
        Toast.show({
          type: 'error',
          text1: t('errors.unexpected.title'),
          text2: t('errors.unexpected.message'),
        });
      }),
    });
  };

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
      <ScrollView
        contentContainerClassName="p-4"
        contentContainerStyle={{ paddingBottom: insets.bottom + (mode === 'select' ? 96 : 32) }}
      >
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
        <WorkoutsSelectionToolbar
          count={selected.size}
          onCancel={exitSelect}
          allSelected={allSelected}
          onToggleSelectAll={toggleSelectAll}
          showCopy={showAthleteSelect}
          onCopy={isCopying ? undefined : openCopySheet}
          onMove={isMoving ? undefined : openMoveSheet}
          onDelete={isDeleting ? undefined : openDeleteSheet}
        />
      ) : (
        <Stack.Screen options={{ headerLeft: undefined, headerRight: undefined }} />
      )}
      <WorkoutFolderFormSheet ref={folderFormSheetRef} userId={queryUserId} />
      <WorkoutsDeleteSheet
        ref={deleteWorkoutsSheetRef}
        count={selected.size}
        onConfirm={handleConfirmDelete}
        isPending={isDeleting}
      />
      <WorkoutsMoveSheet
        ref={moveWorkoutsSheetRef}
        count={selected.size}
        userId={queryUserId}
        excludeFolderId={null}
        onConfirm={handleConfirmMove}
        isPending={isMoving}
      />
      {showAthleteSelect ? (
        <WorkoutsCopySheet
          ref={copyWorkoutsSheetRef}
          count={selected.size}
          athletes={athletes ?? []}
          onConfirm={handleConfirmCopy}
          isPending={isCopying}
        />
      ) : null}
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
