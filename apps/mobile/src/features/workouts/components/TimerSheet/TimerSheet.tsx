import {
  BottomSheet,
  type BottomSheetRef,
  BottomSheetView,
  Button,
  Icon,
  Tabs,
  TabsList,
  TabsTrigger,
  Text,
} from '@workout-tracker/ui-mobile';
import { Check, Pause, Play, Square } from 'lucide-react-native';
import { type Ref, useImperativeHandle, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';
import { useCountdownTimer } from '@/features/shared/hooks/use-countdown-timer';
import { StopwatchView } from './StopwatchView';
import { TimerRing } from './TimerRing';
import { TimeWheelPicker } from './TimeWheelPicker';

type Tab = 'timer' | 'stopwatch';

const PRESETS_SECONDS = [30, 60, 90, 120];
const DEFAULT_DURATION = 60;
const STEP_SECONDS = 15;

export type TimerSheetRef = {
  present: () => void;
  dismiss: () => void;
};

type Props = {
  ref?: Ref<TimerSheetRef>;
};

export function TimerSheet({ ref }: Props) {
  const { t } = useTranslation();
  const sheetRef = useRef<BottomSheetRef>(null);
  const [tab, setTab] = useState<Tab>('timer');
  const [duration, setDuration] = useState(DEFAULT_DURATION);
  const [totalMs, setTotalMs] = useState(DEFAULT_DURATION * 1000);
  const [pickerOpen, setPickerOpen] = useState(false);

  const timer = useCountdownTimer({
    durationSeconds: duration,
    notification: {
      title: t('workoutExecutionScreen.timerSheet.notification.title'),
      body: t('workoutExecutionScreen.timerSheet.notification.body'),
    },
    onComplete: () => setTotalMs(duration * 1000),
  });

  useImperativeHandle(ref, () => ({
    present: () => {
      setPickerOpen(false);
      sheetRef.current?.present();
    },
    dismiss: () => sheetRef.current?.dismiss(),
  }));

  const isIdle = !timer.isRunning && !timer.isPaused;
  const remainingMs = timer.remainingSeconds * 1000;
  const progress = isIdle ? 1 : totalMs > 0 ? remainingMs / totalMs : 0;
  const label = formatTime(isIdle ? duration : timer.remainingSeconds);

  const handlePreset = (seconds: number) => {
    setDuration(seconds);
    setTotalMs(seconds * 1000);
  };

  const handleStart = () => {
    setTotalMs(duration * 1000);
    timer.start();
  };

  const handleStop = () => {
    timer.reset();
    setTotalMs(duration * 1000);
  };

  const handleAddSeconds = (delta: number) => {
    timer.addSeconds(delta);
    setTotalMs((prev) => Math.max(0, prev + delta * 1000));
  };

  const handlePickerChange = (seconds: number) => {
    const safe = Math.max(1, seconds);
    setDuration(safe);
    setTotalMs(safe * 1000);
  };

  return (
    <BottomSheet ref={sheetRef} enableContentPanningGesture={!pickerOpen}>
      <BottomSheetView className="gap-5 px-5 pt-2 pb-8">
        <Text variant="h4" className="text-center">
          {t('workoutExecutionScreen.timerSheet.title')}
        </Text>

        <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)}>
          <TabsList variant="outline">
            <TabsTrigger value="timer" className="flex-1">
              <Text>{t('workoutExecutionScreen.timerSheet.tabs.timer')}</Text>
            </TabsTrigger>
            <TabsTrigger value="stopwatch" className="flex-1">
              <Text>{t('workoutExecutionScreen.timerSheet.tabs.stopwatch')}</Text>
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {tab === 'stopwatch' ? (
          <StopwatchView />
        ) : isIdle && pickerOpen ? (
          <View className="gap-3">
            <TimeWheelPicker totalSeconds={duration} onChange={handlePickerChange} />
            <Button variant="outline" onPress={() => setPickerOpen(false)}>
              <Icon as={Check} size={18} className="text-foreground" />
              <Text>{t('workoutExecutionScreen.timerSheet.confirm')}</Text>
            </Button>
          </View>
        ) : (
          <>
            {isIdle && (
              <View className="flex-row flex-wrap justify-center gap-2">
                {PRESETS_SECONDS.map((seconds) => {
                  const active = duration === seconds;
                  return (
                    <Pressable
                      key={seconds}
                      onPress={() => handlePreset(seconds)}
                      accessibilityRole="button"
                      className={`h-10 min-w-16 items-center justify-center rounded-full px-4 ${
                        active ? 'bg-primary' : 'border border-border bg-background'
                      }`}
                    >
                      <Text
                        className={
                          active ? 'font-sans-semibold text-primary-foreground' : 'text-foreground'
                        }
                      >
                        {formatTime(seconds)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            )}

            <View className="flex-row items-center justify-center gap-3">
              <StepButton
                label={`-${STEP_SECONDS}s`}
                disabled={isIdle}
                onPress={() => handleAddSeconds(-STEP_SECONDS)}
              />
              <TimerRing
                progress={progress}
                label={label}
                onPress={isIdle ? () => setPickerOpen(true) : undefined}
              />
              <StepButton
                label={`+${STEP_SECONDS}s`}
                disabled={isIdle}
                onPress={() => handleAddSeconds(STEP_SECONDS)}
              />
            </View>
          </>
        )}

        {tab === 'stopwatch' ? null : isIdle && !pickerOpen ? (
          <Button onPress={handleStart} disabled={duration <= 0}>
            <Icon as={Play} size={18} className="text-primary-foreground" />
            <Text>{t('workoutExecutionScreen.timerSheet.start')}</Text>
          </Button>
        ) : !isIdle ? (
          <View className="flex-row gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onPress={timer.isPaused ? timer.resume : timer.pause}
            >
              <Icon as={timer.isPaused ? Play : Pause} size={18} className="text-foreground" />
              <Text>
                {t(
                  timer.isPaused
                    ? 'workoutExecutionScreen.timerSheet.resume'
                    : 'workoutExecutionScreen.timerSheet.pause',
                )}
              </Text>
            </Button>
            <Button variant="destructive" className="flex-1" onPress={handleStop}>
              <Icon as={Square} size={18} className="text-white" />
              <Text>{t('workoutExecutionScreen.timerSheet.stop')}</Text>
            </Button>
          </View>
        ) : null}
      </BottomSheetView>
    </BottomSheet>
  );
}

function StepButton({
  label,
  disabled,
  onPress,
}: {
  label: string;
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={8}
      accessibilityRole="button"
      className={disabled ? 'opacity-30' : ''}
    >
      <Text className="font-sans-semibold text-base text-primary">{label}</Text>
    </Pressable>
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
