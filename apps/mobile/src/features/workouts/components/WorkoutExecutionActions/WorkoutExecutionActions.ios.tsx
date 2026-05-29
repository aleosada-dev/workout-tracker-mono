import { rgb, useTheme } from '@workout-tracker/ui-mobile';
import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import type { WorkoutExecutionActionsProps } from './types';

export function WorkoutExecutionActions({
  onFinish,
  onTimer,
  onNotes,
  onAddExercise,
  onKgLbsCalculator,
}: WorkoutExecutionActionsProps) {
  const { t } = useTranslation();
  const theme = useTheme();

  return (
    <Stack.Toolbar placement="bottom">
      <Stack.Toolbar.Button variant="prominent" tintColor={rgb(theme.primary)} onPress={onFinish}>
        {t('workoutExecutionScreen.actions.finish')}
      </Stack.Toolbar.Button>
      <Stack.Toolbar.Spacer />
      <Stack.Toolbar.Menu>
        <Stack.Toolbar.Icon sf="ellipsis.circle" />
        <Stack.Toolbar.Label>{t('workoutExecutionScreen.actions.more')}</Stack.Toolbar.Label>
        <Stack.Toolbar.MenuAction icon="timer" onPress={onTimer}>
          {t('workoutExecutionScreen.actions.timer')}
        </Stack.Toolbar.MenuAction>
        <Stack.Toolbar.MenuAction icon="note.text" onPress={onNotes}>
          {t('workoutExecutionScreen.actions.notes')}
        </Stack.Toolbar.MenuAction>
        <Stack.Toolbar.MenuAction icon="plus" onPress={onAddExercise}>
          {t('workoutExecutionScreen.actions.addExercise')}
        </Stack.Toolbar.MenuAction>
        <Stack.Toolbar.MenuAction icon="plus.forwardslash.minus" onPress={onKgLbsCalculator}>
          {t('workoutExecutionScreen.actions.kgLbsCalculator')}
        </Stack.Toolbar.MenuAction>
      </Stack.Toolbar.Menu>
    </Stack.Toolbar>
  );
}
