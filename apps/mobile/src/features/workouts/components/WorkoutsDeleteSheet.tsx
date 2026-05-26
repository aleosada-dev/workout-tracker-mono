import {
  BottomSheet,
  type BottomSheetRef,
  BottomSheetView,
  Button,
  Text,
} from '@workout-tracker/ui-mobile';
import { type Ref, useImperativeHandle, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

export type WorkoutsDeleteSheetRef = {
  present: () => void;
  dismiss: () => void;
};

export function WorkoutsDeleteSheet({
  ref,
  count,
  onConfirm,
  isPending,
}: {
  ref?: Ref<WorkoutsDeleteSheetRef>;
  count: number;
  onConfirm: () => void;
  isPending?: boolean;
}) {
  const { t } = useTranslation();
  const sheetRef = useRef<BottomSheetRef>(null);

  useImperativeHandle(ref, () => ({
    present: () => sheetRef.current?.present(),
    dismiss: () => sheetRef.current?.dismiss(),
  }));

  return (
    <BottomSheet ref={sheetRef}>
      <BottomSheetView className="gap-5 px-5 pt-2 pb-8">
        <View className="items-center gap-1">
          <Text variant="h4">{t('workoutsScreen.deleteWorkoutsDialog.title', { count })}</Text>
          <Text variant="muted" className="text-center">
            {t('workoutsScreen.deleteWorkoutsDialog.message')}
          </Text>
        </View>

        <View className="flex-row gap-3">
          <Button
            variant="outline"
            className="flex-1"
            onPress={() => sheetRef.current?.dismiss()}
            disabled={isPending}
          >
            <Text>{t('workoutsScreen.deleteWorkoutsDialog.cancel')}</Text>
          </Button>
          <Button
            className="flex-1 bg-destructive"
            onPress={onConfirm}
            disabled={isPending}
            testID="workouts-delete.confirm"
          >
            <Text>{t('workoutsScreen.deleteWorkoutsDialog.confirm')}</Text>
          </Button>
        </View>
      </BottomSheetView>
    </BottomSheet>
  );
}
