import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Text,
} from '@workout-tracker/ui-mobile';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import type { CoachAthleteResponse } from '@/features/coaches/api/coaches';

const SELF_VALUE = '__self__';

type Props = {
  athletes: CoachAthleteResponse[];
  selectedAthleteId: string | null;
  onChange: (athleteId: string | null) => void;
};

export function AthleteContextSelect({ athletes, selectedAthleteId, onChange }: Props) {
  const { t } = useTranslation();

  const myselfLabel = t('workoutsScreen.athleteContext.myself');
  const selectedLabel =
    selectedAthleteId === null
      ? myselfLabel
      : (athletes.find((a) => a.athleteId === selectedAthleteId)?.fullName ?? myselfLabel);

  return (
    <View className="gap-1">
      <Text variant="small" className="text-muted-foreground">
        {t('workoutsScreen.athleteContext.label')}
      </Text>
      <Select
        value={{ value: selectedAthleteId ?? SELF_VALUE, label: selectedLabel }}
        onValueChange={(option) => {
          if (!option) return;
          onChange(option.value === SELF_VALUE ? null : option.value);
        }}
      >
        <SelectTrigger className="h-12 w-full" testID="workouts-list.athlete-context">
          <SelectValue placeholder={t('workoutsScreen.athleteContext.placeholder')} />
        </SelectTrigger>
        <SelectContent disableFullWindowOverlay>
          <SelectItem label={myselfLabel} value={SELF_VALUE}>
            {myselfLabel}
          </SelectItem>
          {athletes.map((a) => {
            const label = a.fullName ?? a.athleteId;
            return (
              <SelectItem key={a.athleteId} label={label} value={a.athleteId}>
                {label}
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
    </View>
  );
}
