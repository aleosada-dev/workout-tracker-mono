import { rgb, useTheme } from '@workout-tracker/ui-mobile';
import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavTheme } from '@/features/shared/lib/theme';
import { RestTimerBar } from './RestTimerBar';
import type { WorkoutExecutionActionsProps } from './types';

const TOOLBAR_CLEARANCE = 60;

export function WorkoutExecutionActions({
  onReview,
  onTimer,
  onNotes,
  onAddExercise,
  onKgLbsCalculator,
  timer,
}: WorkoutExecutionActionsProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const navTheme = useNavTheme();
  const insets = useSafeAreaInsets();

  return (
    <>
      <Stack.Toolbar placement="bottom">
        <Stack.Toolbar.Button variant="prominent" tintColor={rgb(theme.primary)} onPress={onReview}>
          {t('workoutExecutionScreen.actions.review')}
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
      {timer.active ? (
        <View
          pointerEvents="box-none"
          className="absolute right-0 left-0 flex-row px-4"
          style={{ bottom: insets.bottom + TOOLBAR_CLEARANCE }}
        >
          <RestTimerBar timer={timer} textColor={navTheme.colors.text} />
          <View className="flex-1" />
        </View>
      ) : null}
    </>
  );
}
