import { Badge, Card, Text } from '@workout-tracker/ui-mobile';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import type { WorkoutLogDetailExercise } from '@/features/workout-logs/api/workout-logs';
import { ExerciseMeta } from '@/features/workout-logs/components/WorkoutLogExerciseCard';
import { WorkoutLogSetRow } from '@/features/workout-logs/components/WorkoutLogSetRow';

const LETTERS = ['A', 'B', 'C', 'D', 'E'] as const;

type WorkoutLogSupersetCardProps = {
  members: WorkoutLogDetailExercise[];
};

export function WorkoutLogSupersetCard({ members }: WorkoutLogSupersetCardProps) {
  const { t } = useTranslation();

  return (
    <Card className="gap-4 px-5 py-4">
      <Badge variant="primary" className="self-start px-1.5 py-px">
        <Text className="text-sm">{t('workoutLogDetail.superset')}</Text>
      </Badge>
      {members.map((member, memberIndex) => (
        <View key={`${member.position}-${member.variationId}`} className="gap-2">
          <View className="flex-row items-center gap-2">
            <Text className="font-sans-semibold text-primary">{LETTERS[memberIndex] ?? '?'}</Text>
            <View className="flex-1">
              <Text className="font-sans-semibold">{member.exerciseName}</Text>
              {member.variationName ? (
                <Text variant="muted" className="text-sm">
                  {member.variationName}
                </Text>
              ) : null}
            </View>
          </View>
          <ExerciseMeta note={member.note} restSeconds={member.restSeconds} />
          <View className="gap-0.5 pl-6">
            {member.sets.map((set, index) => (
              <WorkoutLogSetRow key={`${set.setOrder}-${set.roundOrder}`} set={set} index={index} />
            ))}
          </View>
        </View>
      ))}
    </Card>
  );
}
