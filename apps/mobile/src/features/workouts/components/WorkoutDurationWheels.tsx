import WheelPicker from '@quidone/react-native-wheel-picker';
import { rgb, useTheme } from '@workout-tracker/ui-mobile';
import { View } from 'react-native';

const HOURS = Array.from({ length: 24 }, (_, i) => ({ value: i, label: `${i} h` }));
const MINUTES = Array.from({ length: 60 }, (_, i) => ({ value: i, label: `${i} min` }));

type Props = {
  seconds: number;
  onChange: (totalSeconds: number) => void;
};

export function WorkoutDurationWheels({ seconds, onChange }: Props) {
  const theme = useTheme();
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  const itemTextStyle = { color: rgb(theme.foreground), fontSize: 18 };
  const overlayItemStyle = { backgroundColor: rgb(theme.muted) };

  return (
    <View className="flex-row items-center justify-center gap-6">
      <WheelPicker
        data={HOURS}
        value={hours}
        onValueChanged={({ item }) => onChange(item.value * 3600 + minutes * 60)}
        itemTextStyle={itemTextStyle}
        overlayItemStyle={overlayItemStyle}
        width={120}
      />
      <WheelPicker
        data={MINUTES}
        value={minutes}
        onValueChanged={({ item }) => onChange(hours * 3600 + item.value * 60)}
        itemTextStyle={itemTextStyle}
        overlayItemStyle={overlayItemStyle}
        width={120}
      />
    </View>
  );
}
