import { Card, Icon, Text } from '@workout-tracker/ui-mobile';
import { StickyNote, Timer } from 'lucide-react-native';
import { View } from 'react-native';
import { formatRestSeconds } from '@/features/shared/lib/utils/dates';
import type { WorkoutLogDetailExercise } from '@/features/workout-logs/api/workout-logs';
import { WorkoutLogSetRow } from '@/features/workout-logs/components/WorkoutLogSetRow';

type WorkoutLogExerciseCardProps = {
  exercise: WorkoutLogDetailExercise;
};

export function WorkoutLogExerciseCard({ exercise }: WorkoutLogExerciseCardProps) {
  const showSetType = exercise.exerciseType !== 'preparatory';

  return (
    <Card className="gap-3 px-5 py-4">
      <ExerciseHeader exercise={exercise} />
      <View className="gap-0.5">
        {exercise.sets.map((set, index) => (
          <WorkoutLogSetRow
            key={`${set.setOrder}-${set.roundOrder}`}
            set={set}
            index={index}
            showSetType={showSetType}
          />
        ))}
      </View>
    </Card>
  );
}

export function ExerciseHeader({ exercise }: WorkoutLogExerciseCardProps) {
  return (
    <View className="gap-1">
      <Text variant="h4">{exercise.exerciseName}</Text>
      {exercise.variationName ? <Text variant="muted">{exercise.variationName}</Text> : null}
      <ExerciseMeta note={exercise.note} restSeconds={exercise.restSeconds} />
    </View>
  );
}

export function ExerciseMeta({
  note,
  restSeconds,
}: {
  note: string | null;
  restSeconds: number | null;
}) {
  if (!note && restSeconds === null) return null;

  return (
    <View className="mt-1 gap-1">
      {restSeconds !== null ? (
        <View className="flex-row items-center gap-1.5">
          <Icon as={Timer} size={14} className="text-muted-foreground" />
          <Text variant="muted" className="text-sm">
            {formatRestSeconds(restSeconds)}
          </Text>
        </View>
      ) : null}
      {note ? (
        <View className="flex-row items-start gap-1.5">
          <Icon as={StickyNote} size={14} className="mt-0.5 text-muted-foreground" />
          <Text variant="muted" className="flex-1 text-sm">
            {note}
          </Text>
        </View>
      ) : null}
    </View>
  );
}
