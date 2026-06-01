import { useValue } from '@legendapp/state/react';
import { EmptyState } from '@workout-tracker/ui-mobile';
import { router, Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { WorkoutExecutionSummaryStats } from '@/features/workouts/components/WorkoutExecutionSummaryStats';
import { activeWorkout$ } from '@/features/workouts/state/active-workout-store';

export default function WorkoutExecutionSummaryScreen() {
  const { t } = useTranslation();
  const active = useValue(activeWorkout$);

  return (
    <View className="flex-1 bg-background">
      <Stack.Screen options={{ title: t('workoutExecutionSummaryScreen.title') }} />
      {active?.completedExecution ? (
        <WorkoutExecutionSummaryStats
          startedAt={active.startedAt}
          execution={active.completedExecution}
        />
      ) : (
        <View className="flex-1 justify-center p-4">
          <EmptyState
            title={t('workoutExecutionSummaryScreen.empty.title')}
            subtitle={t('workoutExecutionSummaryScreen.empty.subtitle')}
            cta={
              router.canGoBack()
                ? {
                    label: t('workoutExecutionSummaryScreen.empty.cta'),
                    onPress: () => router.back(),
                  }
                : undefined
            }
          />
        </View>
      )}
    </View>
  );
}
