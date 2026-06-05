import { Card, Icon, Text } from '@workout-tracker/ui-mobile';
import { CheckCircle2, Clock, Dumbbell, type LucideIcon } from 'lucide-react-native';
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
  const { completedSets, totalVolumeKg } = summarizeExecution(execution, includeWarmup);

  return (
    <View className="flex-row gap-3 px-4 pt-4">
      <StatCard
        icon={Clock}
        label={t('workoutExecutionSummaryScreen.stats.totalTime')}
        value={formatTotalTime(durationSeconds)}
        onPress={onEditDuration}
      />
      <StatCard
        icon={CheckCircle2}
        label={t('workoutExecutionSummaryScreen.stats.completedSets')}
        value={String(completedSets)}
      />
      <StatCard
        icon={Dumbbell}
        label={t('workoutExecutionSummaryScreen.stats.totalVolume')}
        value={formatWeight(totalVolumeKg, i18n.language)}
      />
    </View>
  );
}

type StatCardProps = {
  icon: LucideIcon;
  label: string;
  value: string;
  onPress?: () => void;
};

function StatCard({ icon, label, value, onPress }: StatCardProps) {
  const content = (
    <Card className="flex-1 items-center gap-3 px-1 py-4">
      <Icon as={icon} size={18} className="text-muted-foreground" />
      <Text variant="muted" className="flex-1 text-center">
        {label}
      </Text>
      <Text variant="large" className={onPress ? 'underline' : undefined}>
        {value}
      </Text>
    </Card>
  );

  if (!onPress) return content;

  return (
    <Pressable className="flex-1" onPress={onPress} accessibilityRole="button">
      {content}
    </Pressable>
  );
}
