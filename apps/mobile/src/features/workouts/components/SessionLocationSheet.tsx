import { useValue } from '@legendapp/state/react';
import { type Ref, useImperativeHandle, useRef } from 'react';
import { useFormContext } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import {
  TrainingLocationSheet,
  type TrainingLocationSheetRef,
} from '@/features/training-locations/components/training-location-sheet';
import { applySessionLocation } from '@/features/workouts/lib/apply-session-location';
import type { ExecutionFormInput } from '@/features/workouts/lib/execution-form';
import { activeWorkout$ } from '@/features/workouts/state/active-workout-store';

export type SessionLocationSheetRef = {
  present: () => void;
};

export function SessionLocationSheet({
  userId,
  onDismiss,
  ref,
}: {
  userId?: string | null;
  onDismiss?: () => void;
  ref?: Ref<SessionLocationSheetRef>;
}) {
  const { t } = useTranslation();
  const { getValues, setValue } = useFormContext<ExecutionFormInput>();
  const sheetRef = useRef<TrainingLocationSheetRef>(null);
  const selectedLocationId = useValue(activeWorkout$.selectedLocationId) ?? null;

  useImperativeHandle(ref, () => ({
    present: () => sheetRef.current?.present(),
  }));

  return (
    <TrainingLocationSheet
      ref={sheetRef}
      title={t('workoutExecutionScreen.locationPicker.title')}
      value={selectedLocationId}
      onValueChange={(locationId) => applySessionLocation(locationId, { getValues, setValue })}
      userId={userId}
      testIDPrefix="workout-execution.location"
      onDismiss={onDismiss}
    />
  );
}
