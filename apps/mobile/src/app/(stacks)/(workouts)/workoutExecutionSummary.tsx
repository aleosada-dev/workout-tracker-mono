import { useValue } from '@legendapp/state/react';
import { ConfirmDialog, EmptyState } from '@workout-tracker/ui-mobile';
import { router, Stack, useNavigation } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, View } from 'react-native';
import Toast from 'react-native-toast-message';
import { useScheduledSessions } from '@/features/coach-sessions/hooks/use-scheduled-sessions';
import { workoutLogObservability } from '@/features/observability/lib';
import { useUserPreferences } from '@/features/preferences/hooks/use-user-preferences';
import { handleLocalError } from '@/features/query/lib/error-handling';
import { elapsedSince } from '@/features/shared/lib/utils';
import { useCreateWorkoutLog } from '@/features/workout-logs/hooks/use-create-workout-log';
import { buildCreateWorkoutLogRequest } from '@/features/workout-logs/lib/create-workout-log-request';
import { CoachedSessionField } from '@/features/workouts/components/CoachedSessionField';
import {
  WorkoutDurationSheet,
  type WorkoutDurationSheetRef,
} from '@/features/workouts/components/WorkoutDurationSheet';
import { WorkoutExecutionSummaryActions } from '@/features/workouts/components/WorkoutExecutionSummaryActions';
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
  const { mutate: saveWorkoutLog, isPending } = useCreateWorkoutLog();
  const navigation = useNavigation<{
    navigate: (target: string, params: { screen: string }) => void;
  }>();

  const [today] = useState(() => new Date().toISOString().slice(0, 10));
  const { data: scheduledSessions } = useScheduledSessions(today);
  const sessions = scheduledSessions ?? [];

  const hasCoachContext = active?.athleteName != null;
  const [isCoached, setIsCoached] = useState(hasCoachContext);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const defaultAppliedRef = useRef(false);

  const durationSheetRef = useRef<WorkoutDurationSheetRef>(null);
  const [durationSeconds, setDurationSeconds] = useState(() => {
    const startedAt = activeWorkout$.startedAt.peek();
    if (!startedAt) return 0;
    const elapsed = elapsedSince(startedAt);
    return elapsed.hours * 3600 + elapsed.minutes * 60 + elapsed.seconds;
  });
  const [longDurationOpen, setLongDurationOpen] = useState(false);

  useEffect(() => {
    if (defaultAppliedRef.current || scheduledSessions === undefined) return;
    defaultAppliedRef.current = true;
    if (scheduledSessions.length > 0) {
      setIsCoached(true);
      if (scheduledSessions.length === 1) {
        setSelectedSessionId(scheduledSessions[0].id);
      }
    }
  }, [scheduledSessions]);

  const sessionRecords = active?.completedExecution
    ? buildSessionRecords(active.completedExecution, active.records ?? [], includeWarmup)
    : [];

  const comparison = active?.completedExecution
    ? buildSessionComparison(active.completedExecution, active.lastLog, includeWarmup)
    : null;

  const canSave = (active?.completedExecution?.exercises.length ?? 0) > 0;

  const performSave = () => {
    if (!active?.completedExecution) return;
    const finishedAt = new Date(
      new Date(active.startedAt).getTime() + durationSeconds * 1000,
    ).toISOString();
    const request = buildCreateWorkoutLogRequest({
      workoutId: active.workoutTemplate.id,
      userId: active.athleteId,
      startedAt: active.startedAt,
      finishedAt,
      note: active.note,
      isCoached,
      coachSessionId: selectedSessionId,
      periodizationOccurrenceId: active.occurrenceId,
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
        activeWorkout$.delete();
        router.dismissAll();
        navigation.navigate('(tabs)', { screen: 'index' });
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

  const requestSave = () => {
    if (durationSeconds > 2 * 3600) {
      setLongDurationOpen(true);
      return;
    }
    performSave();
  };

  const handleSaveRef = useRef(requestSave);
  handleSaveRef.current = requestSave;
  const onSave = useRef(() => handleSaveRef.current()).current;

  return (
    <View className="flex-1 bg-background">
      <Stack.Screen options={{ title: t('workoutExecutionSummaryScreen.title') }} />
      {active?.completedExecution ? (
        <>
          <ScrollView className="flex-1" contentContainerClassName="pb-8">
            <CoachedSessionField
              sessions={sessions}
              isCoached={isCoached}
              onCoachedChange={setIsCoached}
              selectedSessionId={selectedSessionId}
              onSelectedSessionChange={setSelectedSessionId}
            />
            <WorkoutExecutionSummaryStats
              durationSeconds={durationSeconds}
              onEditDuration={() =>
                durationSheetRef.current?.present(durationSeconds, setDurationSeconds)
              }
              execution={active.completedExecution}
            />
            <WorkoutSessionComparison comparison={comparison} />
            <WorkoutSessionRecords exercises={sessionRecords} />
          </ScrollView>
          <WorkoutDurationSheet ref={durationSheetRef} />
          <ConfirmDialog
            open={longDurationOpen}
            onOpenChange={setLongDurationOpen}
            title={t('workoutExecutionSummaryScreen.longDuration.title')}
            description={t('workoutExecutionSummaryScreen.longDuration.description')}
            confirmLabel={t('workoutExecutionSummaryScreen.longDuration.adjust')}
            cancelLabel={t('workoutExecutionSummaryScreen.longDuration.finishAnyway')}
            destructive={false}
            onConfirm={() => durationSheetRef.current?.present(durationSeconds, setDurationSeconds)}
            onCancel={performSave}
          />
          <WorkoutExecutionSummaryActions onSave={onSave} isPending={isPending} canSave={canSave} />
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
