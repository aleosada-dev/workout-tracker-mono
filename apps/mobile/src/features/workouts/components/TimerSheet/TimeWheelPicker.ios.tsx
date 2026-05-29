import { Host, HStack, Picker, Text as UIText } from '@expo/ui/swift-ui';
import { frame, pickerStyle, tag } from '@expo/ui/swift-ui/modifiers';

const MINUTES = Array.from({ length: 60 }, (_, i) => i);
const SECONDS = Array.from({ length: 60 }, (_, i) => i);

type Props = {
  totalSeconds: number;
  onChange: (totalSeconds: number) => void;
};

export function TimeWheelPicker({ totalSeconds, onChange }: Props) {
  const minutes = Math.floor(totalSeconds / 60) % 60;
  const seconds = totalSeconds % 60;

  return (
    <Host style={{ height: 200 }}>
      <HStack spacing={0}>
        <Picker
          selection={minutes}
          onSelectionChange={(m) => onChange(m * 60 + seconds)}
          modifiers={[pickerStyle('wheel'), frame({ width: 140, height: 200 })]}
        >
          {MINUTES.map((m) => (
            <UIText key={m} modifiers={[tag(m)]}>{`${m} min`}</UIText>
          ))}
        </Picker>
        <Picker
          selection={seconds}
          onSelectionChange={(s) => onChange(minutes * 60 + s)}
          modifiers={[pickerStyle('wheel'), frame({ width: 140, height: 200 })]}
        >
          {SECONDS.map((s) => (
            <UIText key={s} modifiers={[tag(s)]}>{`${s} s`}</UIText>
          ))}
        </Picker>
      </HStack>
    </Host>
  );
}
