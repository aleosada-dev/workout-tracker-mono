import { rgb, useTheme } from '@workout-tracker/ui-mobile';
import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import type { WorkoutExecutionSummaryActionsProps } from './types';

export function WorkoutExecutionSummaryActions({
  onSave,
  isPending,
  canSave,
}: WorkoutExecutionSummaryActionsProps) {
  const { t } = useTranslation();
  const theme = useTheme();

  return (
    <Stack.Toolbar placement="bottom">
      <Stack.Toolbar.Spacer />
      <Stack.Toolbar.Button
        variant="prominent"
        tintColor={rgb(theme.primary)}
        onPress={onSave}
        disabled={isPending || !canSave}
      >
        {isPending
          ? t('workoutExecutionSummaryScreen.save.saving')
          : t('workoutExecutionSummaryScreen.save.button')}
      </Stack.Toolbar.Button>
      <Stack.Toolbar.Spacer />
    </Stack.Toolbar>
  );
}
