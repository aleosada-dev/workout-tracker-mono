import { Button, Icon, Text } from '@workout-tracker/ui-mobile';
import { Eraser, Play, Square } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { useStopwatch } from '@/features/shared/hooks/use-stopwatch';

export function StopwatchView() {
  const { t } = useTranslation();
  const stopwatch = useStopwatch();
  const label = formatTime(stopwatch.elapsedSeconds);

  return (
    <View className="gap-5">
      <View className="items-center justify-center py-12">
        <Text
          className="font-sans-semibold text-7xl tabular-nums"
          style={{ lineHeight: 84, includeFontPadding: false }}
        >
          {label}
        </Text>
      </View>

      {stopwatch.isRunning ? (
        <Button variant="destructive" onPress={stopwatch.pause}>
          <Icon as={Square} size={18} className="text-white" />
          <Text>{t('workoutExecutionScreen.timerSheet.stop')}</Text>
        </Button>
      ) : stopwatch.isPaused ? (
        <View className="gap-3">
          <Button onPress={stopwatch.resume}>
            <Icon as={Play} size={18} className="text-primary-foreground" />
            <Text>{t('workoutExecutionScreen.timerSheet.start')}</Text>
          </Button>
          <Button variant="outline" onPress={stopwatch.reset}>
            <Icon as={Eraser} size={18} className="text-foreground" />
            <Text>{t('workoutExecutionScreen.timerSheet.reset')}</Text>
          </Button>
        </View>
      ) : (
        <Button onPress={stopwatch.start}>
          <Icon as={Play} size={18} className="text-primary-foreground" />
          <Text>{t('workoutExecutionScreen.timerSheet.start')}</Text>
        </Button>
      )}
    </View>
  );
}

function formatTime(totalSeconds: number) {
  const safe = Math.max(0, totalSeconds);
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${pad(minutes)}:${pad(seconds)}`;
}

function pad(n: number) {
  return n.toString().padStart(2, '0');
}
