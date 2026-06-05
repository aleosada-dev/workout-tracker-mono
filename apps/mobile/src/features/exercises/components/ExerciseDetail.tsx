import { DEFAULT_WEIGHT_PREFERENCE } from '@workout-tracker/domain';
import {
  Badge,
  Card,
  cn,
  EmptyState,
  Icon,
  SectionHeading,
  Text,
} from '@workout-tracker/ui-mobile';
import { format } from 'date-fns';
import { Archive, Dumbbell, LineChart, Trophy } from 'lucide-react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';
import {
  EXERCISE_METRIC_KEYS,
  type ExerciseDetailData,
  type ExerciseMetricKey,
} from '@/features/exercises/lib/detail-types';
import { formatKg, formatRecordValue } from '@/features/exercises/lib/format';
import { SET_TYPE_CONFIG } from '@/features/exercises/lib/sets';
import { useUserPreferences } from '@/features/preferences/hooks/use-user-preferences';
import { useDateFnsLocale } from '@/features/shared/hooks/use-date-fns-locale';
import { SetTypesHelpDialog } from '@/features/workouts/components/SetTypesHelpDialog';
import { ExerciseDemoVideo } from './ExerciseDemoVideo';
import { ExerciseMetricChart } from './ExerciseMetricChart';

export type ExerciseDetailProps = {
  data: ExerciseDetailData;
};

