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

export type DiscardActiveWorkoutSheetRef = {
  present: () => void;
  dismiss: () => void;
};

export function DiscardActiveWorkoutSheet({
  ref,
  onConfirm,
}: {
  ref?: Ref<DiscardActiveWorkoutSheetRef>;
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
            {t('workoutsScreen.discardWorkoutDialog.title')}
          </Text>
          <Text variant="muted">{t('workoutsScreen.discardWorkoutDialog.message')}</Text>
        </View>

        <View className="gap-3">
          <Button
            className="bg-destructive"
            onPress={() => {
              sheetRef.current?.dismiss();
              onConfirm();
            }}
            testID="discard-workout-sheet.confirm"
          >
            <Text>{t('workoutsScreen.discardWorkoutDialog.confirm')}</Text>
          </Button>
          <Button
            variant="outline"
            onPress={() => sheetRef.current?.dismiss()}
            testID="discard-workout-sheet.cancel"
          >
            <Text>{t('workoutsScreen.discardWorkoutDialog.cancel')}</Text>
          </Button>
        </View>
      </BottomSheetView>
    </BottomSheet>
  );
}
