import { useValue } from '@legendapp/state/react';
import { Alert, AlertDescription } from '@workout-tracker/ui-mobile';
import { Stack, useLocalSearchParams } from 'expo-router';
import { StickyNote } from 'lucide-react-native';
import { useEffect } from 'react';
import { View } from 'react-native';
import { useWorkout } from '@/features/workouts/hooks/use-workout';
import { activeWorkout$ } from '@/features/workouts/state/active-workout-store';

export default function WorkoutExecutionScreen() {
  const active = useValue(activeWorkout$);
  const { workoutId, userId } = useLocalSearchParams<{
    workoutId?: string;
    userId?: string;
  }>();

  const { data: workoutTemplate } = useWorkout({
    workoutId: active ? null : workoutId,
    userId: active ? null : userId,
  });

  useEffect(() => {
    if (!active && workoutTemplate) {
      activeWorkout$.set({
        startedAt: new Date().toISOString(),
        workout: workoutTemplate,
      });
    }
  }, [active, workoutTemplate]);

  const workout = active?.workout ?? workoutTemplate;

  return (
    <View className="flex-1 bg-background">
      <Stack.Screen options={{ title: workout?.name ?? '' }} />
      {workout?.description ? (
        <View className="px-4 pt-4">
          <Alert icon={StickyNote}>
            <AlertDescription>{workout.description}</AlertDescription>
          </Alert>
        </View>
      ) : null}
    </View>
  );
}
