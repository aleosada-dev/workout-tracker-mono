import { rgb, useTheme } from '@workout-tracker/ui-mobile';
import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import type { WorkoutBuilderActionsProps } from './types';

export function WorkoutBuilderActions({
  onSave,
  onAddExercise,
  saving,
}: WorkoutBuilderActionsProps) {
  const { t } = useTranslation();
  const theme = useTheme();

  return (
    <Stack.Toolbar placement="bottom">
      <Stack.Toolbar.Button
        variant="prominent"
        tintColor={rgb(theme.primary)}
        onPress={onSave}
        disabled={saving}
      >
        {t('workoutFormScreen.actions.save')}
      </Stack.Toolbar.Button>
      <Stack.Toolbar.Spacer />
      <Stack.Toolbar.Button
        icon="plus"
        accessibilityLabel={t('workoutExecutionScreen.actions.addExercise')}
        onPress={onAddExercise}
      />
    </Stack.Toolbar>
  );
}
