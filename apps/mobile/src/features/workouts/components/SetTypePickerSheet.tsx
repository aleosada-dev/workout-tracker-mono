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

export type SetTypePickerRemoval = {
  onRemoveSet?: () => void;
  onRemoveSupersetSet?: () => void;
};

export type SetTypePickerSheetRef = {
  present: (
    currentType: SetType,
    validTypes: readonly SetType[],
    onSelect: (type: SetType) => void,
    removal?: SetTypePickerRemoval,
  ) => void;
  dismiss: () => void;
};

export function SetTypePickerSheet({ ref }: { ref?: Ref<SetTypePickerSheetRef> }) {
  const { t } = useTranslation();
  const sheetRef = useRef<BottomSheetRef>(null);
  const [current, setCurrent] = useState<SetType | null>(null);
  const [validTypes, setValidTypes] = useState<readonly SetType[]>(SET_TYPE_ORDER);
  const [removal, setRemoval] = useState<SetTypePickerRemoval>({});
  const onSelectRef = useRef<((type: SetType) => void) | null>(null);
  const onRemoveSetRef = useRef<(() => void) | null>(null);
  const onRemoveSupersetSetRef = useRef<(() => void) | null>(null);

  useImperativeHandle(ref, () => ({
    present: (currentType, nextValidTypes, onSelect, nextRemoval) => {
      setCurrent(currentType);
      setValidTypes(nextValidTypes);
      onSelectRef.current = onSelect;
      onRemoveSetRef.current = nextRemoval?.onRemoveSet ?? null;
      onRemoveSupersetSetRef.current = nextRemoval?.onRemoveSupersetSet ?? null;
      setRemoval({
        onRemoveSet: nextRemoval?.onRemoveSet,
        onRemoveSupersetSet: nextRemoval?.onRemoveSupersetSet,
      });
      sheetRef.current?.present();
    },
    dismiss: () => sheetRef.current?.dismiss(),
  }));

  const handleSelect = (type: SetType) => {
    onSelectRef.current?.(type);
    sheetRef.current?.dismiss();
  };

  const handleRemoveSet = () => {
    onRemoveSetRef.current?.();
    sheetRef.current?.dismiss();
  };

  const handleRemoveSupersetSet = () => {
    onRemoveSupersetSetRef.current?.();
    sheetRef.current?.dismiss();
  };

  const isSuperset = Boolean(removal.onRemoveSupersetSet);

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
            const isDisabled = !validTypes.includes(type);
            return (
              <Pressable
                key={type}
                onPress={() => handleSelect(type)}
                disabled={isDisabled}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected, disabled: isDisabled }}
                className={cn(
                  'rounded-lg border border-border p-3',
                  isSelected && 'border-primary bg-primary/5',
                  isDisabled && 'opacity-40',
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

        {removal.onRemoveSet ? (
          <Button variant={isSuperset ? 'outline' : 'destructive'} onPress={handleRemoveSet}>
            <Icon
              as={Trash2}
              size={16}
              className={isSuperset ? 'text-destructive' : 'text-white'}
            />
            <Text
              className={cn(
                'font-sans-semibold text-sm',
                isSuperset ? 'text-destructive' : 'text-white',
              )}
            >
              {t(
                isSuperset
                  ? 'workoutExecutionScreen.setTypePicker.removeExerciseSet'
                  : 'workoutExecutionScreen.setTypePicker.removeSet',
              )}
            </Text>
          </Button>
        ) : null}

        {removal.onRemoveSupersetSet ? (
          <Button variant="destructive" onPress={handleRemoveSupersetSet}>
            <Icon as={Trash2} size={16} className="text-white" />
            <Text className="font-sans-semibold text-sm text-white">
              {t('workoutExecutionScreen.setTypePicker.removeSupersetSet')}
            </Text>
          </Button>
        ) : null}
      </BottomSheetView>
    </BottomSheet>
  );
}
