import type { WeightUnit } from '@workout-tracker/domain';
import {
  BottomSheet,
  BottomSheetInput,
  type BottomSheetRef,
  BottomSheetView,
  Button,
  Icon,
  Text,
} from '@workout-tracker/ui-mobile';
import * as Clipboard from 'expo-clipboard';
import { ArrowLeftRight } from 'lucide-react-native';
import { type Ref, useImperativeHandle, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';
import { sanitizeDecimal } from '@/features/shared/lib/utils';
import { formatConvertedWeight } from '@/features/workouts/lib/format-converted-weight';

const MAX_INTEGER_DIGITS = 4;
const MAX_FRACTION_DIGITS = 2;

export type KgLbsCalculatorSheetRef = {
  present: () => void;
  dismiss: () => void;
};

type Props = {
  ref?: Ref<KgLbsCalculatorSheetRef>;
};

export function KgLbsCalculatorSheet({ ref }: Props) {
  const { t, i18n } = useTranslation();
  const sheetRef = useRef<BottomSheetRef>(null);
  const [from, setFrom] = useState<WeightUnit>('kg');
  const [value, setValue] = useState('');

  useImperativeHandle(ref, () => ({
    present: () => {
      setFrom('kg');
      setValue('');
      sheetRef.current?.present();
    },
    dismiss: () => sheetRef.current?.dismiss(),
  }));

  const to: WeightUnit = from === 'kg' ? 'lb' : 'kg';
  const converted = formatConvertedWeight(value, from, to, i18n.language);

  const handleSwap = () => {
    setFrom(to);
    setValue(converted);
  };

  const handleCopy = async () => {
    if (converted === '') return;
    await Clipboard.setStringAsync(converted);
    sheetRef.current?.dismiss();
  };

  const fromHeader = t(`workoutExecutionScreen.kgLbsCalculatorSheet.headers.${from}`);
  const toHeader = t(`workoutExecutionScreen.kgLbsCalculatorSheet.headers.${to}`);

  return (
    <BottomSheet ref={sheetRef}>
      <BottomSheetView className="gap-5 px-5 pt-2 pb-8">
        <Text variant="h4" className="text-center">
          {t('workoutExecutionScreen.kgLbsCalculatorSheet.title')}
        </Text>

        <View className="gap-1">
          <View className="flex-row gap-3">
            <Text variant="muted" className="flex-1 text-xs uppercase">
              {fromHeader}
            </Text>
            <View className="w-9" />
            <Text variant="muted" className="flex-1 text-xs uppercase">
              {toHeader}
            </Text>
          </View>

          <View className="flex-row items-center gap-3">
            <BottomSheetInput
              keyboardType="decimal-pad"
              value={value}
              onChangeText={(text) =>
                setValue(
                  sanitizeDecimal(text, {
                    maxIntegerDigits: MAX_INTEGER_DIGITS,
                    maxFractionDigits: MAX_FRACTION_DIGITS,
                  }),
                )
              }
              className="flex-1"
            />

            <Pressable
              onPress={handleSwap}
              accessibilityRole="button"
              accessibilityLabel={t('workoutExecutionScreen.kgLbsCalculatorSheet.swap')}
              hitSlop={8}
              className="h-9 w-9 items-center justify-center rounded-full bg-muted active:opacity-70"
            >
              <Icon as={ArrowLeftRight} size={18} className="text-foreground" />
            </Pressable>

            <View className="h-10 flex-1 justify-center rounded-md border border-input bg-muted/40 px-3 sm:h-9">
              <Text className="text-base text-foreground">{converted}</Text>
            </View>
          </View>
        </View>

        <Button onPress={handleCopy} disabled={converted === ''}>
          <Text>{t('workoutExecutionScreen.kgLbsCalculatorSheet.copy')}</Text>
        </Button>
      </BottomSheetView>
    </BottomSheet>
  );
}
