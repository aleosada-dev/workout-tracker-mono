import type { MeasurementType } from '@workout-tracker/domain';
import {
  BottomSheet,
  type BottomSheetRef,
  BottomSheetView,
  Button,
  cn,
  Icon,
  Text,
} from '@workout-tracker/ui-mobile';
import { Dumbbell, type LucideIcon, Repeat, Timer, Trash2 } from 'lucide-react-native';
import { type Ref, useImperativeHandle, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

type PickerMeasurementType = Extract<MeasurementType, 'weight_reps' | 'reps' | 'duration'>;

const MEASUREMENT_TYPE_ORDER: PickerMeasurementType[] = ['weight_reps', 'reps', 'duration'];

const MEASUREMENT_TYPE_ICONS: Record<PickerMeasurementType, LucideIcon> = {
  weight_reps: Dumbbell,
  reps: Repeat,
  duration: Timer,
};

export type MeasurementTypePickerSheetRef = {
  present: (
    current: MeasurementType,
    onSelect: (type: MeasurementType) => void,
    onRemoveSet?: () => void,
  ) => void;
  dismiss: () => void;
};

export function MeasurementTypePickerSheet({ ref }: { ref?: Ref<MeasurementTypePickerSheetRef> }) {
  const { t } = useTranslation();
  const sheetRef = useRef<BottomSheetRef>(null);
  const [current, setCurrent] = useState<MeasurementType | null>(null);
  const [canRemove, setCanRemove] = useState(false);
  const onSelectRef = useRef<((type: MeasurementType) => void) | null>(null);
  const onRemoveSetRef = useRef<(() => void) | null>(null);

  useImperativeHandle(ref, () => ({
    present: (currentType, onSelect, onRemoveSet) => {
      setCurrent(currentType);
      onSelectRef.current = onSelect;
      onRemoveSetRef.current = onRemoveSet ?? null;
      setCanRemove(Boolean(onRemoveSet));
      sheetRef.current?.present();
    },
    dismiss: () => sheetRef.current?.dismiss(),
  }));

  const handleSelect = (type: MeasurementType) => {
    onSelectRef.current?.(type);
    sheetRef.current?.dismiss();
  };

  const handleRemoveSet = () => {
    onRemoveSetRef.current?.();
    sheetRef.current?.dismiss();
  };

  return (
    <BottomSheet ref={sheetRef}>
      <BottomSheetView className="gap-4 px-5 pt-2 pb-8">
        <View className="gap-2">
          <Text variant="h4">{t('workoutExecutionScreen.measurementTypePicker.title')}</Text>
          <Text variant="muted" className="text-sm">
            {t('workoutExecutionScreen.measurementTypePicker.notice')}
          </Text>
        </View>

        <View className="gap-2">
          {MEASUREMENT_TYPE_ORDER.map((type) => {
            const isSelected = current === type;
            return (
              <Pressable
                key={type}
                onPress={() => handleSelect(type)}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                className={cn(
                  'flex-row items-center gap-3 rounded-lg border border-border p-3',
                  isSelected && 'border-primary bg-primary/5',
                )}
              >
                <Icon
                  as={MEASUREMENT_TYPE_ICONS[type]}
                  size={20}
                  className={isSelected ? 'text-primary' : 'text-foreground'}
                />
                <View className="flex-1">
                  <Text className="font-sans-semibold text-foreground text-sm">
                    {t(`workoutExecutionScreen.measurementTypePicker.options.${type}.label`)}
                  </Text>
                  <Text variant="muted" className="mt-1 text-sm">
                    {t(`workoutExecutionScreen.measurementTypePicker.options.${type}.description`)}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>

        {canRemove ? (
          <Button variant="destructive" onPress={handleRemoveSet}>
            <Icon as={Trash2} size={16} className="text-white" />
            <Text className="font-sans-semibold text-sm text-white">
              {t('workoutExecutionScreen.measurementTypePicker.removeSet')}
            </Text>
          </Button>
        ) : null}
      </BottomSheetView>
    </BottomSheet>
  );
}
