import { Icon, Text } from '@workout-tracker/ui-mobile';
import { ChevronDown, ChevronUp, Clock } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { useElapsedSince } from '@/features/shared/hooks/use-elapsed-since';

type WorkoutInfoBarProps = {
  startedAt: string;
  description?: string | null;
};

export function WorkoutInfoBar({ startedAt, description }: WorkoutInfoBarProps) {
  const elapsed = useElapsedSince(startedAt);
  const [expanded, setExpanded] = useState(false);
  const hasNote = Boolean(description?.trim());

  const hh = elapsed ? String(elapsed.hours).padStart(2, '0') : '00';
  const mm = elapsed ? String(elapsed.minutes).padStart(2, '0') : '00';

  const content = (
    <View className="flex-row items-center gap-2 border-border border-b bg-background px-4 py-2">
      <Icon as={Clock} size={14} className="text-foreground" />
      <Text className="font-mono text-foreground text-sm">{`${hh}:${mm}`}</Text>
      {hasNote ? (
        <>
          <Text variant="muted" className="text-xs">
            ·
          </Text>
          <Text variant="muted" className="flex-1 text-sm" numberOfLines={expanded ? undefined : 1}>
            {description}
          </Text>
          <Icon
            as={expanded ? ChevronUp : ChevronDown}
            size={14}
            className="text-muted-foreground"
          />
        </>
      ) : null}
    </View>
  );

  if (!hasNote) return content;

  return (
    <Pressable
      onPress={() => setExpanded((v) => !v)}
      accessibilityRole="button"
      accessibilityState={{ expanded }}
    >
      {content}
    </Pressable>
  );
}
