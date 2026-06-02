import { useValue } from '@legendapp/state/react';
import { EmptyState } from '@workout-tracker/ui-mobile';
import { router, Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ScrollView, View } from 'react-native';
import { useUserPreferences } from '@/features/preferences/hooks/use-user-preferences';
import { WorkoutExecutionSummaryStats } from '@/features/workouts/components/WorkoutExecutionSummaryStats';
import { WorkoutSessionComparison } from '@/features/workouts/components/WorkoutSessionComparison';
import { WorkoutSessionRecords } from '@/features/workouts/components/WorkoutSessionRecords';
import { buildSessionComparison } from '@/features/workouts/lib/session-comparison';
import { buildSessionRecords } from '@/features/workouts/lib/session-records';
import { activeWorkout$ } from '@/features/workouts/state/active-workout-store';

export default function WorkoutExecutionSummaryScreen() {
  const { t } = useTranslation();
  const active = useValue(activeWorkout$);
  const { data: preferences } = useUserPreferences();
  const includeWarmup = preferences?.countWarmupSets ?? false;

  const sessionRecords = active?.completedExecution
    ? buildSessionRecords(active.completedExecution, active.records ?? [])
    : [];

  const comparison = active?.completedExecution
    ? buildSessionComparison(active.completedExecution, active.lastLog, includeWarmup)
    : null;

  return (
    <View className="flex-1 bg-background">
      <Stack.Screen options={{ title: t('workoutExecutionSummaryScreen.title') }} />
      {active?.completedExecution ? (
        <ScrollView className="flex-1" contentContainerClassName="pb-8">
          <WorkoutExecutionSummaryStats
            startedAt={active.startedAt}
            execution={active.completedExecution}
          />
          <WorkoutSessionComparison comparison={comparison} />
          <WorkoutSessionRecords exercises={sessionRecords} />
        </ScrollView>
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
