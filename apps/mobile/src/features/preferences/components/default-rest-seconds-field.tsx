import {
  BottomSheet,
  type BottomSheetRef,
  BottomSheetView,
  Button,
  Label,
  Text,
} from '@workout-tracker/ui-mobile';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';
import { formatTime } from '@/features/shared/lib/utils';
import { TimeWheelPicker } from '@/features/workouts/components/TimerSheet/TimeWheelPicker';

type DefaultRestSecondsFieldProps = {
  value: number | null;
  onChange: (next: number | null) => void;
};

export function DefaultRestSecondsField({ value, onChange }: DefaultRestSecondsFieldProps) {
  const { t } = useTranslation();
  const sheetRef = useRef<BottomSheetRef>(null);
  const [draftSeconds, setDraftSeconds] = useState(0);

  const open = () => {
    setDraftSeconds(value ?? 0);
    sheetRef.current?.present();
  };

  const confirm = () => {
    onChange(draftSeconds === 0 ? null : draftSeconds);
    sheetRef.current?.dismiss();
  };

  const clear = () => {
    onChange(null);
    sheetRef.current?.dismiss();
  };

  return (
    <View className="gap-2">
      <Label>{t('preferencesScreen.defaultRestSeconds.label')}</Label>
      <Text variant="muted" className="text-sm">
        {t('preferencesScreen.defaultRestSeconds.description')}
      </Text>
      <Pressable
        onPress={open}
        className="h-10 w-full flex-row items-center rounded-md border border-input bg-background px-3"
        testID="preferences.defaultRestSeconds"
      >
        <Text className={value == null ? 'text-muted-foreground/50' : ''}>
          {value == null
            ? t('preferencesScreen.defaultRestSeconds.placeholder')
            : formatTime(value)}
        </Text>
      </Pressable>

      <BottomSheet ref={sheetRef} enableContentPanningGesture={false}>
        <BottomSheetView className="gap-4 px-5 pt-2 pb-8">
          <Text variant="h4" className="text-center">
            {t('preferencesScreen.defaultRestSeconds.pickerTitle')}
          </Text>
          <TimeWheelPicker totalSeconds={draftSeconds} onChange={setDraftSeconds} />
          <Button onPress={confirm}>
            <Text>{t('preferencesScreen.defaultRestSeconds.confirm')}</Text>
          </Button>
          <Button variant="outline" onPress={clear}>
            <Text>{t('preferencesScreen.defaultRestSeconds.clear')}</Text>
          </Button>
        </BottomSheetView>
      </BottomSheet>
    </View>
  );
}
