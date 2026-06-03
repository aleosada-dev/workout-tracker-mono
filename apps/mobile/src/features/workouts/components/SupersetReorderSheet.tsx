import {
  BottomSheet,
  type BottomSheetRef,
  BottomSheetView,
  Button,
  Icon,
  Text,
} from '@workout-tracker/ui-mobile';
import { ArrowDown, ArrowUp } from 'lucide-react-native';
import { type Ref, useImperativeHandle, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';
import type { SupersetMember } from '@/features/workouts/lib/workout-mappers';

const LETTERS = ['A', 'B', 'C'];

export type SupersetReorderSheetRef = {
  present: (
    members: SupersetMember[],
    onConfirm: (orderedExerciseIndexes: number[]) => void,
  ) => void;
  dismiss: () => void;
};

export function SupersetReorderSheet({ ref }: { ref?: Ref<SupersetReorderSheetRef> }) {
  const { t } = useTranslation();
  const sheetRef = useRef<BottomSheetRef>(null);
  const [order, setOrder] = useState<SupersetMember[]>([]);
  const onConfirmRef = useRef<((orderedExerciseIndexes: number[]) => void) | null>(null);

  useImperativeHandle(ref, () => ({
    present: (members, onConfirm) => {
      setOrder(members);
      onConfirmRef.current = onConfirm;
      sheetRef.current?.present();
    },
    dismiss: () => sheetRef.current?.dismiss(),
  }));

  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= order.length) return;
    setOrder((current) => {
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const handleConfirm = () => {
    onConfirmRef.current?.(order.map((member) => member.exerciseIndex));
    sheetRef.current?.dismiss();
  };

  return (
    <BottomSheet ref={sheetRef}>
      <BottomSheetView className="gap-4 px-5 pt-2 pb-8">
        <View className="gap-2">
          <Text variant="h4">{t('workoutExecutionScreen.selection.reorderTitle')}</Text>
          <Text variant="muted" className="text-sm">
            {t('workoutExecutionScreen.selection.reorderHint')}
          </Text>
        </View>

        <View className="gap-2">
          {order.map((member, index) => (
            <View
              key={member.exerciseIndex}
              className="flex-row items-center gap-3 rounded-lg border border-border p-3"
            >
              <View className="h-6 w-6 items-center justify-center rounded-full bg-primary">
                <Text className="font-sans-semibold text-primary-foreground text-xs">
                  {LETTERS[index] ?? '?'}
                </Text>
              </View>
              <Text className="flex-1 text-sm" numberOfLines={1}>
                {member.name}
              </Text>
              <Pressable
                onPress={() => move(index, -1)}
                disabled={index === 0}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={t('workoutExecutionScreen.selection.moveUp')}
                className={index === 0 ? 'opacity-30' : undefined}
              >
                <Icon as={ArrowUp} size={20} className="text-foreground" />
              </Pressable>
              <Pressable
                onPress={() => move(index, 1)}
                disabled={index === order.length - 1}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={t('workoutExecutionScreen.selection.moveDown')}
                className={index === order.length - 1 ? 'opacity-30' : undefined}
              >
                <Icon as={ArrowDown} size={20} className="text-foreground" />
              </Pressable>
            </View>
          ))}
        </View>

        <Button onPress={handleConfirm}>
          <Text className="font-sans-semibold text-primary-foreground">
            {t('workoutExecutionScreen.selection.reorderConfirm')}
          </Text>
        </Button>
      </BottomSheetView>
    </BottomSheet>
  );
}
