import { Text } from '@workout-tracker/ui-mobile';
import { useRouter } from 'expo-router';
import { Calendar, Dumbbell, HeartPulse, List } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MenuCard } from '@/features/shared/components/MenuCard';

export default function WorkoutsScreen() {
  const router = useRouter();
  const { t } = useTranslation();

  return (
    <SafeAreaView className="flex-1">
      <View className="gap-4 p-4">
        <View className="flex-row gap-4">
          <MenuCard onPress={() => router.push('/exercisesList')}>
            <List color="white" size={36} />
            <Text variant="h4" className="text-center text-white">
              {t('workoutsScreen.exercises')}
            </Text>
          </MenuCard>
          <MenuCard onPress={() => router.push('/workoutsList')} testID="workouts-menu.workouts">
            <Dumbbell color="white" size={36} />
            <Text variant="h4" className="text-center text-white">
              {t('workoutsScreen.workouts')}
            </Text>
          </MenuCard>
        </View>
        <View className="flex-row gap-4">
          <MenuCard onPress={() => router.push('/cardioList')}>
            <HeartPulse color="white" size={36} />
            <Text variant="h4" className="text-center text-white">
              {t('workoutsScreen.cardio')}
            </Text>
          </MenuCard>
          <MenuCard onPress={() => router.push('/myPeriodization')}>
            <Calendar color="white" size={36} />
            <Text variant="h4" className="text-center text-white">
              {t('workoutsScreen.periodization')}
            </Text>
          </MenuCard>
        </View>
      </View>
    </SafeAreaView>
  );
}
