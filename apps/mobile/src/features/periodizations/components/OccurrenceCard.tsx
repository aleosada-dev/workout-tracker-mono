import { Button, Card, Icon, Text } from '@workout-tracker/ui-mobile';
import { Play } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useWindowDimensions, View } from 'react-native';
import type { Occurrence } from '@/features/periodizations/api/occurrences';

type Props = {
  occurrence: Occurrence;
  onStart?: () => void;
};

export function OccurrenceCard({ occurrence, onStart }: Props) {
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const isWorkout = occurrence.kind === 'workout';

  const eyebrow = isWorkout ? t('homeScreen.today.workout') : t('homeScreen.today.cardio');
  const cycle = t('homeScreen.today.cycle', { n: occurrence.cycle });
  const subtitle =
    !isWorkout && occurrence.durationSeconds
      ? `${Math.round(occurrence.durationSeconds / 60)}min · ${cycle}`
      : cycle;

  return (
    <Card variant="primary" className="gap-5 rounded-2xl p-4" style={{ width: width - 64 }}>
      <View className="gap-1">
        <Text className="font-sans-semibold text-primary-foreground/70 text-sm uppercase tracking-widest">
          {eyebrow}
        </Text>
        <Text numberOfLines={1} className="font-sans-bold text-primary-foreground text-xl">
          {occurrence.name}
        </Text>
        <Text className="text-primary-foreground/80 text-sm">{subtitle}</Text>
      </View>
      <Button variant="light" onPress={onStart}>
        {isWorkout ? <Icon as={Play} size={18} className="text-neutral-900" /> : null}
        <Text>{isWorkout ? t('homeScreen.today.start') : t('homeScreen.today.complete')}</Text>
      </Button>
    </Card>
  );
}
