import {
  BottomSheet,
  type BottomSheetRef,
  BottomSheetView,
  Button,
  cn,
  Icon,
  Text,
} from '@workout-tracker/ui-mobile';
import { Trash2 } from 'lucide-react-native';
import { type Ref, useImperativeHandle, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';
import { SET_TYPE_CONFIG, type SetType } from '@/features/exercises/lib/sets';

const SET_TYPE_ORDER: SetType[] = ['warmup', 'normal', 'drop', 'cluster'];

export type SetTypePickerSheetRef = {
  present: (currentType: SetType, onSelect: (type: SetType) => void, onRemove?: () => void) => void;
  dismiss: () => void;
};

export function SetTypePickerSheet({ ref }: { ref?: Ref<SetTypePickerSheetRef> }) {
  const { t } = useTranslation();
  const sheetRef = useRef<BottomSheetRef>(null);
  const [current, setCurrent] = useState<SetType | null>(null);
  const [canRemove, setCanRemove] = useState(false);
  const onSelectRef = useRef<((type: SetType) => void) | null>(null);
  const onRemoveRef = useRef<(() => void) | null>(null);

  useImperativeHandle(ref, () => ({
    present: (currentType, onSelect, onRemove) => {
      setCurrent(currentType);
      onSelectRef.current = onSelect;
      onRemoveRef.current = onRemove ?? null;
      setCanRemove(Boolean(onRemove));
      sheetRef.current?.present();
    },
    dismiss: () => sheetRef.current?.dismiss(),
  }));

  const handleSelect = (type: SetType) => {
    onSelectRef.current?.(type);
    sheetRef.current?.dismiss();
  };

  const handleRemove = () => {
    onRemoveRef.current?.();
    sheetRef.current?.dismiss();
  };

  return (
    <BottomSheet ref={sheetRef}>
      <BottomSheetView className="gap-4 px-5 pt-2 pb-8">
        <View className="gap-2">
          <Text variant="h4">{t('workoutExecutionScreen.setTypePicker.title')}</Text>
          <Text variant="muted" className="text-sm">
            {t('workoutExecutionScreen.setTypePicker.rules')}
          </Text>
        </View>

        <View className="gap-2">
          {SET_TYPE_ORDER.map((type) => {
            const config = SET_TYPE_CONFIG[type];
            const isSelected = current === type;
            return (
              <Pressable
                key={type}
                onPress={() => handleSelect(type)}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                className={cn(
                  'rounded-lg border border-border p-3',
                  isSelected && 'border-primary bg-primary/5',
                )}
              >
                <Text className={cn('font-sans-semibold text-sm', config.textColor)}>
                  {t(config.token)} — {t(config.label)}
                </Text>
                <Text variant="muted" className="mt-1 text-sm">
                  {t(`exerciseDetailScreen.sets.types.descriptions.${type}`)}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {canRemove ? (
          <Button variant="destructive" onPress={handleRemove}>
            <Icon as={Trash2} size={16} className="text-white" />
            <Text className="font-sans-semibold text-sm text-white">
              {t('workoutExecutionScreen.setTypePicker.removeSet')}
            </Text>
          </Button>
        ) : null}
      </BottomSheetView>
    </BottomSheet>
  );
}
