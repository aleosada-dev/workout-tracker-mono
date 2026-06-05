import {
  isValidRounding,
  isWeightUnit,
  ROUNDING_INCREMENTS,
  WEIGHT_UNITS,
  type WeightPreference,
} from '@workout-tracker/domain';
import { Label, Text, ToggleGroup, ToggleGroupItem } from '@workout-tracker/ui-mobile';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

type WeightPreferenceFieldProps = {
  value: WeightPreference;
  onChange: (next: WeightPreference) => void;
};

const NONE = 'none';

export function WeightPreferenceField({ value, onChange }: WeightPreferenceFieldProps) {
  const { t, i18n } = useTranslation();
  const increments = ROUNDING_INCREMENTS[value.unit];
  const numberFormat = new Intl.NumberFormat(i18n.language);

  const handleUnitChange = (next: string | undefined) => {
    if (!isWeightUnit(next)) return;
    // Keep the rounding only when it is still a valid increment for the new unit.
    const rounding = isValidRounding(next, value.rounding) ? value.rounding : null;
    onChange({ unit: next, rounding });
  };

  const handleRoundingChange = (next: string | undefined) => {
    if (!next) return;
    onChange({ ...value, rounding: next === NONE ? null : Number(next) });
  };

  const roundingValue = value.rounding == null ? NONE : String(value.rounding);

  return (
    <View className="gap-4">
      <View className="gap-2">
        <Label>{t('preferencesScreen.weight.unitLabel')}</Label>
        <ToggleGroup
          type="single"
          value={value.unit}
          onValueChange={handleUnitChange}
          variant="outline"
        >
          {WEIGHT_UNITS.map((unit, index) => (
            <ToggleGroupItem
              key={unit}
              value={unit}
              isFirst={index === 0}
              isLast={index === WEIGHT_UNITS.length - 1}
              className="flex-1"
            >
              <Text>{unit}</Text>
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </View>

      <View className="gap-2">
        <Label>{t('preferencesScreen.weight.roundingLabel')}</Label>
        <Text variant="muted" className="text-sm">
          {t('preferencesScreen.weight.roundingDescription')}
        </Text>
        <ToggleGroup
          type="single"
          value={roundingValue}
          onValueChange={handleRoundingChange}
          variant="outline"
        >
          <ToggleGroupItem value={NONE} isFirst isLast={false} className="flex-1">
            <Text>{t('preferencesScreen.weight.roundingNone')}</Text>
          </ToggleGroupItem>
          {increments.map((increment, index) => (
            <ToggleGroupItem
              key={increment}
              value={String(increment)}
              isFirst={false}
              isLast={index === increments.length - 1}
              className="flex-1"
            >
              <Text>{`${numberFormat.format(increment)} ${value.unit}`}</Text>
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </View>
    </View>
  );
}
