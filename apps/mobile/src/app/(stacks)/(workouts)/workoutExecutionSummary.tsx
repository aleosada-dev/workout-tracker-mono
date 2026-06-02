import { useValue } from '@legendapp/state/react';
import { Button, EmptyState, Text } from '@workout-tracker/ui-mobile';
import { router, Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { workoutLogObservability } from '@/features/observability/lib';
import { useUserPreferences } from '@/features/preferences/hooks/use-user-preferences';
import { handleLocalError } from '@/features/query/lib/error-handling';
import { useCreateWorkoutLog } from '@/features/workout-logs/hooks/use-create-workout-log';
import { buildCreateWorkoutLogRequest } from '@/features/workout-logs/lib/create-workout-log-request';
import { WorkoutExecutionSummaryStats } from '@/features/workouts/components/WorkoutExecutionSummaryStats';
import { WorkoutSessionComparison } from '@/features/workouts/components/WorkoutSessionComparison';
import { WorkoutSessionRecords } from '@/features/workouts/components/WorkoutSessionRecords';
import { buildSessionComparison } from '@/features/workouts/lib/session-comparison';
import { buildSessionRecords } from '@/features/workouts/lib/session-records';
import { activeWorkout$ } from '@/features/workouts/state/active-workout-store';

export default function WorkoutExecutionSummaryScreen() {
  const { t } = useTranslation();
  const active = useValue(activeWorkout$);
  const insets = useSafeAreaInsets();
  const { data: preferences } = useUserPreferences();
  const includeWarmup = preferences?.countWarmupSets ?? false;
  const { mutate: saveWorkoutLog, isPending } = useCreateWorkoutLog();

  const sessionRecords = active?.completedExecution
    ? buildSessionRecords(active.completedExecution, active.records ?? [], includeWarmup)
    : [];

  const comparison = active?.completedExecution
    ? buildSessionComparison(active.completedExecution, active.lastLog, includeWarmup)
    : null;

  const canSave = (active?.completedExecution?.exercises.length ?? 0) > 0;

  const handleSave = () => {
    if (!active?.completedExecution) return;
    const request = buildCreateWorkoutLogRequest({
      workoutId: active.workoutTemplate.id,
      startedAt: active.startedAt,
      finishedAt: new Date().toISOString(),
      note: active.note,
      execution: active.completedExecution,
    });
    saveWorkoutLog(request, {
      onSuccess: () => {
        workoutLogObservability.trackAction('workout_log_created', {
          exerciseCount: request.exercises.length,
        });
        Toast.show({
          type: 'success',
          text1: t('workoutExecutionSummaryScreen.save.success'),
        });
        router.dismissAll();
        activeWorkout$.delete();
      },
      onError: handleLocalError((err) => {
        workoutLogObservability.captureError(err, { action: 'create_workout_log' });
        Toast.show({
          type: 'error',
          text1: t('errors.unexpected.title'),
          text2: t('errors.unexpected.message'),
        });
      }),
    });
  };

  return (
    <View className="flex-1 bg-background">
      <Stack.Screen options={{ title: t('workoutExecutionSummaryScreen.title') }} />
      {active?.completedExecution ? (
        <>
          <ScrollView className="flex-1" contentContainerClassName="pb-8">
            <WorkoutExecutionSummaryStats
              startedAt={active.startedAt}
              execution={active.completedExecution}
            />
            <WorkoutSessionComparison comparison={comparison} />
            <WorkoutSessionRecords exercises={sessionRecords} />
          </ScrollView>
          <View
            className="border-border border-t bg-background px-4 pt-3"
            style={{ paddingBottom: insets.bottom + 12 }}
          >
            <Button
              onPress={handleSave}
              disabled={isPending || !canSave}
              className="h-12 rounded-full"
            >
              <Text className="font-sans-semibold">
                {isPending
                  ? t('workoutExecutionSummaryScreen.save.saving')
                  : t('workoutExecutionSummaryScreen.save.button')}
              </Text>
            </Button>
          </View>
        </>
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
