import { ScrollView, View } from 'react-native';
import { OccurrenceCard } from '@/features/periodizations/components/OccurrenceCard';
import { useTodayOccurrences } from '@/features/periodizations/hooks/use-today-occurrences';
import { ActiveWorkoutSheet } from '@/features/workouts/components/ActiveWorkoutSheet';
import { useStartWorkout } from '@/features/workouts/hooks/use-start-workout';

export function OccurrencesCarousel({
  userId,
  athleteName,
}: {
  userId?: string | null;
  athleteName?: string | null;
} = {}) {
  const { data } = useTodayOccurrences(userId);
  const { start, sheetRef, confirmDiscard } = useStartWorkout();

  if (!data || data.length === 0) return null;

  const renderCard = (occurrence: (typeof data)[number], fullWidth: boolean) => (
    <OccurrenceCard
      key={occurrence.occurrenceId}
      occurrence={occurrence}
      fullWidth={fullWidth}
      onStart={
        occurrence.kind === 'workout' && occurrence.workoutId
          ? () =>
              start({
                workoutId: occurrence.workoutId as string,
                occurrenceId: occurrence.occurrenceId,
                userId,
                athleteName,
              })
          : undefined
      }
    />
  );

  return (
    <View className="pb-4">
      {data.length === 1 ? (
        renderCard(data[0], true)
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerClassName="gap-4"
        >
          {data.map((occurrence) => renderCard(occurrence, false))}
        </ScrollView>
      )}
      <ActiveWorkoutSheet ref={sheetRef} onConfirm={confirmDiscard} />
    </View>
  );
}
