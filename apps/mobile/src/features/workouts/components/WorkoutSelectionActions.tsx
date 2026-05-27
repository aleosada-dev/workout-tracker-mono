import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import Toast from 'react-native-toast-message';
import { useCoachAthletes } from '@/features/coaches/hooks/use-coach-athletes';
import { workoutObservability } from '@/features/observability/lib';
import { useProfile } from '@/features/profiles/hooks/use-profile';
import { handleLocalError } from '@/features/query/lib/error-handling';
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
import type { useWorkoutSelection } from '@/features/workouts/hooks/use-workout-selection';
import type { WorkoutFolderColor } from '@/features/workouts/lib/folder-colors';

type Selection = ReturnType<typeof useWorkoutSelection>;

type CopyTarget =
  | { kind: 'root' }
  | { kind: 'existing'; folderId: string }
  | { kind: 'new'; name: string; color: WorkoutFolderColor };

type Props = {
  selection: Selection;
  /** Owner of the workouts being acted on (athlete for a coach, self otherwise). */
  userId: string | null;
  /** Folder to exclude from the Move sheet (the current folder when inside folder detail). */
  excludeFolderId: string | null;
  /** When present, gets merged into every telemetry event's `extra` as `folderId`. */
  telemetryFolderId?: string;
};

export function WorkoutSelectionActions({
  selection,
  userId,
  excludeFolderId,
  telemetryFolderId,
}: Props) {
  const { t } = useTranslation();
  const { selected, mode, allSelected, exitSelect, toggleSelectAll } = selection;

  const { data: profile } = useProfile();
  const isCoach = profile?.role === 'coach';
  const { data: athletes } = useCoachAthletes({ enabled: isCoach });
  const showCopy = isCoach && (athletes?.length ?? 0) >= 1;

  const deleteSheetRef = useRef<WorkoutsDeleteSheetRef>(null);
  const moveSheetRef = useRef<WorkoutsMoveSheetRef>(null);
  const copySheetRef = useRef<WorkoutsCopySheetRef>(null);

  const { mutate: deleteSelected, isPending: isDeleting } = useDeleteWorkouts({ userId });
  const { mutate: moveSelected, isPending: isMoving } = useMoveWorkouts({ userId });
  const { mutate: copySelected, isPending: isCopying } = useCopyWorkouts();

  const extraWith = <T extends Record<string, string | number | null>>(fields: T) =>
    telemetryFolderId ? { ...fields, folderId: telemetryFolderId } : fields;

  const openDelete = () => {
    if (selected.size === 0) return;
    deleteSheetRef.current?.present();
  };
  const openMove = () => {
    if (selected.size === 0) return;
    moveSheetRef.current?.present();
  };
  const openCopy = () => {
    if (selected.size === 0) return;
    copySheetRef.current?.present();
  };

  const handleConfirmDelete = () => {
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    deleteSelected(ids, {
      onSuccess: ({ deletedIds }) => {
        workoutObservability.trackAction(
          'workouts_deleted',
          extraWith({ count: deletedIds.length }),
        );
        deleteSheetRef.current?.dismiss();
        exitSelect();
        Toast.show({
          type: 'success',
          text1: t('workoutsScreen.deleteWorkoutsDialog.success', { count: deletedIds.length }),
        });
      },
      onError: handleLocalError((err) => {
        workoutObservability.captureError(err, {
          action: 'delete_workouts',
          extra: extraWith({ count: ids.length }),
        });
        Toast.show({
          type: 'error',
          text1: t('errors.unexpected.title'),
          text2: t('errors.unexpected.message'),
        });
      }),
    });
  };

  const handleConfirmMove = (targetFolderId: string | null) => {
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    moveSelected(
      { workoutIds: ids, targetFolderId },
      {
        onSuccess: ({ movedIds }) => {
          workoutObservability.trackAction(
            'workouts_moved',
            extraWith({ count: movedIds.length, targetFolderId: targetFolderId ?? 'root' }),
          );
          moveSheetRef.current?.dismiss();
          exitSelect();
          Toast.show({
            type: 'success',
            text1: t('workoutsScreen.moveWorkoutsDialog.success', { count: movedIds.length }),
          });
        },
        onError: handleLocalError((err) => {
          workoutObservability.captureError(err, {
            action: 'move_workouts',
            extra: extraWith({ count: ids.length, targetFolderId }),
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
    target: CopyTarget;
  }) => {
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    copySelected(
      { workoutIds: ids, targetUserId, target },
      {
        onSuccess: ({ newWorkoutIds }) => {
          workoutObservability.trackAction(
            'workouts_copied',
            extraWith({ count: newWorkoutIds.length, targetUserId, targetKind: target.kind }),
          );
          copySheetRef.current?.dismiss();
          exitSelect();
          Toast.show({
            type: 'success',
            text1: t('workoutsScreen.copyWorkoutsDialog.success', { count: newWorkoutIds.length }),
          });
        },
        onError: handleLocalError((err) => {
          workoutObservability.captureError(err, {
            action: 'copy_workouts',
            extra: extraWith({ count: ids.length, targetUserId, targetKind: target.kind }),
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

  return (
    <>
      {mode === 'select' ? (
        <WorkoutsSelectionToolbar
          count={selected.size}
          onCancel={exitSelect}
          allSelected={allSelected}
          onToggleSelectAll={toggleSelectAll}
          showCopy={showCopy}
          onCopy={isCopying ? undefined : openCopy}
          onMove={isMoving ? undefined : openMove}
          onDelete={isDeleting ? undefined : openDelete}
        />
      ) : null}

      <WorkoutsDeleteSheet
        ref={deleteSheetRef}
        count={selected.size}
        onConfirm={handleConfirmDelete}
        isPending={isDeleting}
      />

      <WorkoutsMoveSheet
        ref={moveSheetRef}
        count={selected.size}
        userId={userId}
        excludeFolderId={excludeFolderId}
        onConfirm={handleConfirmMove}
        isPending={isMoving}
      />

      {showCopy ? (
        <WorkoutsCopySheet
          ref={copySheetRef}
          count={selected.size}
          athletes={athletes ?? []}
          onConfirm={handleConfirmCopy}
          isPending={isCopying}
        />
      ) : null}
    </>
  );
}
