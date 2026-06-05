import { DEFAULT_WEIGHT_PREFERENCE, displayWeight, type WeightUnit } from '@workout-tracker/domain';
import { Card, Icon, SectionHeading, Separator, Text } from '@workout-tracker/ui-mobile';
import { format } from 'date-fns';
import { Equal, Minus, Plus, TrendingUp } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { formatCount } from '@/features/exercises/lib/format';
import { useUserPreferences } from '@/features/preferences/hooks/use-user-preferences';
import { useDateFnsLocale } from '@/features/shared/hooks/use-date-fns-locale';
import { formatVolume } from '@/features/shared/lib/utils';
import type {
  ComparisonStatus,
  SessionComparison,
  SessionComparisonExercise,
} from '@/features/workouts/lib/session-comparison';

type WorkoutSessionComparisonProps = {
  comparison: SessionComparison | null;
};

const STATUS_ICON = {
  kept: Equal,
  new: Plus,
  removed: Minus,
} as const;

const STATUS_ICON_COLOR: Record<ComparisonStatus, string> = {
  kept: 'text-muted-foreground',
  new: 'text-success',
  removed: 'text-destructive',
};

export function WorkoutSessionComparison({ comparison }: WorkoutSessionComparisonProps) {
  const { t } = useTranslation();
  const locale = useDateFnsLocale();

  if (!comparison || comparison.exercises.length === 0) {
    return null;
  }

  const subtitle = comparison.previousDate
    ? t('workoutExecutionSummaryScreen.comparison.basedOn', {
        date: format(comparison.previousDate, "d 'de' MMM 'de' y, HH:mm", { locale }),
      })
    : t('workoutExecutionSummaryScreen.comparison.noPrevious');

  return (
    <View className="gap-3 px-4 pt-4">
      <SectionHeading
        icon={TrendingUp}
        title={t('workoutExecutionSummaryScreen.comparison.title')}
      />
      <Card className="gap-5 px-4 py-4">
        <Text variant="muted">{subtitle}</Text>
        {comparison.exercises.map((exercise, index) => (
          <View key={exercise.variationId} className="gap-3">
            {index > 0 ? <Separator /> : null}
            <ComparisonRow exercise={exercise} />
          </View>
        ))}
      </Card>
    </View>
  );
}

function ComparisonRow({ exercise }: { exercise: SessionComparisonExercise }) {
  const { t, i18n } = useTranslation();
  const { data: preferences } = useUserPreferences();
  const language = i18n.language;
  const unit = preferences?.weight.unit ?? DEFAULT_WEIGHT_PREFERENCE.unit;

  return (
    <View className="gap-2">
      <View>
        <View className="flex-row items-center gap-2">
          <Icon
            as={STATUS_ICON[exercise.status]}
            size={16}
            className={STATUS_ICON_COLOR[exercise.status]}
          />
          <Text className="font-sans-semibold">{exercise.exerciseName}</Text>
        </View>
        {exercise.variationName ? (
          <Text variant="muted" className="px-6">
            {exercise.variationName}
          </Text>
        ) : null}
      </View>
      <View className="gap-1 px-6">
        <MetricLine
          label={t('workoutExecutionSummaryScreen.comparison.series')}
          current={formatCount(exercise.currentSets, language)}
          previous={
            exercise.previousSets !== null ? formatCount(exercise.previousSets, language) : null
          }
          previousSuffix={t('workoutExecutionSummaryScreen.comparison.previousSuffix')}
          delta={renderSetsDelta(exercise, t, language)}
        />
        <MetricLine
          label={t('workoutExecutionSummaryScreen.comparison.volume')}
          current={formatVolume(exercise.currentVolumeKg, unit, language)}
          previous={
            exercise.previousVolumeKg !== null
              ? formatVolume(exercise.previousVolumeKg, unit, language)
              : null
          }
          previousSuffix={t('workoutExecutionSummaryScreen.comparison.previousSuffix')}
          delta={renderVolumeDelta(exercise, unit, language)}
        />
      </View>
    </View>
  );
}

type DeltaContent = { text: string; className: string } | null;

function MetricLine({
  label,
  current,
  previous,
  previousSuffix,
  delta,
}: {
  label: string;
  current: string;
  previous: string | null;
  previousSuffix: string;
  delta: DeltaContent;
}) {
  return (
    <View className="flex-row flex-wrap items-center gap-x-1">
      <Text variant="muted">{label}</Text>
      <Text className="text-sm">{current}</Text>
      {previous !== null ? <Text variant="muted">{`/ ${previous} ${previousSuffix}`}</Text> : null}
      {delta ? <Text className={`text-sm ${delta.className}`}>{delta.text}</Text> : null}
    </View>
  );
}

function deltaClassName(value: number): string {
  if (value > 0) return 'text-success';
  if (value < 0) return 'text-destructive';
  return 'text-muted-foreground';
}

function sign(value: number): string {
  return value > 0 ? '+' : value < 0 ? '−' : '';
}

function renderSetsDelta(
  exercise: SessionComparisonExercise,
  t: ReturnType<typeof useTranslation>['t'],
  language: string,
): DeltaContent {
  if (exercise.status === 'new') {
    const unit = t('workoutExecutionSummaryScreen.comparison.setsUnit', {
      count: exercise.currentSets,
    });
    return {
      text: `+${formatCount(exercise.currentSets, language)} ${unit}`,
      className: 'text-success',
    };
  }
  const previous = exercise.previousSets ?? 0;
  const diff = exercise.currentSets - previous;
  if (diff === 0) return null;
  return {
    text: `${sign(diff)}${formatCount(Math.abs(diff), language)}`,
    className: deltaClassName(diff),
  };
}

function renderVolumeDelta(
  exercise: SessionComparisonExercise,
  unit: WeightUnit,
  language: string,
): DeltaContent {
  if (exercise.status === 'new') {
    const current = Math.round(displayWeight(exercise.currentVolumeKg, unit));
    return {
      text: `+${formatCount(current, language)} ${unit}`,
      className: 'text-success',
    };
  }
  const previous = exercise.previousVolumeKg ?? 0;
  const diff = displayWeight(exercise.currentVolumeKg, unit) - displayWeight(previous, unit);
  if (Math.round(diff) === 0) return null;
  return {
    text: `${sign(diff)}${formatCount(Math.abs(Math.round(diff)), language)} ${unit}`,
    className: deltaClassName(diff),
  };
}
