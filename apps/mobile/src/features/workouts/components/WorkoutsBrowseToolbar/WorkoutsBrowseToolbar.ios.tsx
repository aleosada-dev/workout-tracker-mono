import { rgb, useTheme } from '@workout-tracker/ui-mobile';
import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import type { WorkoutsBrowseToolbarProps } from './types';

export function WorkoutsBrowseToolbar({ onCreateWorkout }: WorkoutsBrowseToolbarProps) {
  const { t } = useTranslation();
  const theme = useTheme();

  return (
    <Stack.Toolbar placement="bottom">
      <Stack.Toolbar.Spacer />
      <Stack.Toolbar.Button
        onPress={onCreateWorkout}
        variant="prominent"
        tintColor={rgb(theme.primary)}
      >
        <Stack.Toolbar.Icon sf="plus" />
        <Stack.Toolbar.Label>{t('workoutFormScreen.createTitle')}</Stack.Toolbar.Label>
      </Stack.Toolbar.Button>
    </Stack.Toolbar>
  );
}
