import { Card, Icon, Text } from '@workout-tracker/ui-mobile';
import { CheckCircle2, Clock, Dumbbell, type LucideIcon } from 'lucide-react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { useUserPreferences } from '@/features/preferences/hooks/use-user-preferences';
import { elapsedSince, formatTotalTime, formatWeight } from '@/features/shared/lib/utils';
import {
  type CompletedExecution,
  summarizeExecution,
} from '@/features/workouts/lib/completed-execution';

type WorkoutExecutionSummaryStatsProps = {
  startedAt: string;
  execution: CompletedExecution;
};

export function WorkoutExecutionSummaryStats({
  startedAt,
  execution,
}: WorkoutExecutionSummaryStatsProps) {
  const { t, i18n } = useTranslation();
  const [elapsed] = useState(() => elapsedSince(startedAt));
  const { data: preferences } = useUserPreferences();
  const includeWarmup = preferences?.countWarmupSets ?? false;
  const { completedSets, totalVolumeKg } = summarizeExecution(execution, includeWarmup);

  const elapsedSeconds = elapsed.hours * 3600 + elapsed.minutes * 60 + elapsed.seconds;

  return (
    <View className="flex-row gap-3 px-4 pt-4">
      <StatCard
        icon={Clock}
        label={t('workoutExecutionSummaryScreen.stats.totalTime')}
        value={formatTotalTime(elapsedSeconds)}
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
};

function StatCard({ icon, label, value }: StatCardProps) {
  return (
    <Card className="flex-1 items-center gap-3 px-1 py-4">
      <Icon as={icon} size={18} className="text-muted-foreground" />
      <Text variant="muted" className="flex-1 text-center">
        {label}
      </Text>
      <Text variant="large">{value}</Text>
    </Card>
  );
}
