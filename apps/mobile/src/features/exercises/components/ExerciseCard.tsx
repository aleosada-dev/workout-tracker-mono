import { Card, CardContent, Icon, Text } from '@workout-tracker/ui-mobile';
import {
  CheckCircle2,
  Circle,
  Dumbbell,
  Globe,
  type LucideIcon,
  User,
  Users,
} from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';
import type { ExerciseListItem } from '@/features/exercises/lib/list.types';

const VISIBILITY_META: Record<string, { icon: LucideIcon; labelKey: string }> = {
  public: { icon: Globe, labelKey: 'exercises.visibility.public' },
  shared: { icon: Users, labelKey: 'exercises.visibility.shared' },
  owned: { icon: User, labelKey: 'exercises.visibility.owned' },
};

export type ExerciseCardProps = {
  exercise: ExerciseListItem;
  /** Show the selection checkmark on the right edge. */
  selectable?: boolean;
  selected?: boolean;
  onPress?: () => void;
  onLongPress?: () => void;
};

export function ExerciseCard({
  exercise,
  selectable = false,
  selected = false,
  onPress,
  onLongPress,
}: ExerciseCardProps) {
  const { t } = useTranslation();
  const visibility = VISIBILITY_META[exercise.visibility];
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={350}
      testID="exercise-card"
    >
      <Card className="p-2">
        <CardContent className="flex-row items-center gap-3 p-0">
          <View className="h-16 w-16 items-center justify-center rounded-sm bg-primary">
            <Icon as={Dumbbell} size={28} className="text-primary-foreground" />
          </View>
          <View className="flex-1 gap-0">
            <Text className="font-sans-semibold leading-tight">{exercise.name}</Text>
            {exercise.variationName && (
              <Text className="text-muted-foreground text-xs">{exercise.variationName}</Text>
            )}
            <View className="mt-1 flex-row items-center gap-1.5">
              <Text className="shrink text-foreground text-xs" numberOfLines={1}>
                {exercise.primaryMuscle}
              </Text>
              <Text className="text-muted-foreground text-xs">·</Text>
              <Text className="text-muted-foreground text-xs" numberOfLines={1}>
                {t(`exercises.type.${exercise.type}`, { defaultValue: exercise.type })}
              </Text>
              <Text className="text-muted-foreground text-xs">·</Text>
              <View className="shrink-0 flex-row items-center gap-1">
                <Icon as={visibility.icon} size={12} className="text-muted-foreground" />
                <Text className="text-muted-foreground text-xs" numberOfLines={1}>
                  {t(visibility.labelKey)}
                </Text>
              </View>
            </View>
          </View>
          {selectable && (
            <Icon
              as={selected ? CheckCircle2 : Circle}
              size={22}
              className={selected ? 'text-primary' : 'text-muted-foreground'}
            />
          )}
        </CardContent>
      </Card>
    </Pressable>
  );
}

export function ExerciseCardSkeleton() {
  return (
    <Card className="p-2">
      <CardContent className="flex-row items-center gap-3 p-0">
        <View className="h-16 w-16 rounded-sm bg-muted" />
        <View className="flex-1 gap-2">
          <View className="h-4 w-2/3 rounded bg-muted" />
          <View className="h-3 w-1/2 rounded bg-muted" />
        </View>
      </CardContent>
    </Card>
  );
}