/** Read-only detail view for one exercise: video, metric chart, last session and PRs. */
export function ExerciseDetail({ data }: ExerciseDetailProps) {
  const { t, i18n } = useTranslation();
  const language = i18n.language;
  const { data: preferences } = useUserPreferences();
  const unit = preferences?.weight.unit ?? DEFAULT_WEIGHT_PREFERENCE.unit;
  const locale = useDateFnsLocale();
  const [selectedMetric, setSelectedMetric] = useState<ExerciseMetricKey>('maxWeight');
  const selectedSeries = data.metrics[selectedMetric];
  const hasSets = data.lastSession.sets.length > 0;
  const hasRecords = data.personalRecords.length > 0;
  const sessionDate = hasSets ? format(new Date(data.lastSession.date), 'dd MMM', { locale }) : '';
  const hasSessions = data.metrics.sets.points.length > 0;
  const isUnloadedMetric =
    hasSessions &&
    ((selectedMetric === 'maxWeight' && data.metrics.maxWeight.points.length === 0) ||
      (selectedMetric === 'volume' &&
        data.metrics.volume.points.length > 0 &&
        data.metrics.volume.points.every((p) => p.value === 0)));

  return (
    <View className="gap-4" testID="exercise-detail.content">
      {data.isDeleted && data.deletedAt ? (
        <ArchivedBanner deletedAt={data.deletedAt} deletedByName={data.deletedByName} />
      ) : null}
      <View className="px-1">
        <View className="flex-row items-center gap-3 self-start rounded-full bg-success/5 px-3 py-2">
          <View
            accessible
            accessibilityLabel={`${t('exerciseDetailScreen.muscles.primary')}: ${data.primaryMuscle}`}
            className="flex-row items-center gap-2"
            testID="exercise-detail.muscle.primary"
          >
            <View className="h-2 w-2 rounded-full bg-success" />
            <Text className="font-sans-semibold text-sm">{data.primaryMuscle}</Text>
          </View>
          {data.secondaryMuscle ? (
            <>
              <Text className="text-muted-foreground text-xs">·</Text>
              <View
                accessible
                accessibilityLabel={`${t('exerciseDetailScreen.muscles.secondary')}: ${data.secondaryMuscle}`}
                className="flex-row items-center gap-2"
                testID="exercise-detail.muscle.secondary"
              >
                <View className="h-2 w-2 rounded-full border border-success" />
                <Text className="text-muted-foreground text-sm">{data.secondaryMuscle}</Text>
              </View>
            </>
          ) : null}
        </View>
      </View>

      <ExerciseDemoVideo uploadedUrl={data.videoUrl} youtubeUrl={data.youtubeUrl} />

      <View className="gap-3">
        <SectionHeading
          icon={LineChart}
          iconClassName="text-muted-foreground"
          title={t('exerciseDetailScreen.progress')}
        />
        <Card className="gap-4">
          <View className="flex-row flex-wrap gap-1.5 px-4">
            {EXERCISE_METRIC_KEYS.map((key) => {
              const active = key === selectedMetric;
              return (
                <Pressable
                  key={key}
                  onPress={() => setSelectedMetric(key)}
                  accessibilityState={{ selected: active }}
                  testID={`exercise-detail.metric.${key}`}
                  hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
                >
                  <Badge variant={active ? 'primary' : 'outline'} pointerEvents="none">
                    <Text className={cn('text-xs', active && 'font-sans-semibold')}>
                      {t(`exerciseDetailScreen.metrics.${key}`)}
                    </Text>
                  </Badge>
                </Pressable>
              );
            })}
          </View>

          <View className="px-2">
            {!hasSessions ? (
              <EmptyState
                title={t('exerciseDetailScreen.chartEmptyTitle')}
                subtitle={t('exerciseDetailScreen.chartEmptySubtitle')}
                testID="exercise-detail.chart.empty"
              />
            ) : isUnloadedMetric ? (
              <EmptyState
                title={t('exerciseDetailScreen.chartUnloadedTitle')}
                subtitle={t('exerciseDetailScreen.chartUnloadedSubtitle')}
                testID="exercise-detail.chart.empty-unloaded"
              />
            ) : (
              <ExerciseMetricChart metric={selectedMetric} points={selectedSeries.points} />
            )}
          </View>
        </Card>
      </View>

      <View className="gap-3">
        <SectionHeading
          icon={Dumbbell}
          iconClassName="text-muted-foreground"
          title={
            hasSets
              ? t('exerciseDetailScreen.sets.title', { date: sessionDate })
              : t('exerciseDetailScreen.sets.titleEmpty')
          }
        />
        {hasSets ? (
          <Card className="gap-0 overflow-hidden py-0">
            <View className="flex-row items-center px-4 py-2.5">
              <Text variant="caption" className="w-7">
                {t('exerciseDetailScreen.sets.headers.index')}
              </Text>
              <View className="flex-1 flex-row items-center gap-1.5">
                <Text variant="caption">{t('exerciseDetailScreen.sets.headers.type')}</Text>
                <SetTypesHelpDialog />
              </View>
              <Text variant="caption" className="flex-1 text-right">
                {t('exerciseDetailScreen.sets.headers.weight')}
              </Text>
              <Text variant="caption" className="w-14 text-right">
                {t('exerciseDetailScreen.sets.headers.reps')}
              </Text>
            </View>
            {data.lastSession.sets.map((set) => {
              const typeConfig = SET_TYPE_CONFIG[set.type];
              return (
                <View
                  key={set.index}
                  className="flex-row items-center border-border border-t px-4 py-2.5"
                >
                  <Text variant="muted" className="w-7">
                    {set.index}
                  </Text>
                  <Text className={cn('flex-1 font-sans-semibold text-sm', typeConfig.textColor)}>
                    {t(typeConfig.label)}
                  </Text>
                  <Text className="flex-1 text-right text-sm">
                    {formatKg(set.weightKg, unit, language)}
                  </Text>
                  <Text className="w-14 text-right text-sm">{set.reps}</Text>
                </View>
              );
            })}
          </Card>
        ) : (
          <EmptyState
            title={t('exerciseDetailScreen.sets.emptyTitle')}
            subtitle={t('exerciseDetailScreen.sets.emptySubtitle')}
            testID="exercise-detail.sets.empty"
          />
        )}
      </View>

      <View className="gap-3">
        <SectionHeading
          icon={Trophy}
          iconClassName="text-warning"
          title={t('exerciseDetailScreen.personalRecords.title')}
        />
        {hasRecords ? (
          <Card className="gap-0 overflow-hidden py-0">
            {data.personalRecords.map((record, index) => {
              const active = record.metric === selectedMetric;
              return (
                <View
                  key={record.metric}
                  className={cn(
                    'flex-row items-center justify-between px-4 py-3',
                    index > 0 && 'border-border border-t',
                    active && 'bg-success/10',
                  )}
                  accessibilityHint={
                    active ? t('exerciseDetailScreen.personalRecords.matchHint') : undefined
                  }
                  testID={`exercise-detail.record.${record.metric}`}
                >
                  <Text className={cn('text-sm', active && 'font-sans-semibold')}>
                    {t(`exerciseDetailScreen.metrics.${record.metric}`)}
                  </Text>
                  <Text className="font-sans-semibold text-sm">
                    {formatRecordValue(record, unit, language)}
                  </Text>
                </View>
              );
            })}
          </Card>
        ) : (
          <EmptyState
            title={t('exerciseDetailScreen.personalRecords.emptyTitle')}
            subtitle={t('exerciseDetailScreen.personalRecords.emptySubtitle')}
            testID="exercise-detail.records.empty"
          />
        )}
      </View>
    </View>
  );
}

function ArchivedBanner({
  deletedAt,
  deletedByName,
}: {
  deletedAt: string;
  deletedByName: string | null;
}) {
  const { t, i18n } = useTranslation();
  const locale = useDateFnsLocale();
  const when = format(new Date(deletedAt), 'PPp', { locale });
  const message = deletedByName
    ? t('exerciseDetailScreen.archived.byUserAt', { name: deletedByName, when })
    : t('exerciseDetailScreen.archived.at', { when });
  return (
    <View
      accessible
      accessibilityLabel={message}
      accessibilityLanguage={i18n.language}
      className="flex-row items-center gap-3 rounded-md border border-warning/40 bg-warning/10 px-3 py-2"
      testID="exercise-detail.archived"
    >
      <Icon as={Archive} size={16} className="text-warning" />
      <Text className="flex-1 text-warning text-xs">{message}</Text>
    </View>
  );
}
