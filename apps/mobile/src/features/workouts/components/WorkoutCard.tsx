import {
  Badge,
  Button,
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  Icon,
  Skeleton,
  Text,
} from '@workout-tracker/ui-mobile';
import { Dumbbell, Play } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
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
            {t('workoutsScreen.card.exerciseCount', { count: workout.exerciseCount })}
          </Text>
        </View>
      </CardContent>
      <CardFooter>
        <Button onPress={onStart} className="flex-1" variant="default">
          <Icon as={Play} size={18} className="text-white" />
          <Text className="font-sans-medium text-white">{t('workoutsScreen.card.start')}</Text>
        </Button>
      </CardFooter>
    </Card>
  );
}

export function WorkoutsLoading({ count = 2 }: { count?: number } = {}) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: static placeholder list
        <WorkoutCardSkeleton key={i} />
      ))}
    </>
  );
}

export function WorkoutCardSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-40" />
      </CardHeader>
      <CardContent className="gap-4">
        <View className="flex-row flex-wrap gap-2">
          <Skeleton className="h-6 w-20 rounded-full" />
          <Skeleton className="h-6 w-24 rounded-full" />
          <Skeleton className="h-6 w-16 rounded-full" />
        </View>
        <Skeleton className="h-4 w-24" />
      </CardContent>
      <CardFooter>
        <Skeleton className="h-10 w-full rounded-md" />
      </CardFooter>
    </Card>
  );
}
