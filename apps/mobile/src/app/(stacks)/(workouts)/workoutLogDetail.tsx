import {
  Card,
  ConfirmDialog,
  EmptyState,
  Icon,
  SectionHeading,
  Text,
} from '@workout-tracker/ui-mobile';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { Pencil, StickyNote, Trash2, Trophy } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, ScrollView, View } from 'react-native';
import Toast from 'react-native-toast-message';
import { useSession } from '@/features/auth/hooks/useSession';
import { useReportRequestError } from '@/features/observability/hooks/use-report-request-error';
import { workoutLogObservability } from '@/features/observability/lib';
import { handleLocalError } from '@/features/query/lib/error-handling';
import { useNavTheme } from '@/features/shared/lib/theme';
import { WorkoutLogExerciseCard } from '@/features/workout-logs/components/WorkoutLogExerciseCard';
import { WorkoutLogStats } from '@/features/workout-logs/components/WorkoutLogStats';
import { WorkoutLogSupersetCard } from '@/features/workout-logs/components/WorkoutLogSupersetCard';
import { useDeleteWorkoutLog } from '@/features/workout-logs/hooks/use-delete-workout-log';
import { useWorkoutLogDetail } from '@/features/workout-logs/hooks/use-workout-log-detail';
import { groupDetailExercises } from '@/features/workout-logs/lib/detail-format';

export default function WorkoutLogDetailScreen() {
  const { t } = useTranslation();
  const navTheme = useNavTheme();
  const { session } = useSession();
  const { id, userId } = useLocalSearchParams<{ id: string; userId?: string }>();
  const { data: detail, isLoading, isError, error } = useWorkoutLogDetail(id, userId);
  const { mutate: deleteWorkoutLog, isPending: isDeleting } = useDeleteWorkoutLog();
  const [deleteOpen, setDeleteOpen] = useState(false);

  const handleConfirmDelete = () => {
    deleteWorkoutLog(id, {
      onSuccess: () => {
        workoutLogObservability.trackAction('workout_log_deleted', { id });
        setDeleteOpen(false);
        Toast.show({ type: 'success', text1: t('workoutLogDetail.delete.success') });
        router.back();
      },
      onError: handleLocalError((err) => {
        workoutLogObservability.captureError(err, { action: 'delete_workout_log', extra: { id } });
        Toast.show({
          type: 'error',
          text1: t('errors.unexpected.title'),
          text2: t('errors.unexpected.message'),
        });
      }),
    });
  };

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
  const canDelete = detail.userId === session?.user?.id || detail.startedBy === session?.user?.id;

  return (
    <View className="flex-1 bg-background">
      <Stack.Screen
        options={{
          title: detail.title ?? t('workoutLogs.untitled'),
          headerRight: () => (
            <View className="flex-row items-center gap-1">
              <Pressable
                onPress={() => {}}
                hitSlop={12}
                accessibilityRole="button"
                accessibilityLabel={t('workoutLogDetail.actions.edit')}
                className="px-2"
                testID="workout-log-detail.edit"
              >
                <Pencil size={20} color={navTheme.colors.text} />
              </Pressable>
              {canDelete ? (
                <Pressable
                  onPress={() => setDeleteOpen(true)}
                  disabled={isDeleting}
                  hitSlop={12}
                  accessibilityRole="button"
                  accessibilityLabel={t('workoutLogDetail.actions.delete')}
                  className="px-2"
                  testID="workout-log-detail.delete"
                >
                  <Trash2 size={20} color={navTheme.colors.notification} />
                </Pressable>
              ) : null}
            </View>
          ),
        }}
      />
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

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={t('workoutLogDetail.delete.title')}
        description={t('workoutLogDetail.delete.description')}
        confirmLabel={t('workoutLogDetail.delete.confirm')}
        cancelLabel={t('workoutLogDetail.delete.cancel')}
        onConfirm={handleConfirmDelete}
        confirmTestID="workout-log-detail.delete-confirm"
      />
    </View>
  );
}
