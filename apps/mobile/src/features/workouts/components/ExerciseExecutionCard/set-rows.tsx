import {
  computeLinkedLoad,
  type LoadRoundingMode,
  measurementDimensions,
} from '@workout-tracker/domain';
import { Icon, Input, Text } from '@workout-tracker/ui-mobile';
import { Play, Square } from 'lucide-react-native';
import { useRef } from 'react';
import { Controller, useFormContext, useWatch } from 'react-hook-form';
import { Pressable, View } from 'react-native';
import { useUserPreferences } from '@/features/preferences/hooks/use-user-preferences';
import { useCountdownTimer } from '@/features/shared/hooks/use-countdown-timer';
import { useStopwatch } from '@/features/shared/hooks/use-stopwatch';
import { formatTime, sanitizeDecimal, sanitizeInteger } from '@/features/shared/lib/utils';
import { parseLocalizedNumber } from '@/features/shared/lib/utils/numeric-input';
import {
  DurationPickerSheet,
  type DurationPickerSheetRef,
} from '@/features/workouts/components/DurationPickerSheet';
import type { ExecutionFormInput } from '@/features/workouts/lib/execution-form';
import { type ColumnLayout, formatSetTarget } from '@/features/workouts/lib/workout-mappers';

const MAX_WEIGHT_INTEGER_DIGITS = 3;
const MAX_WEIGHT_FRACTION_DIGITS = 2;
const MAX_REPS = 99;

type SetRowBodyProps = {
  exerciseIndex: number;
  setIndex: number;
  layout: ColumnLayout;
};

type DurationSetRowProps = SetRowBodyProps & {
  onComplete: () => void;
};

function TargetCell({ target }: { target: string }) {
  return (
    <View className="w-20 px-2">
      <Text variant="muted" className="text-center text-xs">
        {target}
      </Text>
    </View>
  );
}

export function WeightRepsSetRow({ exerciseIndex, setIndex }: SetRowBodyProps) {
  const { control, getValues, setValue } = useFormContext<ExecutionFormInput>();
  const { data: preferences } = useUserPreferences();
  const basePath = `exercises.${exerciseIndex}.sets.${setIndex}` as const;
  const lastKg = useWatch({ control, name: `${basePath}.lastKg` });
  const lastReps = useWatch({ control, name: `${basePath}.lastReps` });
  const repsMin = useWatch({ control, name: `${basePath}.repsMin` });
  const repsMax = useWatch({ control, name: `${basePath}.repsMax` });
  const target = formatSetTarget(repsMin ?? null, repsMax ?? null);

  // Cascades the suggested load down the exercise's set chain. `linkedSetId`
  // points to the set directly above, so a drop/cluster set takes a percentage
  // of its predecessor's load — and a chain (normal → drop → drop) resolves in
  // order. Each set's effective load (manual value if present, otherwise the
  // computed one) becomes the base for the next. Only empty fields are filled,
  // so a manually adjusted load is preserved.
  const fillLinkedLoads = () => {
    const mode: LoadRoundingMode = preferences?.loadRounding ?? 'none';
    const effectiveKg = new Map<string, number>();
    getValues(`exercises.${exerciseIndex}.sets`).forEach((set, i) => {
      if (set.kg !== '') {
        const value = parseLocalizedNumber(set.kg);
        if (Number.isFinite(value)) effectiveKg.set(set.id, value);
        return;
      }
      if (set.loadPercentOfPrevious == null || set.linkedSetId == null) return;
      if (!measurementDimensions(set.measurementType).weight) return;
      const base = effectiveKg.get(set.linkedSetId);
      if (base == null) return;
      const kg = computeLinkedLoad(base, set.loadPercentOfPrevious, mode);
      effectiveKg.set(set.id, kg);
      setValue(`exercises.${exerciseIndex}.sets.${i}.kg`, String(kg), {
        shouldDirty: true,
        shouldValidate: true,
      });
    });
  };

  return (
    <>
      <View className="w-20 pr-2 pl-3">
        <Controller
          control={control}
          name={`${basePath}.kg`}
          render={({ field, fieldState }) => (
            <Input
              variant="outline-primary"
              keyboardType="decimal-pad"
              value={field.value}
              onChangeText={(text) =>
                field.onChange(
                  sanitizeDecimal(text, {
                    maxIntegerDigits: MAX_WEIGHT_INTEGER_DIGITS,
                    maxFractionDigits: MAX_WEIGHT_FRACTION_DIGITS,
                  }),
                )
              }
              onBlur={() => {
                field.onBlur();
                fillLinkedLoads();
              }}
              aria-invalid={fieldState.invalid}
              className="h-8 max-w-[80px] py-0 text-sm"
              placeholder={lastKg != null ? String(lastKg) : undefined}
            />
          )}
        />
      </View>
      <View className="w-20 px-2">
        <Controller
          control={control}
          name={`${basePath}.reps`}
          render={({ field, fieldState }) => (
            <Input
              variant="outline-primary"
              keyboardType="number-pad"
              value={field.value}
              onChangeText={(text) => field.onChange(sanitizeInteger(text, { max: MAX_REPS }))}
              onBlur={field.onBlur}
              aria-invalid={fieldState.invalid}
              className="h-8 max-w-[80px] py-0 text-sm"
              maxLength={2}
              placeholder={lastReps != null ? String(lastReps) : undefined}
            />
          )}
        />
      </View>
      <TargetCell target={target} />
    </>
  );
}

