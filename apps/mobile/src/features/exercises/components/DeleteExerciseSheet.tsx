import { type BottomSheetMethods, BottomSheetModal } from '@expo/ui/community/bottom-sheet';
import { Button, Text } from '@workout-tracker/ui-mobile';
import { type Ref, useImperativeHandle, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

export type DeleteExerciseSheetRef = {
  present: () => void;
  dismiss: () => void;
};

export function DeleteExerciseSheet({
  ref,
  onConfirm,
  isPending,
}: {
  ref?: Ref<DeleteExerciseSheetRef>;
  onConfirm: () => void;
  isPending?: boolean;
}) {
  const { t } = useTranslation();
  const sheetRef = useRef<BottomSheetMethods>(null);

  useImperativeHandle(ref, () => ({
    present: () => sheetRef.current?.present(),
    dismiss: () => sheetRef.current?.dismiss(),
  }));

  return (
    <BottomSheetModal ref={sheetRef} enablePanDownToClose enableDynamicSizing>
      <View className="gap-5 px-5 pt-2 pb-8">
        <View className="items-center gap-1">
          <Text variant="h4">{t('exerciseListScreen.deleteExercise.confirm.title')}</Text>
          <Text variant="muted" className="text-center">
            {t('exerciseListScreen.deleteExercise.confirm.message')}
          </Text>
        </View>

        <View className="flex-row gap-3">
          <Button
            variant="outline"
            className="flex-1"
            onPress={() => sheetRef.current?.dismiss()}
            disabled={isPending}
          >
            <Text>{t('exerciseListScreen.deleteExercise.confirm.cancel')}</Text>
          </Button>
          <Button
            className="flex-1 bg-destructive"
            onPress={onConfirm}
            disabled={isPending}
            testID="exercise-form.delete.confirm"
          >
            <Text>{t('exerciseListScreen.deleteExercise.confirm.confirm')}</Text>
          </Button>
        </View>
      </View>
    </BottomSheetModal>
  );
}
