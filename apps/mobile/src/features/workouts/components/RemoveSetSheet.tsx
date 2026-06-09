import {
  BottomSheet,
  type BottomSheetRef,
  BottomSheetView,
  Button,
  Icon,
  Text,
} from '@workout-tracker/ui-mobile';
import { Trash2 } from 'lucide-react-native';
import { type Ref, useImperativeHandle, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

export type RemoveSetSheetRef = {
  present: (onRemove: () => void) => void;
  dismiss: () => void;
};

export function RemoveSetSheet({ ref }: { ref?: Ref<RemoveSetSheetRef> }) {
  const { t } = useTranslation();
  const sheetRef = useRef<BottomSheetRef>(null);
  const onRemoveRef = useRef<(() => void) | null>(null);

  useImperativeHandle(ref, () => ({
    present: (onRemove) => {
      onRemoveRef.current = onRemove;
      sheetRef.current?.present();
    },
    dismiss: () => sheetRef.current?.dismiss(),
  }));

  const handleRemove = () => {
    onRemoveRef.current?.();
    sheetRef.current?.dismiss();
  };

  return (
    <BottomSheet ref={sheetRef}>
      <BottomSheetView className="gap-4 px-5 pt-2 pb-8">
        <Text variant="h4">{t('workoutExecutionScreen.removeSetSheet.title')}</Text>
        <View className="gap-2">
          <Button
            variant="destructive"
            onPress={handleRemove}
            testID="workout-execution.remove-set.confirm"
          >
            <Icon as={Trash2} size={16} className="text-white" />
            <Text className="font-sans-semibold text-sm text-white">
              {t('workoutExecutionScreen.removeSetSheet.confirm')}
            </Text>
          </Button>
          <Button variant="outline" onPress={() => sheetRef.current?.dismiss()}>
            <Text className="font-sans-semibold text-sm">
              {t('workoutExecutionScreen.removeSetSheet.cancel')}
            </Text>
          </Button>
        </View>
      </BottomSheetView>
    </BottomSheet>
  );
}
