import { FlashList } from '@shopify/flash-list';
import { Button, EmptyState, Text } from '@workout-tracker/ui-mobile';
import { router } from 'expo-router';
import { type ReactElement, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, RefreshControl, View } from 'react-native';
import Toast from 'react-native-toast-message';
import { ApiUnauthorizedError } from '@/features/api/lib/errors';
import { useOnNewError } from '@/features/observability/hooks/use-on-new-error';
import { useReportRequestError } from '@/features/observability/hooks/use-report-request-error';
import { workoutLogObservability } from '@/features/observability/lib';
import { useDateFnsLocale } from '@/features/shared/hooks/use-date-fns-locale';
import type { WorkoutLogSummary } from '@/features/workout-logs/api/workout-logs';
import { WorkoutLogCard } from '@/features/workout-logs/components/WorkoutLogCard';
import { WorkoutLogCardSkeleton } from '@/features/workout-logs/components/WorkoutLogCardSkeleton';
import { useWorkoutLogSummaries } from '@/features/workout-logs/hooks/use-workout-log-summaries';
import { toCardProps } from '@/features/workout-logs/lib/format';

export function WorkoutLogList({
  header,
  onRefresh,
}: {
  header?: ReactElement;
  onRefresh?: () => void;
}) {
  const { t } = useTranslation();
  const locale = useDateFnsLocale();

  const {
    data,
    isLoading,
    isError,
    error,
    isFetchingNextPage,
    isRefetching,
    hasNextPage,
    fetchNextPage,
    refetch,
  } = useWorkoutLogSummaries();

  const items: WorkoutLogSummary[] = useMemo(
    () => (data?.pages ?? []).flatMap((p) => p.items),
    [data],
  );
  const hadPages = items.length > 0;

  useReportRequestError({ isError, error }, workoutLogObservability.captureError, {
    action: 'load_summaries',
  });

  useOnNewError(isError && hadPages, error, (error) => {
    if (error instanceof ApiUnauthorizedError) return;
    Toast.show({
      type: 'error',
      text1: t('workoutLogs.error.title'),
      text2: t('workoutLogs.error.loadMore'),
    });
  });

  if (isLoading) {
    return (
      <View className="flex-1 gap-3 p-4" testID="workout-log-list.loading">
        {header}
        <WorkoutLogCardSkeleton />
        <WorkoutLogCardSkeleton />
        <WorkoutLogCardSkeleton />
      </View>
    );
  }

  if (isError && !hadPages) {
    return (
      <View
        className="flex-1 items-center justify-center gap-4 p-6"
        testID="workout-log-list.error"
      >
        <Text variant="muted">{t('workoutLogs.error.title')}</Text>
        <Button onPress={() => refetch()}>
          <Text>{t('workoutLogs.error.retry')}</Text>
        </Button>
      </View>
    );
  }

  return (
    <FlashList
      data={items}
      keyExtractor={(it) => it.id}
      renderItem={({ item }) => (
        <Pressable
          onPress={() =>
            router.push({
              pathname: '/(stacks)/(workouts)/workoutLogDetail',
              params: { id: item.id },
            })
          }
          testID={`workout-log-card.${item.id}`}
        >
          <WorkoutLogCard {...toCardProps(item, t, locale)} />
        </Pressable>
      )}
      ItemSeparatorComponent={() => <View className="h-3" />}
      ListHeaderComponent={header}
      contentContainerClassName="p-4"
      // Let iOS inset the scroll content for the translucent native tab bar so
      // the last card is not hidden behind it.
      contentInsetAdjustmentBehavior="automatic"
      onEndReached={() => {
        if (hasNextPage && !isFetchingNextPage) fetchNextPage();
      }}
      onEndReachedThreshold={0.5}
      ListEmptyComponent={
        <EmptyState
          title={t('workoutLogs.emptyTitle')}
          subtitle={t('workoutLogs.emptySubtitle')}
          testID="workout-log-list.empty"
        />
      }
      ListFooterComponent={
        isFetchingNextPage ? (
          <View className="items-center py-4">
            <ActivityIndicator />
          </View>
        ) : null
      }
      refreshControl={
        <RefreshControl
          refreshing={isRefetching && !isFetchingNextPage}
          onRefresh={() => {
            onRefresh?.();
            refetch();
          }}
        />
      }
      testID="workout-log-list"
    />
  );
}
