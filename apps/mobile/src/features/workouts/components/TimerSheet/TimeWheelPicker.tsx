import WheelPicker from '@quidone/react-native-wheel-picker';
import { rgb, useTheme } from '@workout-tracker/ui-mobile';
import { View } from 'react-native';

const MINUTES = Array.from({ length: 60 }, (_, i) => ({
  value: i,
  label: `${i} min`,
}));
const SECONDS = Array.from({ length: 60 }, (_, i) => ({
  value: i,
  label: `${i} s`,
}));

type Props = {
  totalSeconds: number;
  onChange: (totalSeconds: number) => void;
};

export function TimeWheelPicker({ totalSeconds, onChange }: Props) {
  const theme = useTheme();
  const minutes = Math.floor(totalSeconds / 60) % 60;
  const seconds = totalSeconds % 60;

  const itemTextStyle = { color: rgb(theme.foreground), fontSize: 18 };
  const overlayItemStyle = { backgroundColor: rgb(theme.muted) };

  return (
    <View className="flex-row items-center justify-center gap-6">
      <WheelPicker
        data={MINUTES}
        value={minutes}
        onValueChanged={({ item }) => onChange(item.value * 60 + seconds)}
        itemTextStyle={itemTextStyle}
        overlayItemStyle={overlayItemStyle}
        width={120}
      />
      <WheelPicker
        data={SECONDS}
        value={seconds}
        onValueChanged={({ item }) => onChange(minutes * 60 + item.value)}
        itemTextStyle={itemTextStyle}
        overlayItemStyle={overlayItemStyle}
        width={120}
      />
    </View>
  );
}
