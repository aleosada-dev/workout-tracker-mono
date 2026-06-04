import {
  BottomSheet,
  type BottomSheetRef,
  BottomSheetView,
  Button,
  Text,
} from '@workout-tracker/ui-mobile';
import { type Ref, useImperativeHandle, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { WorkoutDurationWheels } from '@/features/workouts/components/WorkoutDurationWheels';

export type WorkoutDurationSheetRef = {
  present: (currentSeconds: number, onConfirm: (totalSeconds: number) => void) => void;
  dismiss: () => void;
};

export function WorkoutDurationSheet({ ref }: { ref?: Ref<WorkoutDurationSheetRef> }) {
  const { t } = useTranslation();
  const sheetRef = useRef<BottomSheetRef>(null);
  const [seconds, setSeconds] = useState(0);
  const onConfirmRef = useRef<((totalSeconds: number) => void) | null>(null);

  useImperativeHandle(ref, () => ({
    present: (currentSeconds, onConfirm) => {
      setSeconds(currentSeconds);
      onConfirmRef.current = onConfirm;
      sheetRef.current?.present();
    },
    dismiss: () => sheetRef.current?.dismiss(),
  }));

  const handleConfirm = () => {
    onConfirmRef.current?.(seconds);
    sheetRef.current?.dismiss();
  };

  return (
    <BottomSheet ref={sheetRef} enableContentPanningGesture={false}>
      <BottomSheetView className="gap-4 px-5 pt-2 pb-8">
        <Text variant="h4" className="text-center">
          {t('workoutExecutionSummaryScreen.durationEdit.title')}
        </Text>
        <WorkoutDurationWheels seconds={seconds} onChange={setSeconds} />
        <Button onPress={handleConfirm}>
          <Text>{t('workoutExecutionSummaryScreen.durationEdit.confirm')}</Text>
        </Button>
      </BottomSheetView>
    </BottomSheet>
  );
}
