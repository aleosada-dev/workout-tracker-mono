import { Button, Card, CardContent, Icon, Skeleton, Text } from '@workout-tracker/ui-mobile';
import { differenceInCalendarDays } from 'date-fns';
import { CheckCircle2, Circle, Play } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';
import {
  composeExerciseName,
  resolveExerciseName,
  resolveVariationName,
} from '@/features/exercises/lib/format';
import { formatRelativeDays } from '@/features/shared/lib/utils/dates';

export type WorkoutCardTopExercise = {
  slug: string | null;
  name: string;
  variationSlug: string | null;
  variationName: string | null;
  equipmentSlug: string;
  equipmentPreposition: string;
};

export type WorkoutCardData = {
  id: string;
  name: string;
  exerciseCount: number;
  topExercises: WorkoutCardTopExercise[];
  lastPerformedAt: string | null;
};

const STATUS_DOT_CLASS = {
  recent: 'bg-green-500',
  stale: 'bg-amber-500',
  never: 'bg-muted-foreground/40',
} as const;

type Recency = { label: string; status: keyof typeof STATUS_DOT_CLASS };

function resolveRecency(
  lastPerformedAt: string | null,
  t: ReturnType<typeof useTranslation>['t'],
): Recency {
  if (!lastPerformedAt) {
    return { label: t('workoutsScreen.card.lastPerformed.never'), status: 'never' };
  }
  const days = differenceInCalendarDays(new Date(), new Date(lastPerformedAt));
  const dateText = formatRelativeDays(lastPerformedAt, t) ?? '';
  const label = t('workoutsScreen.card.lastPerformed.prefix', { date: dateText });
  return { label, status: days <= 7 ? 'recent' : 'stale' };
}

export function WorkoutCard({
  workout,
  onStart,
  selectable = false,
  selected = false,
  onPress,
  onLongPress,
}: {
  workout: WorkoutCardData;
  onStart?: () => void;
  selectable?: boolean;
  selected?: boolean;
  onPress?: () => void;
  onLongPress?: () => void;
}) {
  const { t, i18n } = useTranslation();
  const recency = resolveRecency(workout.lastPerformedAt, t);
  const extra = workout.exerciseCount - workout.topExercises.length;

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={350}
      testID="workout-card"
    >
      <Card className="py-0">
        <CardContent className="flex-row items-start justify-between gap-3 px-4 py-3">
          <View className="min-w-0 flex-1">
            <Text className="font-sans-semibold text-base text-foreground">{workout.name}</Text>
            <View className="mt-2">
              {workout.topExercises.map((exercise, idx) => {
                const exerciseLabel = composeExerciseName(
                  {
                    exerciseName: resolveExerciseName(exercise.slug, exercise.name, t),
                    equipmentName: t(`equipment.${exercise.equipmentSlug}`),
                    equipmentPreposition: exercise.equipmentPreposition,
                    equipmentSlug: exercise.equipmentSlug,
                  },
                  i18n.language,
                );
                const variationLabel = resolveVariationName(
                  exercise.variationSlug,
                  exercise.variationName,
                  t,
                );
                return (
                  <View key={exercise.slug ?? `${idx}-${exercise.name}`} className="flex-row">
                    <Text className="text-muted-foreground leading-2" variant="small">
                      ·{' '}
                    </Text>
                    <Text
                      className="flex-1 text-foreground leading-2"
                      variant="small"
                      numberOfLines={1}
                    >
                      {exerciseLabel}
                      {variationLabel ? <Text variant="muted"> · {variationLabel}</Text> : null}
                    </Text>
                  </View>
                );
              })}
              {extra > 0 ? (
                <Text className="text-muted-foreground text-xs">
                  {t('workoutsScreen.card.exerciseExtra', { count: extra })}
                </Text>
              ) : null}
            </View>
            <View className="mt-3 flex-row items-center gap-2">
              <View
                className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT_CLASS[recency.status]}`}
                accessibilityElementsHidden
                importantForAccessibility="no"
              />
              <Text className="text-muted-foreground text-xs">{recency.label}</Text>
            </View>
          </View>
          {selectable ? (
            <View className="items-center justify-center self-center pr-1">
              <Icon
                as={selected ? CheckCircle2 : Circle}
                size={22}
                className={selected ? 'text-primary' : 'text-muted-foreground'}
              />
            </View>
          ) : (
            <Button
              onPress={onStart}
              variant="default"
              size="icon"
              accessibilityLabel={t('workoutsScreen.card.start')}
              className="rounded-full"
            >
              <Icon as={Play} size={18} className="text-white" />
            </Button>
          )}
        </CardContent>
      </Card>
    </Pressable>
  );
}

export function WorkoutsLoading({ count = 2 }: { count?: number } = {}) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: static placeholder list
        <WorkoutCardSkeleton key={i} />
      ))}
    </>
  );
}

export function WorkoutCardSkeleton() {
  return (
    <Card>
      <CardContent className="flex-row items-start justify-between gap-3 px-4 py-3">
        <View className="min-w-0 flex-1 gap-2">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-4 w-40" />
          <Skeleton className="mt-1 h-3 w-24" />
        </View>
        <Skeleton className="h-10 w-10 rounded-full" />
      </CardContent>
    </Card>
  );
}