export function RepsSetRow({ exerciseIndex, setIndex, layout }: SetRowBodyProps) {
  const { control } = useFormContext<ExecutionFormInput>();
  const basePath = `exercises.${exerciseIndex}.sets.${setIndex}` as const;
  const lastReps = useWatch({ control, name: `${basePath}.lastReps` });
  const repsMin = useWatch({ control, name: `${basePath}.repsMin` });
  const repsMax = useWatch({ control, name: `${basePath}.repsMax` });
  const target = formatSetTarget(repsMin ?? null, repsMax ?? null);

  return (
    <>
      {layout.weight ? <View className="w-20 pr-2 pl-3" /> : null}
      <View className="w-20 px-2">
        <Controller
          control={control}
          name={`${basePath}.reps`}
          render={({ field, fieldState }) => (
            <Input
              variant="outline-primary"
              keyboardType="number-pad"
              value={field.value}
              onChangeText={(text) => field.onChange(sanitizeInteger(text, { max: MAX_REPS }))}
              onBlur={field.onBlur}
              aria-invalid={fieldState.invalid}
              className="h-8 max-w-[80px] py-0 text-sm"
              maxLength={2}
              placeholder={lastReps != null ? String(lastReps) : undefined}
            />
          )}
        />
      </View>
      <TargetCell target={target} />
    </>
  );
}

export function DurationSetRow({
  exerciseIndex,
  setIndex,
  layout,
  onComplete,
}: DurationSetRowProps) {
  const { control, setValue } = useFormContext<ExecutionFormInput>();
  const basePath = `exercises.${exerciseIndex}.sets.${setIndex}` as const;
  const durationTarget = useWatch({ control, name: `${basePath}.durationTarget` });
  const target = durationTarget ?? 0;
  const hasTarget = target > 0;
  const durationSheetRef = useRef<DurationPickerSheetRef>(null);

  const record = (totalSeconds: number) => {
    setValue(`${basePath}.duration`, String(totalSeconds), {
      shouldDirty: true,
      shouldValidate: true,
    });
    onComplete();
  };

  const countdown = useCountdownTimer({
    durationSeconds: target,
    onComplete: () => record(target),
  });
  const stopwatch = useStopwatch();

  const running = hasTarget ? countdown.isRunning : stopwatch.isRunning;
  const liveSeconds = hasTarget ? countdown.remainingSeconds : stopwatch.elapsedSeconds;

  const handlePlayStop = () => {
    if (hasTarget) {
      if (countdown.isRunning) {
        record(Math.max(0, target - countdown.remainingSeconds));
        countdown.reset();
      } else {
        countdown.start();
      }
    } else if (stopwatch.isRunning) {
      record(stopwatch.elapsedSeconds);
      stopwatch.reset();
    } else {
      stopwatch.start();
    }
  };

  return (
    <>
      {layout.weight ? <View className="w-20 pr-2 pl-3" /> : null}
      <View className="w-28 flex-row items-center gap-3 px-2">
        <Controller
          control={control}
          name={`${basePath}.duration`}
          render={({ field, fieldState }) => {
            const hasValue = field.value !== '';
            const displaySeconds = running ? liveSeconds : hasValue ? Number(field.value) : 0;
            return (
              <Pressable
                onPress={() =>
                  durationSheetRef.current?.present(
                    hasValue ? Number(field.value) : 0,
                    (secs) => field.onChange(String(secs)),
                    () => field.onChange(''),
                  )
                }
                disabled={running}
                accessibilityRole="button"
                testID={`workout-execution.set-${setIndex}.duration`}
                className={`h-8 flex-1 items-center justify-center border-b ${
                  fieldState.invalid ? 'border-destructive' : 'border-primary'
                }`}
              >
                <Text
                  className={`text-sm ${
                    running || hasValue ? 'text-foreground' : 'text-muted-foreground'
                  }`}
                >
                  {formatTime(displaySeconds)}
                </Text>
              </Pressable>
            );
          }}
        />
        <Pressable
          onPress={handlePlayStop}
          accessibilityRole="button"
          testID={`workout-execution.set-${setIndex}.timer`}
          className={`h-8 w-8 items-center justify-center rounded-full ${running ? 'bg-destructive' : 'bg-primary'}`}
        >
          <Icon as={running ? Square : Play} size={16} className="text-primary-foreground" />
        </Pressable>
      </View>
      <TargetCell target={hasTarget ? formatTime(target) : ''} />
      <DurationPickerSheet ref={durationSheetRef} />
    </>
  );
}
