import { useValue } from '@legendapp/state/react';
import { EmptyState } from '@workout-tracker/ui-mobile';
import { router, Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ScrollView, View } from 'react-native';
import { WorkoutExecutionSummaryStats } from '@/features/workouts/components/WorkoutExecutionSummaryStats';
import { WorkoutSessionRecords } from '@/features/workouts/components/WorkoutSessionRecords';
import { buildSessionRecords } from '@/features/workouts/lib/session-records';
import { activeWorkout$ } from '@/features/workouts/state/active-workout-store';

export default function WorkoutExecutionSummaryScreen() {
  const { t } = useTranslation();
  const active = useValue(activeWorkout$);

  const sessionRecords = active?.completedExecution
    ? buildSessionRecords(active.completedExecution, active.records ?? [])
    : [];

  return (
    <View className="flex-1 bg-background">
      <Stack.Screen options={{ title: t('workoutExecutionSummaryScreen.title') }} />
      {active?.completedExecution ? (
        <ScrollView contentContainerClassName="pb-8">
          <WorkoutExecutionSummaryStats
            startedAt={active.startedAt}
            execution={active.completedExecution}
          />
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
