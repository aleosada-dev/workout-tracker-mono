import { Host, HStack, Picker, Text as UIText } from '@expo/ui/swift-ui';
import { frame, pickerStyle, tag } from '@expo/ui/swift-ui/modifiers';

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = Array.from({ length: 60 }, (_, i) => i);

type Props = {
  seconds: number;
  onChange: (totalSeconds: number) => void;
};

export function WorkoutDurationWheels({ seconds, onChange }: Props) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  return (
    <Host style={{ height: 200 }}>
      <HStack spacing={0}>
        <Picker
          selection={hours}
          onSelectionChange={(h) => onChange(h * 3600 + minutes * 60)}
          modifiers={[pickerStyle('wheel'), frame({ width: 140, height: 200 })]}
        >
          {HOURS.map((h) => (
            <UIText key={h} modifiers={[tag(h)]}>{`${h} h`}</UIText>
          ))}
        </Picker>
        <Picker
          selection={minutes}
          onSelectionChange={(m) => onChange(hours * 3600 + m * 60)}
          modifiers={[pickerStyle('wheel'), frame({ width: 140, height: 200 })]}
        >
          {MINUTES.map((m) => (
            <UIText key={m} modifiers={[tag(m)]}>{`${m} min`}</UIText>
          ))}
        </Picker>
      </HStack>
    </Host>
  );
}
