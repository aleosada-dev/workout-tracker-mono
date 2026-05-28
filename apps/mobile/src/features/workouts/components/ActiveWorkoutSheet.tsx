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

export type ActiveWorkoutSheetRef = {
  present: () => void;
  dismiss: () => void;
};

export function ActiveWorkoutSheet({
  ref,
  onConfirm,
}: {
  ref?: Ref<ActiveWorkoutSheetRef>;
  onConfirm: () => void;
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
        <View className="gap-2">
          <Text variant="h4" className="text-center">
            {t('workoutsScreen.activeWorkoutDialog.title')}
          </Text>
          <Text variant="muted">{t('workoutsScreen.activeWorkoutDialog.message1')}</Text>
          <Text variant="muted">{t('workoutsScreen.activeWorkoutDialog.message2')}</Text>
        </View>

        <View className="gap-3">
          <Button
            className="bg-destructive"
            onPress={() => {
              sheetRef.current?.dismiss();
              onConfirm();
            }}
            testID="active-workout-sheet.confirm"
          >
            <Text>{t('workoutsScreen.activeWorkoutDialog.confirm')}</Text>
          </Button>
          <Button
            variant="outline"
            onPress={() => sheetRef.current?.dismiss()}
            testID="active-workout-sheet.cancel"
          >
            <Text>{t('workoutsScreen.activeWorkoutDialog.cancel')}</Text>
          </Button>
        </View>
      </BottomSheetView>
    </BottomSheet>
  );
}
