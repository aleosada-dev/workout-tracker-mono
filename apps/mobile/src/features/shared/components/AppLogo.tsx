import { rgb, useTheme } from '@workout-tracker/ui-mobile';
import Svg, { Circle, G, Path } from 'react-native-svg';

type Props = {
  size?: number;
};

export function AppLogo({ size = 80 }: Props) {
  const theme = useTheme();

  return (
    <Svg width={size} height={size} viewBox="0 0 512 512">
      <Circle cx={256} cy={256} r={150} fill="none" stroke={rgb(theme.muted)} strokeWidth={36} />
      <Circle
        cx={256}
        cy={256}
        r={150}
        fill="none"
        stroke={rgb(theme.primary)}
        strokeWidth={36}
        strokeLinecap="round"
        strokeDasharray="707 942"
        transform="rotate(-90, 256, 256)"
      />
      <G fill={rgb(theme.foreground)} stroke={rgb(theme.border)} strokeWidth={2.5}>
        <Circle cx={184} cy={196} r={26} />
        <Circle cx={256} cy={220} r={26} />
        <Circle cx={328} cy={196} r={26} />
        <Circle cx={220} cy={316} r={26} />
        <Circle cx={292} cy={316} r={26} />
      </G>
      <Path
        d="M 184 196 L 220 316 L 256 220 L 292 316 L 328 196"
        stroke={rgb(theme.foreground)}
        strokeWidth={22}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
}
