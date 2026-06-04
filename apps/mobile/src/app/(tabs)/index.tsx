import { useQueryClient } from '@tanstack/react-query';
import { Text } from '@workout-tracker/ui-mobile';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { OccurrencesCarousel } from '@/features/periodizations/components/OccurrencesCarousel';
import { OCCURRENCES_QUERY_PREFIX } from '@/features/periodizations/hooks/use-today-occurrences';
import { WorkoutLogList } from '@/features/workout-logs/components/WorkoutLogList';
import { ActiveWorkoutBanner } from '@/features/workouts/components/ActiveWorkoutBanner';

export default function HomeScreen() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  return (
    <SafeAreaView className="flex-1" edges={['top']}>
      <ActiveWorkoutBanner />
      <WorkoutLogList
        onRefresh={() => queryClient.refetchQueries({ queryKey: OCCURRENCES_QUERY_PREFIX })}
        header={
          <View>
            <Text variant="h3" className="pb-3" testID="text.home.title">
              {t('homeScreen.welcome')}
            </Text>
            <OccurrencesCarousel />
          </View>
        }
      />
    </SafeAreaView>
  );
}
