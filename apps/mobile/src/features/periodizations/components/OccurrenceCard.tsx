import { Button, Card, cn, Icon, Text } from '@workout-tracker/ui-mobile';
import { Check, Play, SkipForward } from 'lucide-react-native';
import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useWindowDimensions, View } from 'react-native';
import type { Occurrence } from '@/features/periodizations/api/occurrences';
import {
  SkipOccurrenceSheet,
  type SkipOccurrenceSheetRef,
} from '@/features/periodizations/components/SkipOccurrenceSheet';
import { useUpdateOccurrenceStatus } from '@/features/periodizations/hooks/use-update-occurrence-status';

type Props = {
  occurrence: Occurrence;
  onStart?: () => void;
  fullWidth?: boolean;
};

export function OccurrenceCard({ occurrence, onStart, fullWidth }: Props) {
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const updateStatus = useUpdateOccurrenceStatus();
  const skipSheetRef = useRef<SkipOccurrenceSheetRef>(null);
  const isWorkout = occurrence.kind === 'workout';

  const handleSkip = (skippedReason: string | undefined) => {
    skipSheetRef.current?.dismiss();
    updateStatus.mutate({
      occurrenceId: occurrence.occurrenceId,
      status: 'skipped',
      skippedReason,
    });
  };

  const eyebrow = isWorkout ? t('homeScreen.today.workout') : t('homeScreen.today.cardio');
  const cycle = t('homeScreen.today.cycle', { n: occurrence.cycle });
  const subtitle =
    !isWorkout && occurrence.durationSeconds
      ? `${Math.round(occurrence.durationSeconds / 60)}min · ${cycle}`
      : cycle;

  return (
    <Card
      variant="primary"
      className={cn('gap-5 rounded-2xl p-4', fullWidth && 'w-full')}
      style={fullWidth ? undefined : { width: width - 64 }}
    >
      <View className="gap-1">
        <Text className="font-sans-semibold text-primary-foreground/70 text-sm uppercase tracking-widest">
          {eyebrow}
        </Text>
        <Text numberOfLines={1} className="font-sans-bold text-primary-foreground text-xl">
          {occurrence.name}
        </Text>
        <Text className="text-primary-foreground/80 text-sm">{subtitle}</Text>
      </View>
      {isWorkout ? (
        <Button variant="light" onPress={onStart}>
          <Icon as={Play} size={18} className="text-neutral-900" />
          <Text>{t('homeScreen.today.start')}</Text>
        </Button>
      ) : (
        <View className="flex-row gap-3">
          <Button
            variant="light"
            className="flex-1 border border-primary-foreground/30 bg-transparent active:bg-primary-foreground/10"
            disabled={updateStatus.isPending}
            onPress={() => skipSheetRef.current?.present()}
          >
            <Icon as={SkipForward} size={18} className="text-primary-foreground" />
            <Text className="text-primary-foreground">{t('homeScreen.today.skip')}</Text>
          </Button>
          <Button
            variant="light"
            className="flex-1"
            disabled={updateStatus.isPending}
            onPress={() =>
              updateStatus.mutate({ occurrenceId: occurrence.occurrenceId, status: 'done' })
            }
          >
            <Icon as={Check} size={18} className="text-neutral-900" />
            <Text>{t('homeScreen.today.complete')}</Text>
          </Button>
        </View>
      )}
      {!isWorkout ? (
        <SkipOccurrenceSheet
          ref={skipSheetRef}
          onConfirm={handleSkip}
          isPending={updateStatus.isPending}
        />
      ) : null}
    </Card>
  );
}
