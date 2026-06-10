import { Icon, Text } from '@workout-tracker/ui-mobile';
import { Clock, Weight } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';
import { useUserPreferences } from '@/features/preferences/hooks/use-user-preferences';
import { formatTotalTime, formatWeight } from '@/features/shared/lib/utils';
import {
  type CompletedExecution,
  summarizeExecution,
} from '@/features/workouts/lib/completed-execution';

type WorkoutExecutionSummaryStatsProps = {
  durationSeconds: number;
  onEditDuration: () => void;
  execution: CompletedExecution;
};

export function WorkoutExecutionSummaryStats({
  durationSeconds,
  onEditDuration,
  execution,
}: WorkoutExecutionSummaryStatsProps) {
  const { t, i18n } = useTranslation();
  const { data: preferences } = useUserPreferences();
  const includeWarmup = preferences?.countWarmupSets ?? false;
  const { totalVolumeKg } = summarizeExecution(execution, includeWarmup);

  return (
    <View className="flex-row flex-wrap items-center gap-x-3 gap-y-1 px-4 pt-4">
      <Pressable
        className="flex-row items-center gap-1.5"
        onPress={onEditDuration}
        accessibilityRole="button"
        accessibilityLabel={t('workoutExecutionSummaryScreen.stats.totalTime')}
      >
        <Icon as={Clock} size={18} className="text-muted-foreground" />
        <Text variant="muted">{t('workoutExecutionSummaryScreen.stats.totalTime')}</Text>
        <Text className="font-sans-semibold underline">{formatTotalTime(durationSeconds)}</Text>
      </Pressable>
      <Text variant="muted">·</Text>
      <View className="flex-row items-center gap-1.5">
        <Icon as={Weight} size={18} className="text-muted-foreground" />
        <Text variant="muted">{t('workoutExecutionSummaryScreen.stats.totalVolume')}</Text>
        <Text className="font-sans-semibold">{formatWeight(totalVolumeKg, i18n.language)}</Text>
      </View>
    </View>
  );
}
