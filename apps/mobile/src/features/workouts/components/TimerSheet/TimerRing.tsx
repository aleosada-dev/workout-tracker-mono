import { rgb, Text, useTheme } from '@workout-tracker/ui-mobile';
import { Pressable, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

type Props = {
  size?: number;
  strokeWidth?: number;
  /** 0 → vazio, 1 → cheio */
  progress: number;
  label: string;
  onPress?: () => void;
};

export function TimerRing({ size = 260, strokeWidth = 10, progress, label, onPress }: Props) {
  const theme = useTheme();
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(1, progress));
  const dashOffset = -circumference * (1 - clamped);

  const Wrapper = onPress ? Pressable : View;

  return (
    <View className="items-center">
      <Wrapper
        onPress={onPress}
        accessibilityRole={onPress ? 'button' : undefined}
        style={{ width: size, height: size }}
        className="items-center justify-center"
      >
        <Svg
          width={size}
          height={size}
          style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}
        >
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={rgb(theme.muted)}
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={rgb(theme.primary)}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            fill="transparent"
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={dashOffset}
          />
        </Svg>
        <Text
          className="font-sans-semibold text-6xl tabular-nums"
          style={{ lineHeight: 72, includeFontPadding: false }}
        >
          {label}
        </Text>
      </Wrapper>
    </View>
  );
}
