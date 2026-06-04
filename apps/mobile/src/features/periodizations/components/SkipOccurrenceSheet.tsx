import {
  BottomSheet,
  BottomSheetInput,
  type BottomSheetRef,
  BottomSheetView,
  Button,
  Text,
} from '@workout-tracker/ui-mobile';
import { type Ref, useImperativeHandle, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

export type SkipOccurrenceSheetRef = {
  present: () => void;
  dismiss: () => void;
};

export function SkipOccurrenceSheet({
  ref,
  onConfirm,
  isPending,
}: {
  ref?: Ref<SkipOccurrenceSheetRef>;
  onConfirm: (reason: string | undefined) => void;
  isPending?: boolean;
}) {
  const { t } = useTranslation();
  const sheetRef = useRef<BottomSheetRef>(null);
  const [reason, setReason] = useState('');

  useImperativeHandle(ref, () => ({
    present: () => sheetRef.current?.present(),
    dismiss: () => sheetRef.current?.dismiss(),
  }));

  const handleConfirm = () => {
    const trimmed = reason.trim();
    onConfirm(trimmed.length > 0 ? trimmed : undefined);
  };

  return (
    <BottomSheet ref={sheetRef} onDismiss={() => setReason('')}>
      <BottomSheetView className="gap-5 px-5 pt-2 pb-8">
        <View className="gap-1">
          <Text variant="h4" className="text-center">
            {t('homeScreen.skipOccurrence.title')}
          </Text>
          <Text variant="muted">{t('homeScreen.skipOccurrence.message')}</Text>
        </View>

        <BottomSheetInput
          className="h-24 items-start py-2"
          multiline
          numberOfLines={4}
          textAlignVertical="top"
          placeholder={t('homeScreen.skipOccurrence.placeholder')}
          value={reason}
          onChangeText={setReason}
          editable={!isPending}
        />

        <View className="gap-3">
          <Button onPress={handleConfirm} disabled={isPending}>
            <Text>{t('homeScreen.skipOccurrence.confirm')}</Text>
          </Button>
          <Button
            variant="outline"
            onPress={() => sheetRef.current?.dismiss()}
            disabled={isPending}
          >
            <Text>{t('homeScreen.skipOccurrence.cancel')}</Text>
          </Button>
        </View>
      </BottomSheetView>
    </BottomSheet>
  );
}
