import { MAX_DEFAULT_SETS_COUNT, MIN_DEFAULT_SETS_COUNT } from '@workout-tracker/domain';
import { Button, Icon, Text } from '@workout-tracker/ui-mobile';
import { Minus, Plus } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

type DefaultSetsCountFieldProps = {
  value: number;
  onChange: (next: number) => void;
};

export function DefaultSetsCountField({ value, onChange }: DefaultSetsCountFieldProps) {
  const { t } = useTranslation();

  const decrement = () => onChange(Math.max(MIN_DEFAULT_SETS_COUNT, value - 1));
  const increment = () => onChange(Math.min(MAX_DEFAULT_SETS_COUNT, value + 1));

  return (
    <View className="flex-row items-center justify-between gap-4 py-2">
      <View className="flex-1 gap-1">
        <Text variant="large">{t('preferencesScreen.defaultSetsCount.label')}</Text>
        <Text variant="muted" className="text-sm">
          {t('preferencesScreen.defaultSetsCount.description')}
        </Text>
      </View>
      <View className="flex-row items-center gap-3">
        <Button
          variant="outline"
          size="icon"
          onPress={decrement}
          disabled={value <= MIN_DEFAULT_SETS_COUNT}
          testID="preferences.defaultSetsCount.decrement"
        >
          <Icon as={Minus} size={18} className="text-foreground" />
        </Button>
        <Text variant="large" className="w-6 text-center tabular-nums">
          {value}
        </Text>
        <Button
          variant="outline"
          size="icon"
          onPress={increment}
          disabled={value >= MAX_DEFAULT_SETS_COUNT}
          testID="preferences.defaultSetsCount.increment"
        >
          <Icon as={Plus} size={18} className="text-foreground" />
        </Button>
      </View>
    </View>
  );
}
