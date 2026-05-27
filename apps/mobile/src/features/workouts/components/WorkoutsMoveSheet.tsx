import {
  BottomSheet,
  type BottomSheetRef,
  BottomSheetView,
  Button,
  Text,
} from '@workout-tracker/ui-mobile';
import { Folder, FolderMinus } from 'lucide-react-native';
import { type Ref, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, View } from 'react-native';
import { FolderTile } from '@/features/workouts/components/FolderTile';
import { useWorkoutFolders } from '@/features/workouts/hooks/use-workout-folders';
import { resolveFolderColor } from '@/features/workouts/lib/folder-colors';

const ROOT_VALUE = 'null';

export type WorkoutsMoveSheetRef = {
  present: () => void;
  dismiss: () => void;
};

export function WorkoutsMoveSheet({
  ref,
  count,
  userId,
  excludeFolderId,
  onConfirm,
  isPending,
}: {
  ref?: Ref<WorkoutsMoveSheetRef>;
  count: number;
  userId?: string | null;
  excludeFolderId?: string | null;
  onConfirm: (targetFolderId: string | null) => void;
  isPending?: boolean;
}) {
  const { t } = useTranslation();
  const sheetRef = useRef<BottomSheetRef>(null);
  const [target, setTarget] = useState<string>(ROOT_VALUE);

  const { data: folders } = useWorkoutFolders({ userId: userId ?? null });
  const availableFolders = useMemo(
    () => (folders ?? []).filter((f) => f.id !== excludeFolderId),
    [folders, excludeFolderId],
  );

  useImperativeHandle(ref, () => ({
    present: () => {
      setTarget(ROOT_VALUE);
      sheetRef.current?.present();
    },
    dismiss: () => sheetRef.current?.dismiss(),
  }));

  const handleConfirm = () => {
    onConfirm(target === ROOT_VALUE ? null : target);
  };

  const showRootOption = excludeFolderId !== null;

  return (
    <BottomSheet ref={sheetRef}>
      <BottomSheetView className="gap-5 px-5 pt-2 pb-8">
        <View className="items-center gap-1">
          <Text variant="h4">{t('workoutsScreen.moveWorkoutsDialog.title', { count })}</Text>
          <Text variant="muted" className="text-center">
            {t('workoutsScreen.moveWorkoutsDialog.subtitle')}
          </Text>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerClassName="gap-4 px-1 py-2"
        >
          {showRootOption ? (
            <FolderTile
              label={t('workoutsScreen.moveWorkoutsDialog.rootOption')}
              icon={FolderMinus}
              tileClassName="bg-muted"
              iconClassName="text-muted-foreground"
              selected={target === ROOT_VALUE}
              onPress={() => setTarget(ROOT_VALUE)}
            />
          ) : null}
          {availableFolders.map((folder) => {
            const { color, iconColor } = resolveFolderColor(folder.color);
            return (
              <FolderTile
                key={folder.id}
                label={folder.name}
                icon={Folder}
                tileClassName={color}
                iconClassName={iconColor}
                selected={target === folder.id}
                onPress={() => setTarget(folder.id)}
              />
            );
          })}
        </ScrollView>

        <View className="gap-3">
          <Button onPress={handleConfirm} disabled={isPending} testID="workouts-move.confirm">
            <Text>{t('workoutsScreen.moveWorkoutsDialog.confirm')}</Text>
          </Button>
          <Button
            variant="outline"
            onPress={() => sheetRef.current?.dismiss()}
            disabled={isPending}
          >
            <Text>{t('workoutsScreen.moveWorkoutsDialog.cancel')}</Text>
          </Button>
        </View>
      </BottomSheetView>
    </BottomSheet>
  );
}
