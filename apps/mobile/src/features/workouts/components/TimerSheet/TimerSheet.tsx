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
import { formatTime } from '@/features/shared/lib/utils';
import type { RestTimerController } from '@/features/workouts/hooks/use-rest-timer-controller';
import { StopwatchView } from './StopwatchView';
import { TimerRing } from './TimerRing';
import { TimeWheelPicker } from './TimeWheelPicker';

type Tab = 'timer' | 'stopwatch';

const PRESETS_SECONDS = [30, 60, 90, 120];
const STEP_SECONDS = 15;

export type TimerSheetRef = {
  present: (durationSeconds?: number) => void;
  dismiss: () => void;
};

type Props = {
  controller: RestTimerController;
  ref?: Ref<TimerSheetRef>;
};

export function TimerSheet({ controller, ref }: Props) {
  const { t } = useTranslation();
  const sheetRef = useRef<BottomSheetRef>(null);
  const [tab, setTab] = useState<Tab>('timer');
  const [pickerOpen, setPickerOpen] = useState(false);

  useImperativeHandle(ref, () => ({
    present: (durationSeconds?: number) => {
      setPickerOpen(false);
      if (durationSeconds != null && durationSeconds > 0) {
        setTab('timer');
        controller.requestStart(durationSeconds);
      }
      sheetRef.current?.present();
    },
    dismiss: () => sheetRef.current?.dismiss(),
  }));

  const { isIdle, duration, progress, label, isPaused } = controller;

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
            <TimeWheelPicker totalSeconds={duration} onChange={controller.setDurationFromPicker} />
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
                      onPress={() => controller.setPreset(seconds)}
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
                onPress={() => controller.addSeconds(-STEP_SECONDS)}
              />
              <TimerRing
                progress={progress}
                label={label}
                onPress={isIdle ? () => setPickerOpen(true) : undefined}
              />
              <StepButton
                label={`+${STEP_SECONDS}s`}
                disabled={isIdle}
                onPress={() => controller.addSeconds(STEP_SECONDS)}
              />
            </View>
          </>
        )}

        {tab === 'stopwatch' ? null : isIdle && !pickerOpen ? (
          <Button onPress={controller.start} disabled={duration <= 0}>
            <Icon as={Play} size={18} className="text-primary-foreground" />
            <Text>{t('workoutExecutionScreen.timerSheet.start')}</Text>
          </Button>
        ) : !isIdle ? (
          <View className="flex-row gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onPress={isPaused ? controller.resume : controller.pause}
            >
              <Icon as={isPaused ? Play : Pause} size={18} className="text-foreground" />
              <Text>
                {t(
                  isPaused
                    ? 'workoutExecutionScreen.timerSheet.resume'
                    : 'workoutExecutionScreen.timerSheet.pause',
                )}
              </Text>
            </Button>
            <Button variant="destructive" className="flex-1" onPress={controller.stop}>
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
