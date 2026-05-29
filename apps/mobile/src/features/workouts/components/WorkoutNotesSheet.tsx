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
import { activeWorkout$ } from '@/features/workouts/state/active-workout-store';

export type WorkoutNotesSheetRef = {
  present: () => void;
  dismiss: () => void;
};

type Props = {
  ref?: Ref<WorkoutNotesSheetRef>;
};

export function WorkoutNotesSheet({ ref }: Props) {
  const { t } = useTranslation();
  const sheetRef = useRef<BottomSheetRef>(null);
  const [value, setValue] = useState('');

  useImperativeHandle(ref, () => ({
    present: () => {
      setValue(activeWorkout$.note.peek() ?? '');
      sheetRef.current?.present();
    },
    dismiss: () => sheetRef.current?.dismiss(),
  }));

  const handleSave = () => {
    const trimmed = value.trim();
    activeWorkout$.note.set(trimmed.length > 0 ? trimmed : null);
    sheetRef.current?.dismiss();
  };

  return (
    <BottomSheet ref={sheetRef}>
      <BottomSheetView className="gap-5 px-5 pt-2 pb-8">
        <View className="gap-1">
          <Text variant="h4" className="text-center">
            {t('workoutExecutionScreen.notesSheet.title')}
          </Text>
          <Text variant="muted">{t('workoutExecutionScreen.notesSheet.subtitle')}</Text>
        </View>

        <BottomSheetInput
          value={value}
          onChangeText={setValue}
          placeholder={t('workoutExecutionScreen.notesSheet.placeholder')}
          multiline
          textAlignVertical="top"
          className="h-40 items-start py-3"
        />

        <Button onPress={handleSave}>
          <Text>{t('workoutExecutionScreen.notesSheet.save')}</Text>
        </Button>
      </BottomSheetView>
    </BottomSheet>
  );
}
