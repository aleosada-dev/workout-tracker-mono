import { AlertCircle, type LucideIcon } from 'lucide-react-native';
import { View } from 'react-native';
import { Button } from './button';
import { Icon } from './icon';
import { Text } from './text';

type RequestErrorStateProps = {
  title: string;
  subtitle: string;
  icon?: LucideIcon;
  retry?: { label: string; onPress: () => void };
  testID?: string;
};

export function RequestErrorState({
  title,
  subtitle,
  icon = AlertCircle,
  retry,
  testID,
}: RequestErrorStateProps) {
  return (
    <View className="flex-1 items-center justify-center gap-4 p-6" testID={testID}>
      <Icon as={icon} size={32} className="text-muted-foreground" />
      <View className="gap-2">
        <Text className="text-center font-sans-semibold">{title}</Text>
        <Text variant="muted" className="text-center">
          {subtitle}
        </Text>
      </View>
      {retry ? (
        <Button onPress={retry.onPress}>
          <Text>{retry.label}</Text>
        </Button>
      ) : null}
    </View>
  );
}

export type { RequestErrorStateProps };
