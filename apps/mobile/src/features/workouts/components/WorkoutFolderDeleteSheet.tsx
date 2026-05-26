import { type BottomSheetMethods, BottomSheetModal } from '@expo/ui/community/bottom-sheet';
import type { DeleteWorkoutFolderInput, DeleteWorkoutFolderMode } from '@workout-tracker/domain';
import { Button, Icon, Text } from '@workout-tracker/ui-mobile';
import { Check } from 'lucide-react-native';
import { type Ref, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, View } from 'react-native';
import { useWorkoutFolders } from '@/features/workouts/hooks/use-workout-folders';

const ROOT_VALUE = 'null';

export type DeleteFolderAction = DeleteWorkoutFolderInput extends infer T
  ? T extends DeleteWorkoutFolderInput
    ? Omit<T, 'userId' | 'folderId'>
    : never
  : never;

type SelectableMode = Exclude<DeleteWorkoutFolderMode, 'delete-folder-only'>;

export type WorkoutFolderDeleteSheetRef = {
  present: () => void;
  dismiss: () => void;
};

export function WorkoutFolderDeleteSheet({
  ref,
  folderId,
  folderName,
  workoutCount,
  onConfirm,
  isPending,
}: {
  ref?: Ref<WorkoutFolderDeleteSheetRef>;
  folderId: string;
  folderName: string;
  workoutCount: number;
  onConfirm: (action: DeleteFolderAction) => void;
  isPending?: boolean;
}) {
  const { t } = useTranslation();
  const sheetRef = useRef<BottomSheetMethods>(null);
  const hasWorkouts = workoutCount > 0;

  const { data: folders } = useWorkoutFolders();
  const otherFolders = useMemo(
    () => (folders ?? []).filter((f) => f.id !== folderId),
    [folders, folderId],
  );

  const [mode, setMode] = useState<SelectableMode>('delete-with-workouts');
  const [target, setTarget] = useState<string>(ROOT_VALUE);

  useImperativeHandle(ref, () => ({
    present: () => {
      setMode('delete-with-workouts');
      setTarget(ROOT_VALUE);
      sheetRef.current?.present();
    },
    dismiss: () => sheetRef.current?.dismiss(),
  }));

  const handleConfirm = () => {
    if (!hasWorkouts) {
      onConfirm({ mode: 'delete-folder-only' });
      return;
    }
    if (mode === 'delete-with-workouts') {
      onConfirm({ mode: 'delete-with-workouts' });
      return;
    }
    onConfirm({
      mode: 'move-workouts',
      targetFolderId: target === ROOT_VALUE ? null : target,
    });
  };

  return (
    <BottomSheetModal ref={sheetRef} enablePanDownToClose enableDynamicSizing>
      <View className="gap-5 px-5 pt-2 pb-8">
        <View className="items-center gap-1">
          <Text variant="h4">
            {t('workoutsScreen.deleteFolderDialog.title', { name: folderName })}
          </Text>
          <Text variant="muted" className="text-center">
            {t('workoutsScreen.deleteFolderDialog.irreversible')}
          </Text>
        </View>

        {hasWorkouts ? (
          <View className="gap-3">
            <Text variant="small" className="text-muted-foreground">
              {t('workoutsScreen.deleteFolderDialog.workoutsPrompt', { count: workoutCount })}
            </Text>

            <RadioOption
              label={t('workoutsScreen.deleteFolderDialog.options.deleteAll')}
              selected={mode === 'delete-with-workouts'}
              onPress={() => setMode('delete-with-workouts')}
            />

            <RadioOption
              label={t('workoutsScreen.deleteFolderDialog.options.move')}
              selected={mode === 'move-workouts'}
              onPress={() => setMode('move-workouts')}
            />

            {mode === 'move-workouts' ? (
              <View className="gap-2 pl-8">
                <Text variant="small" className="text-muted-foreground">
                  {t('workoutsScreen.deleteFolderDialog.movePlaceholder')}
                </Text>
                <ScrollView className="max-h-48" nestedScrollEnabled>
                  <View className="gap-2">
                    <RadioOption
                      label={t('workoutsScreen.deleteFolderDialog.rootOption')}
                      selected={target === ROOT_VALUE}
                      onPress={() => setTarget(ROOT_VALUE)}
                    />
                    {otherFolders.map((folder) => (
                      <RadioOption
                        key={folder.id}
                        label={folder.name}
                        selected={target === folder.id}
                        onPress={() => setTarget(folder.id)}
                      />
                    ))}
                  </View>
                </ScrollView>
              </View>
            ) : null}
          </View>
        ) : null}

        <View className="flex-row gap-3">
          <Button
            variant="outline"
            className="flex-1"
            onPress={() => sheetRef.current?.dismiss()}
            disabled={isPending}
          >
            <Text>{t('workoutsScreen.deleteFolderDialog.cancel')}</Text>
          </Button>
          <Button
            className="flex-1 bg-destructive"
            onPress={handleConfirm}
            disabled={isPending}
            testID="workout-folder-delete.confirm"
          >
            <Text>{t('workoutsScreen.deleteFolderDialog.confirm')}</Text>
          </Button>
        </View>
      </View>
    </BottomSheetModal>
  );
}

function RadioOption({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      className="flex-row items-center gap-3"
      hitSlop={4}
    >
      <View
        className={`h-5 w-5 items-center justify-center rounded-full border ${
          selected ? 'border-primary bg-primary' : 'border-input'
        }`}
      >
        {selected ? <Icon as={Check} size={14} className="text-primary-foreground" /> : null}
      </View>
      <Text className="flex-1">{label}</Text>
    </Pressable>
  );
}
