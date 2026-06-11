import {
  BottomSheet,
  BottomSheetInput,
  type BottomSheetRef,
  BottomSheetView,
  Button,
  Icon,
  Text,
} from '@workout-tracker/ui-mobile';
import { Timer, X } from 'lucide-react-native';
import { type Ref, useImperativeHandle, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';
import { formatRestSeconds } from '@/features/shared/lib/utils';
import {
  DurationPickerSheet,
  type DurationPickerSheetRef,
} from '@/features/workouts/components/DurationPickerSheet';

export type ExerciseSettings = {
  note: string | null;
  restSeconds: number | null;
};

export type ExerciseSettingsSheetRef = {
  present: (initial: ExerciseSettings, onConfirm: (next: ExerciseSettings) => void) => void;
  dismiss: () => void;
};

type Props = {
  ref?: Ref<ExerciseSettingsSheetRef>;
};

export function ExerciseSettingsSheet({ ref }: Props) {
  const { t } = useTranslation();
  const sheetRef = useRef<BottomSheetRef>(null);
  const durationSheetRef = useRef<DurationPickerSheetRef>(null);
  const [note, setNote] = useState('');
  const [restSeconds, setRestSeconds] = useState<number | null>(null);
  const onConfirmRef = useRef<(next: ExerciseSettings) => void>(() => {});

  useImperativeHandle(ref, () => ({
    present: (initial, onConfirm) => {
      setNote(initial.note ?? '');
      setRestSeconds(initial.restSeconds);
      onConfirmRef.current = onConfirm;
      sheetRef.current?.present();
    },
    dismiss: () => sheetRef.current?.dismiss(),
  }));

  const handleSave = () => {
    const trimmed = note.trim();
    onConfirmRef.current({
      note: trimmed.length > 0 ? trimmed : null,
      restSeconds,
    });
    sheetRef.current?.dismiss();
  };

  return (
    <BottomSheet ref={sheetRef}>
      <BottomSheetView className="gap-5 px-5 pt-2 pb-8">
        <Text variant="h4" className="text-center">
          {t('workoutFormScreen.settingsSheet.title')}
        </Text>

        <View className="gap-2">
          <Text variant="muted">{t('workoutFormScreen.settingsSheet.noteLabel')}</Text>
          <BottomSheetInput
            value={note}
            onChangeText={setNote}
            placeholder={t('workoutFormScreen.settingsSheet.notePlaceholder')}
            multiline
            textAlignVertical="top"
            className="h-28 items-start py-3"
            testID="workout-form.settings.note"
          />
        </View>

        <View className="gap-2">
          <Text variant="muted">{t('workoutFormScreen.settingsSheet.restLabel')}</Text>
          <View className="flex-row items-center gap-2">
            <Pressable
              onPress={() =>
                durationSheetRef.current?.present(
                  restSeconds ?? 0,
                  (secs) => setRestSeconds(secs > 0 ? secs : null),
                  () => setRestSeconds(null),
                )
              }
              accessibilityRole="button"
              testID="workout-form.settings.rest"
              className="h-11 flex-1 flex-row items-center gap-2 rounded-md border border-input px-3"
            >
              <Icon as={Timer} size={16} className="text-muted-foreground" />
              <Text className={restSeconds != null ? 'text-foreground' : 'text-muted-foreground'}>
                {restSeconds != null
                  ? formatRestSeconds(restSeconds)
                  : t('workoutFormScreen.settingsSheet.restNone')}
              </Text>
            </Pressable>
            {restSeconds != null ? (
              <Pressable
                onPress={() => setRestSeconds(null)}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={t('workoutFormScreen.settingsSheet.clearRest')}
                className="h-11 w-11 items-center justify-center rounded-md border border-input"
              >
                <Icon as={X} size={18} className="text-muted-foreground" />
              </Pressable>
            ) : null}
          </View>
        </View>

        <Button onPress={handleSave}>
          <Text>{t('workoutFormScreen.settingsSheet.save')}</Text>
        </Button>
      </BottomSheetView>
      <DurationPickerSheet ref={durationSheetRef} />
    </BottomSheet>
  );
}
