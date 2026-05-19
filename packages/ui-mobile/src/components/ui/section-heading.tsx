import type { LucideIcon } from 'lucide-react-native';
import { View } from 'react-native';
import { cn } from '../../lib/utils';
import { Icon } from './icon';
import { Text } from './text';

export type SectionHeadingProps = {
  /** Leading icon. */
  icon: LucideIcon;
  /** Tailwind classes for the icon (e.g. a color token). */
  iconClassName?: string;
  title: string;
  className?: string;
  testID?: string;
};

/** A labelled section header: a small leading icon followed by a heading. */
export function SectionHeading({
  icon,
  iconClassName,
  title,
  className,
  testID,
}: SectionHeadingProps) {
  return (
    <View className={cn('flex-row items-center gap-2 px-1', className)} testID={testID}>
      <Icon as={icon} size={18} className={iconClassName} />
      <Text variant="h4">{title}</Text>
    </View>
  );
}
