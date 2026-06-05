import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { View } from 'react-native';
import { useCoachAthletes } from '@/features/coaches/hooks/use-coach-athletes';
import { OccurrencesCarousel } from '@/features/periodizations/components/OccurrencesCarousel';
import { OCCURRENCES_QUERY_PREFIX } from '@/features/periodizations/hooks/use-today-occurrences';
import { useProfile } from '@/features/profiles/hooks/use-profile';
import { WorkoutLogList } from '@/features/workout-logs/components/WorkoutLogList';
import { ActiveWorkoutBanner } from '@/features/workouts/components/ActiveWorkoutBanner';
import { AthleteContextSelect } from '@/features/workouts/components/AthleteContextSelect';

export default function WorkoutHistoryScreen() {
  const queryClient = useQueryClient();
  const [selectedAthleteId, setSelectedAthleteId] = useState<string | null>(null);
  const { data: profile } = useProfile();
  const isCoach = profile?.role === 'coach';
  const { data: athletes } = useCoachAthletes({ enabled: isCoach });
  const showAthleteSelect = isCoach && (athletes?.length ?? 0) >= 1;
  const queryUserId = showAthleteSelect ? selectedAthleteId : null;
  const athleteName = queryUserId
    ? (athletes?.find((a) => a.athleteId === queryUserId)?.fullName ?? null)
    : null;

  return (
    <View className="flex-1 bg-background">
      <ActiveWorkoutBanner />
      <WorkoutLogList
        userId={queryUserId}
        onRefresh={() => queryClient.refetchQueries({ queryKey: OCCURRENCES_QUERY_PREFIX })}
        header={
          <View>
            {showAthleteSelect && (
              <View className="pb-4">
                <AthleteContextSelect
                  athletes={athletes ?? []}
                  selectedAthleteId={selectedAthleteId}
                  onChange={setSelectedAthleteId}
                />
              </View>
            )}
            <OccurrencesCarousel userId={queryUserId} athleteName={athleteName} />
          </View>
        }
      />
    </View>
  );
}
