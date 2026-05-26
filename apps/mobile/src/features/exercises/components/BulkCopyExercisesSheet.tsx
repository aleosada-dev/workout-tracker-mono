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

export type BulkCopyExercisesSheetRef = {
  present: () => void;
  dismiss: () => void;
};

export function BulkCopyExercisesSheet({
  ref,
  count,
  onConfirm,
  isPending,
}: {
  ref?: Ref<BulkCopyExercisesSheetRef>;
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
          <Text variant="h4">{t('exerciseListScreen.bulkCopy.confirm.title')}</Text>
          <Text variant="muted" className="text-center">
            {t('exerciseListScreen.bulkCopy.confirm.message', { count })}
          </Text>
        </View>

        <View className="flex-row gap-3">
          <Button
            variant="outline"
            className="flex-1"
            onPress={() => sheetRef.current?.dismiss()}
            disabled={isPending}
          >
            <Text>{t('exerciseListScreen.bulkCopy.confirm.cancel')}</Text>
          </Button>
          <Button
            className="flex-1"
            onPress={onConfirm}
            disabled={isPending}
            testID="exercises-list.bulk-copy.confirm"
          >
            <Text>{t('exerciseListScreen.bulkCopy.confirm.confirm')}</Text>
          </Button>
        </View>
      </BottomSheetView>
    </BottomSheet>
  );
}
