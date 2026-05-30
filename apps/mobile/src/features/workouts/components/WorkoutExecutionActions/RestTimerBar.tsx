import { rgb, Text, useTheme } from '@workout-tracker/ui-mobile';
import { Pause, Play, Square, Timer } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import type { ColorValue } from 'react-native';
import { Pressable, View } from 'react-native';
import type { WorkoutExecutionActionsTimer } from './types';

export function RestTimerBar({
  timer,
  textColor,
}: {
  timer: WorkoutExecutionActionsTimer;
  textColor: ColorValue;
}) {
  const { t } = useTranslation();
  const { primaryForeground } = useTheme();

  return (
    <View className="h-12 flex-row items-center gap-2 rounded-full border border-border bg-background pr-1 pl-4">
      <Pressable
        onPress={timer.onOpen}
        accessibilityRole="button"
        accessibilityLabel={t('workoutExecutionScreen.actions.timer')}
        className="flex-row items-center gap-2 pr-1"
      >
        <Timer size={18} color={textColor} />
        <Text className="font-sans-semibold text-base tabular-nums">{timer.label}</Text>
      </Pressable>
      <Pressable
        onPress={timer.onPauseResume}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel={t(
          timer.isPaused
            ? 'workoutExecutionScreen.timerSheet.resume'
            : 'workoutExecutionScreen.timerSheet.pause',
        )}
        className="h-10 w-10 items-center justify-center rounded-full border border-border"
      >
        {timer.isPaused ? (
          <Play size={18} color={textColor} />
        ) : (
          <Pause size={18} color={textColor} />
        )}
      </Pressable>
      <Pressable
        onPress={timer.onStop}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel={t('workoutExecutionScreen.timerSheet.stop')}
        className="h-10 w-10 items-center justify-center rounded-full bg-destructive"
      >
        <Square size={16} color={rgb(primaryForeground)} />
      </Pressable>
    </View>
  );
}
