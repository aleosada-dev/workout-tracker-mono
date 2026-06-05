import { WEIGHT_UNITS, type WeightUnit } from '@workout-tracker/domain';
import { Text, ToggleGroup, ToggleGroupItem } from '@workout-tracker/ui-mobile';

type WeightUnitSelectProps = {
  value: WeightUnit;
  onValueChange: (value: WeightUnit) => void;
};

function isWeightUnit(value: string | undefined): value is WeightUnit {
  return value === 'kg' || value === 'lb';
}

export function WeightUnitSelect({ value, onValueChange }: WeightUnitSelectProps) {
  return (
    <ToggleGroup
      type="single"
      value={value}
      onValueChange={(next) => {
        if (isWeightUnit(next)) onValueChange(next);
      }}
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
  );
}
