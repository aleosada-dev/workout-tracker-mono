import { Icon, Text } from '@workout-tracker/ui-mobile';
import type { LucideIcon } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

export function FolderTile({
  label,
  icon,
  tileClassName,
  iconClassName,
  selected,
  onPress,
}: {
  label: string;
  icon: LucideIcon;
  tileClassName: string;
  iconClassName: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      className="w-20 items-center gap-2"
    >
      <View
        className={`h-16 w-16 items-center justify-center rounded-2xl ${tileClassName} ${
          selected ? 'border-2 border-primary' : 'border-2 border-transparent'
        }`}
      >
        <Icon as={icon} size={28} className={iconClassName} />
      </View>
      <Text
        variant="small"
        numberOfLines={2}
        className={`text-center ${selected ? 'font-medium text-foreground' : ''}`}
      >
        {label}
      </Text>
    </Pressable>
  );
}
