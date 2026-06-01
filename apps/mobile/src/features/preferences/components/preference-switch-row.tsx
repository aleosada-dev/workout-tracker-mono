import { Switch, Text } from '@workout-tracker/ui-mobile';
import { View } from 'react-native';

type PreferenceSwitchRowProps = {
  label: string;
  description?: string;
  value: boolean;
  onValueChange: (next: boolean) => void;
  disabled?: boolean;
};

export function PreferenceSwitchRow({
  label,
  description,
  value,
  onValueChange,
  disabled,
}: PreferenceSwitchRowProps) {
  return (
    <View className="flex-row items-center justify-between gap-4 py-2">
      <View className="flex-1 gap-1">
        <Text variant="large">{label}</Text>
        {description ? (
          <Text variant="muted" className="text-sm">
            {description}
          </Text>
        ) : null}
      </View>
      <Switch checked={value} onCheckedChange={onValueChange} disabled={disabled} />
    </View>
  );
}
