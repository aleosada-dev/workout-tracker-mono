import { Card, Icon, Text } from '@workout-tracker/ui-mobile';
import { CheckCircle2, Clock, Dumbbell, type LucideIcon } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { useUserPreferences } from '@/features/preferences/hooks/use-user-preferences';
import { formatTotalTime } from '@/features/shared/lib/utils/format-time';
import { formatWeight } from '@/features/shared/lib/utils/format-weight';
import type { WorkoutLogDetail } from '@/features/workout-logs/api/workout-logs';
import { summarizeDetail } from '@/features/workout-logs/lib/detail-format';

type WorkoutLogStatsProps = {
  detail: WorkoutLogDetail;
};

export function WorkoutLogStats({ detail }: WorkoutLogStatsProps) {
  const { t, i18n } = useTranslation();
  const { data: preferences } = useUserPreferences();
  const includeWarmup = preferences?.countWarmupSets ?? false;
  const { durationSeconds, totalSets, totalVolumeKg } = summarizeDetail(detail, includeWarmup);

  return (
    <View className="flex-row gap-3 px-4 pt-4">
      <StatCard
        icon={Clock}
        label={t('workoutLogDetail.stats.duration')}
        value={formatTotalTime(durationSeconds)}
      />
      <StatCard
        icon={CheckCircle2}
        label={t('workoutLogDetail.stats.sets')}
        value={String(totalSets)}
      />
      <StatCard
        icon={Dumbbell}
        label={t('workoutLogDetail.stats.volume')}
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
