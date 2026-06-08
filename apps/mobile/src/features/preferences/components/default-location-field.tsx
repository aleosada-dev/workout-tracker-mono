import { Text } from '@workout-tracker/ui-mobile';
import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable } from 'react-native';
import {
  TrainingLocationSheet,
  type TrainingLocationSheetRef,
} from '@/features/training-locations/components/training-location-sheet';
import { useTrainingLocations } from '@/features/training-locations/hooks/use-training-locations';

type DefaultLocationFieldProps = {
  value: string | null;
  onValueChange: (value: string | null) => void;
};

export function DefaultLocationField({ value, onValueChange }: DefaultLocationFieldProps) {
  const { t } = useTranslation();
  const { data: locations } = useTrainingLocations();
  const sheetRef = useRef<TrainingLocationSheetRef>(null);

  const noneLabel = t('preferencesScreen.defaultLocation.none');
  const selectedLabel =
    (value ? (locations ?? []).find((l) => l.id === value)?.name : null) ?? noneLabel;

  return (
    <>
      <Pressable
        onPress={() => sheetRef.current?.present()}
        className="h-10 w-full flex-row items-center rounded-md border border-input bg-background px-3"
        testID="preferences.defaultLocation"
      >
        <Text className={value == null ? 'text-muted-foreground/50' : ''}>{selectedLabel}</Text>
      </Pressable>

      <TrainingLocationSheet
        ref={sheetRef}
        title={t('preferencesScreen.defaultLocation.label')}
        value={value}
        onValueChange={onValueChange}
        testIDPrefix="preferences.defaultLocation"
      />
    </>
  );
}
