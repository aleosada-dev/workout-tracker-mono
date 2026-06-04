import { Card, EmptyState, Icon, SectionHeading, Text } from '@workout-tracker/ui-mobile';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { StickyNote, Trophy } from 'lucide-react-native';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, ScrollView, View } from 'react-native';
import { useReportRequestError } from '@/features/observability/hooks/use-report-request-error';
import { workoutLogObservability } from '@/features/observability/lib';
import { WorkoutLogExerciseCard } from '@/features/workout-logs/components/WorkoutLogExerciseCard';
import { WorkoutLogStats } from '@/features/workout-logs/components/WorkoutLogStats';
import { WorkoutLogSupersetCard } from '@/features/workout-logs/components/WorkoutLogSupersetCard';
import { useWorkoutLogDetail } from '@/features/workout-logs/hooks/use-workout-log-detail';
import { groupDetailExercises } from '@/features/workout-logs/lib/detail-format';

export default function WorkoutLogDetailScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: detail, isLoading, isError, error } = useWorkoutLogDetail(id);

  useReportRequestError({ isError, error }, workoutLogObservability.captureError, {
    action: 'load_detail',
  });

  useEffect(() => {
    if (detail) {
      workoutLogObservability.trackAction('workout_log_detail_opened', { id });
    }
  }, [detail, id]);

  if (isLoading) {
    return (
      <View
        className="flex-1 items-center justify-center bg-background"
        testID="workout-log-detail.loading"
      >
        <Stack.Screen options={{ title: t('workoutLogs.untitled') }} />
        <ActivityIndicator />
      </View>
    );
  }

  if (isError || !detail) {
    return (
      <View className="flex-1 justify-center bg-background p-4">
        <Stack.Screen options={{ title: t('workoutLogs.untitled') }} />
        <EmptyState
          title={t('workoutLogDetail.empty.title')}
          subtitle={t('workoutLogDetail.empty.subtitle')}
          cta={
            router.canGoBack()
              ? { label: t('workoutLogDetail.empty.cta'), onPress: () => router.back() }
              : undefined
          }
          testID="workout-log-detail.empty"
        />
      </View>
    );
  }

  const items = groupDetailExercises(detail.exercises);

  return (
    <View className="flex-1 bg-background">
      <Stack.Screen options={{ title: detail.title ?? t('workoutLogs.untitled') }} />
      <ScrollView
        className="flex-1"
        contentContainerClassName="gap-3 pb-8"
        testID="workout-log-detail"
      >
        <WorkoutLogStats detail={detail} />

        {detail.sessionRecords.length > 0 ? (
          <View className="gap-3 px-4 pt-1">
            <SectionHeading
              icon={Trophy}
              iconClassName="text-warning"
              title={t('workoutLogDetail.records.title')}
            />
            <Card className="flex-row items-center gap-2 px-5 py-4">
              <Icon as={Trophy} size={18} className="text-warning" />
              <Text variant="large">{detail.sessionRecords.length}</Text>
            </Card>
          </View>
        ) : null}

        {detail.note ? (
          <View className="gap-2 px-4 pt-1">
            <SectionHeading icon={StickyNote} title={t('workoutLogDetail.generalNote')} />
            <Card className="px-5 py-4">
              <Text>{detail.note}</Text>
            </Card>
          </View>
        ) : null}

        <View className="gap-3 px-4 pt-1">
          {items.map((item) =>
            item.kind === 'superset' ? (
              <WorkoutLogSupersetCard key={item.key} members={item.members} />
            ) : (
              <WorkoutLogExerciseCard key={item.key} exercise={item.exercise} />
            ),
          )}
        </View>
      </ScrollView>
    </View>
  );
}
