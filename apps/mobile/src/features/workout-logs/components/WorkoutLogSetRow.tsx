import { DEFAULT_WEIGHT_PREFERENCE } from '@workout-tracker/domain';
import { Text } from '@workout-tracker/ui-mobile';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { SET_TYPE_CONFIG, type SetType } from '@/features/exercises/lib/sets';
import { useUserPreferences } from '@/features/preferences/hooks/use-user-preferences';
import type { WorkoutLogDetailSet } from '@/features/workout-logs/api/workout-logs';
import { formatSetValue } from '@/features/workout-logs/lib/detail-format';

type WorkoutLogSetRowProps = {
  set: WorkoutLogDetailSet;
  index: number;
  showSetType?: boolean;
};

export function WorkoutLogSetRow({ set, index, showSetType = true }: WorkoutLogSetRowProps) {
  const { t, i18n } = useTranslation();
  const { data: preferences } = useUserPreferences();
  const unit = preferences?.weight.unit ?? DEFAULT_WEIGHT_PREFERENCE.unit;
  const config = SET_TYPE_CONFIG[set.setType as SetType];
  const target =
    set.repsMin !== null && set.repsMax !== null
      ? set.repsMin === set.repsMax
        ? `${set.repsMin}`
        : `${set.repsMin}-${set.repsMax}`
      : null;

  return (
    <View className="flex-row items-center gap-3 py-1.5">
      <Text variant="muted" className="w-6 text-center">
        {index + 1}
      </Text>
      {showSetType ? (
        <Text className={`w-5 text-center font-sans-semibold ${config.textColor}`}>
          {t(`sets.${set.setType}.token` as never)}
        </Text>
      ) : null}
      <Text className="flex-1 font-sans-medium">{formatSetValue(set, unit, i18n.language)}</Text>
      {target ? (
        <Text variant="muted" className="text-xs">
          {target}
        </Text>
      ) : null}
    </View>
  );
}
