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

export type ExerciseNoteSheetRef = {
  present: (initial: string | null, onConfirm: (next: string | null) => void) => void;
  dismiss: () => void;
};

export function ExerciseNoteSheet({ ref }: { ref?: Ref<ExerciseNoteSheetRef> }) {
  const { t } = useTranslation();
  const sheetRef = useRef<BottomSheetRef>(null);
  const [note, setNote] = useState('');
  const onConfirmRef = useRef<(next: string | null) => void>(() => {});

  useImperativeHandle(ref, () => ({
    present: (initial, onConfirm) => {
      setNote(initial ?? '');
      onConfirmRef.current = onConfirm;
      sheetRef.current?.present();
    },
    dismiss: () => sheetRef.current?.dismiss(),
  }));

  const handleSave = () => {
    const trimmed = note.trim();
    onConfirmRef.current(trimmed.length > 0 ? trimmed : null);
    sheetRef.current?.dismiss();
  };

  return (
    <BottomSheet ref={sheetRef}>
      <BottomSheetView className="gap-5 px-5 pt-2 pb-8">
        <Text variant="h4" className="text-center">
          {t('workoutFormScreen.noteSheet.title')}
        </Text>
        <BottomSheetInput
          value={note}
          onChangeText={setNote}
          placeholder={t('workoutFormScreen.noteSheet.placeholder')}
          multiline
          textAlignVertical="top"
          className="h-28 items-start py-3"
          testID="workout-form.note.input"
        />
        <Button onPress={handleSave}>
          <Text>{t('workoutFormScreen.noteSheet.save')}</Text>
        </Button>
      </BottomSheetView>
    </BottomSheet>
  );
}
