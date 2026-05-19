import { RequestErrorState, Skeleton, Text } from '@workout-tracker/ui-mobile';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, View } from 'react-native';
import { ExerciseDetail } from '@/features/exercises/components/ExerciseDetail';
import { useExerciseDetail } from '@/features/exercises/hooks/use-exercise-detail';
import { toExerciseDetailData } from '@/features/exercises/lib/detail';
import { useReportRequestError } from '@/features/observability/hooks/use-report-request-error';
import { exerciseObservability } from '@/features/observability/lib';

type Params = {
  id?: string;
};

export default function ExerciseDetailScreen() {
  const { t, i18n } = useTranslation();
  const { id } = useLocalSearchParams<Params>();
  const variationId = id ?? '';
  const { data, isLoading, isError, error, refetch } = useExerciseDetail(variationId);
  useReportRequestError({ isError, error }, exerciseObservability.captureError, {
    action: 'load_exercise_detail',
    extra: { exerciseId: variationId },
  });

  const detail = useMemo(
    () => (data ? toExerciseDetailData(data, i18n.language, t) : null),
    [data, i18n.language, t],
  );

  useEffect(() => {
    if (variationId)
      exerciseObservability.trackAction('open_exercise_detail', { exerciseId: variationId });
  }, [variationId]);

  return (
    <>
      <Stack.Screen
        options={{
          title: '',
          headerTitleAlign: 'center',
          headerTitle: () =>
            detail ? (
              <View className="items-center">
                <Text numberOfLines={1} className="font-sans-semibold text-base">
                  {detail.name}
                </Text>
                {detail.variationName ? (
                  <Text numberOfLines={1} className="text-muted-foreground text-xs">
                    {detail.variationName}
                  </Text>
                ) : null}
              </View>
            ) : null,
        }}
      />
      {isLoading ? (
        <ExerciseDetailLoading />
      ) : detail ? (
        <ScrollView
          className="flex-1"
          contentContainerClassName="gap-4 p-4"
          contentInsetAdjustmentBehavior="automatic"
          testID="exercise-detail"
        >
          <ExerciseDetail data={detail} />
        </ScrollView>
      ) : (
        <RequestErrorState
          title={t('exerciseDetailScreen.error.title')}
          subtitle={t('exerciseDetailScreen.error.subtitle')}
          retry={{ label: t('exerciseDetailScreen.error.retry'), onPress: () => refetch() }}
          testID="exercise-detail.error"
        />
      )}
    </>
  );
}

function ExerciseDetailLoading() {
  return (
    <ScrollView
      className="flex-1"
      contentContainerClassName="gap-4 p-4"
      contentInsetAdjustmentBehavior="automatic"
      testID="exercise-detail.loading"
    >
      <View className="gap-2 px-1">
        <View className="gap-0.5">
          <Skeleton className="h-7 w-2/3" />
          <Skeleton className="h-4 w-1/3" />
        </View>
        <View className="flex-row gap-4">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-28" />
        </View>
      </View>

      <Skeleton className="aspect-video w-full rounded-xl" />

      <View className="gap-3">
        <Skeleton className="ml-1 h-6 w-24" />
        <Skeleton className="h-72 rounded-xl" />
      </View>

      <View className="gap-3">
        <Skeleton className="ml-1 h-6 w-32" />
        <Skeleton className="h-44 rounded-xl" />
      </View>

      <View className="gap-3">
        <Skeleton className="ml-1 h-6 w-40" />
        <Skeleton className="h-48 rounded-xl" />
      </View>
    </ScrollView>
  );
}
