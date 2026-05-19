import { Card } from '@workout-tracker/ui-mobile';
import { View } from 'react-native';

export function WorkoutLogCardSkeleton() {
  return (
    <Card className="gap-3 px-5 py-4" testID="workout-log-card-skeleton">
      <View className="flex-row items-start justify-between gap-3">
        <View className="flex-1 gap-2">
          <View className="h-5 w-2/3 rounded bg-muted" />
          <View className="h-4 w-1/2 rounded bg-muted" />
        </View>
      </View>

      <View className="flex-row gap-2">
        <View className="h-6 w-16 rounded-full bg-muted" />
        <View className="h-6 w-16 rounded-full bg-muted" />
        <View className="h-6 w-20 rounded-full bg-muted" />
      </View>

      <View className="flex-row items-center gap-4">
        <View className="h-4 w-16 rounded bg-muted" />
        <View className="h-4 w-24 rounded bg-muted" />
      </View>
    </Card>
  );
}
