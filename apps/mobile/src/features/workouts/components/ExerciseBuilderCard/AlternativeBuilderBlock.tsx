import { Icon, Text } from '@workout-tracker/ui-mobile';
import { Repeat, Trash2 } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

interface AlternativeBuilderBlockProps {
  exerciseIndex: number;
  name: string;
  variationName: string | null;
  compact?: boolean;
  onPressName?: () => void;
  onSwap: () => void;
  onRemove: () => void;
}

export function AlternativeBuilderBlock({
  exerciseIndex,
  name,
  variationName,
  compact = false,
  onPressName,
  onSwap,
  onRemove,
}: AlternativeBuilderBlockProps) {
  const { t } = useTranslation();
  const iconSize = compact ? 14 : 16;

  return (
    <View
      className={`rounded-lg border border-border border-dashed bg-muted/30 ${
        compact ? 'mt-1 px-2.5 py-1.5' : 'mx-4 mt-1 p-3'
      }`}
    >
      <View className="flex-row items-center gap-2">
        <Pressable
          className="flex-1"
          onPress={onPressName}
          disabled={!onPressName}
          accessibilityRole={onPressName ? 'button' : undefined}
          testID={`workout-form.alternative-${exerciseIndex}.name`}
        >
          <Text
            className={`font-sans-semibold text-muted-foreground uppercase tracking-wider ${
              compact ? 'text-[10px]' : 'text-xs'
            }`}
          >
            {t('workoutFormScreen.alternative.label')}
          </Text>
          <Text className="font-sans-medium text-foreground text-sm" numberOfLines={1}>
            {name}
          </Text>
          {compact ? null : (
            <Text variant="muted" className="text-xs" numberOfLines={1}>
              {variationName ?? t('workoutExecutionScreen.exercise.noVariation')}
            </Text>
          )}
        </Pressable>
        <Pressable
          onPress={onSwap}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={t('workoutFormScreen.alternative.swap')}
          testID={`workout-form.alternative-${exerciseIndex}.swap`}
        >
          <Icon as={Repeat} size={iconSize} className="text-muted-foreground" />
        </Pressable>
        <View className={compact ? 'w-2' : 'w-4'} />
        <Pressable
          onPress={onRemove}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={t('workoutFormScreen.alternative.remove')}
          testID={`workout-form.alternative-${exerciseIndex}.remove`}
        >
          <Icon as={Trash2} size={iconSize} className="text-destructive" />
        </Pressable>
      </View>
    </View>
  );
}
