import {
  Badge,
  Button,
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  Icon,
  Text,
} from '@workout-tracker/ui-mobile';
import { Dumbbell, Play } from 'lucide-react-native';
import { View } from 'react-native';

export type WorkoutCardData = {
  id: string;
  name: string;
  muscleGroups: string[];
  exerciseCount: number;
};

export function WorkoutCard({
  workout,
  onStart,
}: {
  workout: WorkoutCardData;
  onStart?: () => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">{workout.name}</CardTitle>
      </CardHeader>
      <CardContent className="gap-4">
        <View className="flex-row flex-wrap gap-2">
          {workout.muscleGroups.map((group) => (
            <Badge key={group} variant="outline" className="bg-muted/40 px-3 py-1">
              <Text className="text-foreground text-xs">{group}</Text>
            </Badge>
          ))}
        </View>
        <View className="flex-row items-center gap-2">
          <Icon as={Dumbbell} size={16} className="text-muted-foreground" />
          <Text variant="small" className="text-muted-foreground">
            {workout.exerciseCount} exercícios
          </Text>
        </View>
      </CardContent>
      <CardFooter>
        <Button onPress={onStart} className="flex-1" variant="default">
          <Icon as={Play} size={18} className="text-white" />
          <Text className="font-sans-medium text-white">Iniciar treino</Text>
        </Button>
      </CardFooter>
    </Card>
  );
}
