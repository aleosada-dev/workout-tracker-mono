import { Badge, Card, Icon, Text } from '@workout-tracker/ui-mobile';
import { Clock, Dumbbell, Trophy } from 'lucide-react-native';
import { View } from 'react-native';

export type WorkoutLogCardProps = {
  title: string;
  subtitle: string;
  muscleGroups: string[];
  duration: string;
  exerciseCount: string;
  hasRecord?: boolean;
};

export function WorkoutLogCard({
  title,
  subtitle,
  muscleGroups,
  duration,
  exerciseCount,
  hasRecord = false,
}: WorkoutLogCardProps) {
  return (
    <Card className="gap-3 px-5 py-4">
      <View className="flex-row items-start justify-between gap-3">
        <View className="flex-1 gap-1">
          <Text variant="h4">{title}</Text>
          <Text variant="muted">{subtitle}</Text>
        </View>
        {hasRecord ? (
          <View testID="workout-log-card.trophy">
            <Icon as={Trophy} className="text-warning" size={22} />
          </View>
        ) : null}
      </View>

      <View className="flex-row flex-wrap gap-2">
        {muscleGroups.map((group) => (
          <Badge key={group} variant="primary" className="px-1.5 py-px">
            <Text className="text-sm">{group}</Text>
          </Badge>
        ))}
      </View>

      <View className="flex-row items-center gap-4">
        <View className="flex-row items-center gap-1.5">
          <Icon as={Clock} className="text-muted-foreground" />
          <Text variant="muted">{duration}</Text>
        </View>
        <View className="flex-row items-center gap-1.5">
          <Icon as={Dumbbell} className="text-muted-foreground" />
          <Text variant="muted">{exerciseCount}</Text>
        </View>
      </View>
    </Card>
  );
}
