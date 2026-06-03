import { Text } from '@workout-tracker/ui-mobile';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import type { CoachAthleteResponse } from '@/features/coaches/api/coaches';
import { CoachAthleteAutocomplete } from '@/features/coaches/components/CoachAthleteAutocomplete';

type Props = {
  athletes: CoachAthleteResponse[];
  selectedAthleteId: string | null;
  onChange: (athleteId: string | null) => void;
};

export function AthleteContextSelect({ athletes, selectedAthleteId, onChange }: Props) {
  const { t } = useTranslation();

  const selected = athletes.find((a) => a.athleteId === selectedAthleteId) ?? null;

  return (
    <View className="gap-1">
      <Text variant="small" className="text-muted-foreground">
        {t('workoutsScreen.athleteContext.label')}
      </Text>
      <CoachAthleteAutocomplete
        athletes={athletes}
        selected={selected}
        onSelect={(a) => onChange(a.athleteId)}
        onClear={() => onChange(null)}
        placeholder={t('workoutsScreen.athleteContext.myself')}
        testID="workouts-list.athlete-context"
        clearable
      />
    </View>
  );
}
