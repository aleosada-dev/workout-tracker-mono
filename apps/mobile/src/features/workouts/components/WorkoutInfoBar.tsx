import { Icon, Text } from '@workout-tracker/ui-mobile';
import { ChevronDown, ChevronUp, StickyNote } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

type WorkoutInfoBarProps = {
  note?: string | null;
  description?: string | null;
};

export function WorkoutInfoBar({ note, description }: WorkoutInfoBarProps) {
  const [expanded, setExpanded] = useState(false);
  const notes = [note, description].map((n) => n?.trim()).filter(Boolean) as string[];

  if (notes.length === 0) return null;

  const visibleNotes = expanded ? notes : notes.slice(0, 1);

  return (
    <Pressable
      onPress={() => setExpanded((v) => !v)}
      accessibilityRole="button"
      accessibilityState={{ expanded }}
    >
      <View className="flex-row items-start gap-2 border-border border-b bg-background px-4 py-2">
        <View className="h-5 justify-center">
          <Icon as={StickyNote} size={14} className="text-foreground" />
        </View>
        <View className="flex-1 gap-0.5">
          {visibleNotes.map((n) => (
            <Text
              key={n}
              className="text-foreground text-sm"
              numberOfLines={expanded ? undefined : 1}
            >
              {n}
            </Text>
          ))}
        </View>
        <View className="h-5 justify-center">
          <Icon as={expanded ? ChevronUp : ChevronDown} size={14} className="text-foreground" />
        </View>
      </View>
    </Pressable>
  );
}
