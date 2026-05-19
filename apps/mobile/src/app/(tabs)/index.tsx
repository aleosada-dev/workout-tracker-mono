import { Text } from '@workout-tracker/ui-mobile';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WorkoutLogList } from '@/workout-logs/components/WorkoutLogList';

export default function HomeScreen() {
  const { t } = useTranslation();

  return (
    <SafeAreaView className="flex-1" edges={['top']}>
      <WorkoutLogList
        header={
          <Text variant="h3" className="px-2 pb-3" testID="text.home.title">
            {t('homeScreen.welcome')}
          </Text>
        }
      />
    </SafeAreaView>
  );
}
