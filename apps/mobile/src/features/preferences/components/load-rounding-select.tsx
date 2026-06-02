import {
  isLoadRoundingMode,
  LOAD_ROUNDING_MODES,
  type LoadRoundingMode,
} from '@workout-tracker/domain';
import { Text, ToggleGroup, ToggleGroupItem } from '@workout-tracker/ui-mobile';
import { useTranslation } from 'react-i18next';

type LoadRoundingSelectProps = {
  value: LoadRoundingMode;
  onValueChange: (value: LoadRoundingMode) => void;
};

const MODE_LABEL_KEY: Record<LoadRoundingMode, string> = {
  none: 'preferencesScreen.loadRounding.modes.none',
  '0.5': 'preferencesScreen.loadRounding.modes.half',
  '1': 'preferencesScreen.loadRounding.modes.one',
  '2.5': 'preferencesScreen.loadRounding.modes.twoAndHalf',
};

export function LoadRoundingSelect({ value, onValueChange }: LoadRoundingSelectProps) {
  const { t } = useTranslation();

  return (
    <ToggleGroup
      type="single"
      value={value}
      onValueChange={(next) => {
        if (isLoadRoundingMode(next)) onValueChange(next);
      }}
      variant="outline"
    >
      {LOAD_ROUNDING_MODES.map((mode, index) => (
        <ToggleGroupItem
          key={mode}
          value={mode}
          isFirst={index === 0}
          isLast={index === LOAD_ROUNDING_MODES.length - 1}
          className="flex-1"
        >
          <Text>{t(MODE_LABEL_KEY[mode])}</Text>
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
