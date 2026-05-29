import { useValue } from '@legendapp/state/react';
import { Icon, Text } from '@workout-tracker/ui-mobile';
import { router } from 'expo-router';
import { Dumbbell, Play, X } from 'lucide-react-native';
import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';
import { useElapsedSince } from '@/features/shared/hooks/use-elapsed-since';
import {
  DiscardActiveWorkoutSheet,
  type DiscardActiveWorkoutSheetRef,
} from '@/features/workouts/components/DiscardActiveWorkoutSheet';
import { activeWorkout$ } from '@/features/workouts/state/active-workout-store';

export function ActiveWorkoutBanner() {
  const { t } = useTranslation();
  const active = useValue(activeWorkout$);
  const since = useElapsedSince(active?.startedAt);
  const discardSheetRef = useRef<DiscardActiveWorkoutSheetRef>(null);

  if (!active || !since) return null;

  const { hours, minutes } = since;
  const elapsed =
    hours > 0
      ? t('workoutsScreen.activeWorkoutBanner.elapsedHours', { hours, minutes })
      : t('workoutsScreen.activeWorkoutBanner.elapsedMinutes', { minutes });
  const status = `${t('workoutsScreen.activeWorkoutBanner.inProgress')} · ${elapsed}`;

  return (
    <View className="gap-1 bg-primary px-4 py-2.5">
      <View className="flex-row items-center gap-3">
        <Icon as={Dumbbell} size={18} className="text-primary-foreground" />
        <Text numberOfLines={1} className="flex-1 font-sans-semibold text-primary-foreground">
          {active.workout_template.name}
        </Text>
        <Pressable
          onPress={() => router.push('/(stacks)/(workouts)/workoutExecution')}
          accessibilityRole="button"
          accessibilityLabel={t('workoutsScreen.activeWorkoutBanner.resume')}
          hitSlop={8}
          className="p-1"
          testID="active-workout-banner.resume"
        >
          <Icon as={Play} size={20} className="text-primary-foreground" />
        </Pressable>
        <Pressable
          onPress={() => discardSheetRef.current?.present()}
          accessibilityRole="button"
          accessibilityLabel={t('workoutsScreen.activeWorkoutBanner.discard')}
          hitSlop={8}
          className="p-1"
          testID="active-workout-banner.discard"
        >
          <Icon as={X} size={20} className="text-primary-foreground" />
        </Pressable>
      </View>
      <Text variant="small" className="pl-7 text-primary-foreground/80">
        {active.athleteName ? `${active.athleteName} · ${status}` : status}
      </Text>
      <DiscardActiveWorkoutSheet ref={discardSheetRef} onConfirm={() => activeWorkout$.delete()} />
    </View>
  );
}
