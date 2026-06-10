import { Card, Icon, SectionHeading, Text } from '@workout-tracker/ui-mobile';
import { Trophy } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { EXERCISE_METRIC_KEYS } from '@/features/exercises/lib/detail-types';
import { formatMetricValue } from '@/features/exercises/lib/format';
import type {
  SessionExerciseRecord,
  SessionRecordMetric,
} from '@/features/workouts/lib/session-records';

type WorkoutSessionRecordsProps = {
  exercises: SessionExerciseRecord[];
};

export function WorkoutSessionRecords({ exercises }: WorkoutSessionRecordsProps) {
  const { t } = useTranslation();

  if (exercises.length === 0) {
    return null;
  }

  return (
    <View className="gap-3 px-4 pt-4">
      <SectionHeading
        icon={Trophy}
        iconClassName="text-warning"
        title={t('workoutExecutionSummaryScreen.records.title')}
      />
      <Card className="gap-5 px-4 py-4">
        {exercises.map((exercise, index) => (
          <ExerciseRecord
            key={`${exercise.exerciseName}-${exercise.variationName ?? index}`}
            exercise={exercise}
          />
        ))}
      </Card>
    </View>
  );
}

function ExerciseRecord({ exercise }: { exercise: SessionExerciseRecord }) {
  const { t, i18n } = useTranslation();

  const ordered = EXERCISE_METRIC_KEYS.map((metric) =>
    exercise.records.find((record) => record.metric === metric),
  ).filter((record): record is SessionRecordMetric => record !== undefined);

  return (
    <View className="gap-2">
      <View>
        <View className="flex-row items-center gap-2">
          <Icon as={Trophy} size={16} className="text-warning" />
          <Text className="font-sans-semibold">{exercise.exerciseName}</Text>
        </View>
        {exercise.variationName ? (
          <Text variant="muted" className="px-6">
            {exercise.variationName}
          </Text>
        ) : null}
      </View>
      <View className="gap-1">
        {ordered.map((record) => (
          <View key={record.metric} className="flex-row items-center justify-between px-6">
            <Text variant="muted">
              {t(`workoutExecutionSummaryScreen.records.metrics.${record.metric}`)}
            </Text>
            <Text className="text-sm">
              {formatMetricValue(record.metric, record.previous, i18n.language)}
              {' → '}
              {formatMetricValue(record.metric, record.current, i18n.language)}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}
