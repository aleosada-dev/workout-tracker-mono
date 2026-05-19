import { View } from 'react-native';
import { Button } from './button';
import { Text } from './text';

type EmptyStateProps = {
  title: string;
  subtitle: string;
  cta?: { label: string; onPress: () => void };
  testID?: string;
};

export function EmptyState({ title, subtitle, cta, testID }: EmptyStateProps) {
  return (
    <View
      className="items-center justify-center gap-3 rounded-lg border border-border border-dashed p-6"
      testID={testID}
    >
      <Text className="text-center font-sans-semibold">{title}</Text>
      <Text variant="muted" className="text-center">
        {subtitle}
      </Text>
      {cta ? (
        <Button onPress={cta.onPress}>
          <Text>{cta.label}</Text>
        </Button>
      ) : null}
    </View>
  );
}

export type { EmptyStateProps };
