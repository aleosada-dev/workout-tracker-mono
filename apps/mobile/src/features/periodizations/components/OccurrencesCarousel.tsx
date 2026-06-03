import { ScrollView, View } from 'react-native';
import { OccurrenceCard } from '@/features/periodizations/components/OccurrenceCard';
import { useTodayOccurrences } from '@/features/periodizations/hooks/use-today-occurrences';
import { ActiveWorkoutSheet } from '@/features/workouts/components/ActiveWorkoutSheet';
import { useStartWorkout } from '@/features/workouts/hooks/use-start-workout';

export function OccurrencesCarousel() {
  const { data } = useTodayOccurrences();
  const { start, sheetRef, confirmDiscard } = useStartWorkout();

  if (!data || data.length === 0) return null;

  return (
    <View className="pb-4">
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerClassName="gap-4"
      >
        {data.map((occurrence) => (
          <OccurrenceCard
            key={occurrence.occurrenceId}
            occurrence={occurrence}
            onStart={
              occurrence.kind === 'workout' && occurrence.workoutId
                ? () =>
                    start({
                      workoutId: occurrence.workoutId as string,
                      occurrenceId: occurrence.occurrenceId,
                    })
                : undefined
            }
          />
        ))}
      </ScrollView>
      <ActiveWorkoutSheet ref={sheetRef} onConfirm={confirmDiscard} />
    </View>
  );
}
