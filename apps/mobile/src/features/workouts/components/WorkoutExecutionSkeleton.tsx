import { Card, Skeleton } from '@workout-tracker/ui-mobile';
import { View } from 'react-native';

const PLACEHOLDER_CARDS = [0, 1, 2, 3];

export function WorkoutExecutionSkeleton() {
  return (
    <View className="flex-1 bg-background px-4" testID="workout-execution-skeleton">
      <Skeleton className="h-10 w-full rounded-md" />
      <View className="gap-3 pt-4">
        {PLACEHOLDER_CARDS.map((i) => (
          <Card key={i} className="gap-3 py-2">
            <View className="flex-row items-center justify-between gap-2 px-4 py-1">
              <Skeleton className="h-[18px] w-[18px] rounded" />
              <View className="flex-1 gap-2">
                <Skeleton className="h-5 w-2/3 rounded" />
                <Skeleton className="h-4 w-1/2 rounded" />
              </View>
              <Skeleton className="h-5 w-5 rounded" />
            </View>
          </Card>
        ))}
      </View>
    </View>
  );
}
