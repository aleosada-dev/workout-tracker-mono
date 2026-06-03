import { Button, Text } from '@workout-tracker/ui-mobile';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { WorkoutExecutionSummaryActionsProps } from './types';

export function WorkoutExecutionSummaryActions({
  onSave,
  isPending,
  canSave,
}: WorkoutExecutionSummaryActionsProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  return (
    <View
      className="border-border border-t bg-background px-4 pt-3"
      style={{ paddingBottom: insets.bottom + 12 }}
    >
      <Button onPress={onSave} disabled={isPending || !canSave} className="h-12 rounded-full">
        <Text className="font-sans-semibold">
          {isPending
            ? t('workoutExecutionSummaryScreen.save.saving')
            : t('workoutExecutionSummaryScreen.save.button')}
        </Text>
      </Button>
    </View>
  );
}
