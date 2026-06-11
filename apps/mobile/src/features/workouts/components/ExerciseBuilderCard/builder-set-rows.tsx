import { MAX_LOAD_PERCENT, MAX_REPS, measurementDimensions } from '@workout-tracker/domain';
import { Icon, Input, Text } from '@workout-tracker/ui-mobile';
import { ChevronDown } from 'lucide-react-native';
import { useRef } from 'react';
import { Controller, useFormContext, useFormState, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';
import { SET_TYPE_CONFIG, type SetType } from '@/features/exercises/lib/sets';
import { useUserPreferences } from '@/features/preferences/hooks/use-user-preferences';
import { formatTime, sanitizeInteger } from '@/features/shared/lib/utils';
import {
  DurationPickerSheet,
  type DurationPickerSheetRef,
} from '@/features/workouts/components/DurationPickerSheet';
import {
  DistanceInput,
  type DistanceUnit,
} from '@/features/workouts/components/ExerciseExecutionCard/set-cells';
import type { WorkoutFormInput } from '@/features/workouts/lib/builder-form';
import type { ColumnLayout } from '@/features/workouts/lib/workout-mappers';

export type BuilderColumnLayout = ColumnLayout & { loadPercent: boolean };

export function RepsRangeCells({
  exerciseIndex,
  setIndex,
}: {
  exerciseIndex: number;
  setIndex: number;
}) {
  const { t } = useTranslation();
  const { control, getValues, setValue } = useFormContext<WorkoutFormInput>();
  const { data: preferences } = useUserPreferences();
  const basePath = `exercises.${exerciseIndex}.sets.${setIndex}` as const;

  // Carry the just-entered reps value into the following sets that share the
  // reps dimension and are still empty. Existing values are never overwritten.
  const fillFollowingSets = (column: 'repsMin' | 'repsMax', value: string) => {
    if (!preferences?.autoFillReps || value === '') return;
    const sets = getValues(`exercises.${exerciseIndex}.sets`);
    for (let i = setIndex + 1; i < sets.length; i++) {
      if (!measurementDimensions(sets[i].measurementType).reps) continue;
      if (sets[i][column]) continue;
      setValue(`exercises.${exerciseIndex}.sets.${i}.${column}`, value, {
        shouldDirty: true,
        shouldValidate: true,
      });
    }
  };

  return (
    <>
      <View className="w-20 pr-2 pl-3">
        <Controller
          control={control}
          name={`${basePath}.repsMin`}
          render={({ field, fieldState }) => (
            <Input
              variant="outline-primary"
              keyboardType="number-pad"
              value={field.value}
              onChangeText={(text) => field.onChange(sanitizeInteger(text, { max: MAX_REPS }))}
              onBlur={() => {
                field.onBlur();
                fillFollowingSets('repsMin', field.value);
              }}
              aria-invalid={fieldState.invalid}
              placeholder={t('workoutFormScreen.exercise.headers.repsMin')}
              className="h-8 max-w-[80px] py-0 text-sm"
              maxLength={2}
              testID={`workout-form.set-${setIndex}.reps-min`}
            />
          )}
        />
      </View>
      <View className="w-20 px-2">
        <Controller
          control={control}
          name={`${basePath}.repsMax`}
          render={({ field, fieldState }) => (
            <Input
              variant="outline-primary"
              keyboardType="number-pad"
              value={field.value}
              onChangeText={(text) => field.onChange(sanitizeInteger(text, { max: MAX_REPS }))}
              onBlur={() => {
                field.onBlur();
                fillFollowingSets('repsMax', field.value);
              }}
              aria-invalid={fieldState.invalid}
              placeholder={t('workoutFormScreen.exercise.headers.repsMax')}
              className="h-8 max-w-[80px] py-0 text-sm"
              maxLength={2}
              testID={`workout-form.set-${setIndex}.reps-max`}
            />
          )}
        />
      </View>
    </>
  );
}

export function DurationTargetCell({
  exerciseIndex,
  setIndex,
}: {
  exerciseIndex: number;
  setIndex: number;
}) {
  const { control } = useFormContext<WorkoutFormInput>();
  const basePath = `exercises.${exerciseIndex}.sets.${setIndex}` as const;
  const sheetRef = useRef<DurationPickerSheetRef>(null);

  return (
    <View className="w-28 px-2">
      <Controller
        control={control}
        name={`${basePath}.duration`}
        render={({ field, fieldState }) => {
          const hasValue = field.value !== '';
          return (
            <Pressable
              onPress={() =>
                sheetRef.current?.present(
                  hasValue ? Number(field.value) : 0,
                  (secs) => field.onChange(String(secs)),
                  () => field.onChange(''),
                )
              }
              accessibilityRole="button"
              testID={`workout-form.set-${setIndex}.duration`}
              className={`h-8 items-center justify-center border-b ${
                fieldState.invalid ? 'border-destructive' : 'border-primary'
              }`}
            >
              <Text className={`text-sm ${hasValue ? 'text-foreground' : 'text-muted-foreground'}`}>
                {formatTime(hasValue ? Number(field.value) : 0)}
              </Text>
            </Pressable>
          );
        }}
      />
      <DurationPickerSheet ref={sheetRef} />
    </View>
  );
}

export function DistanceTargetCell({
  exerciseIndex,
  setIndex,
  unit,
}: {
  exerciseIndex: number;
  setIndex: number;
  unit: DistanceUnit;
}) {
  const { control } = useFormContext<WorkoutFormInput>();
  const basePath = `exercises.${exerciseIndex}.sets.${setIndex}` as const;
  return (
    <Controller
      control={control}
      name={`${basePath}.distance`}
      render={({ field, fieldState }) => (
        <DistanceInput
          value={field.value}
          onChange={field.onChange}
          onBlur={field.onBlur}
          invalid={fieldState.invalid}
          unit={unit}
          testID={`workout-form.set-${setIndex}.distance`}
        />
      )}
    />
  );
}

export function LoadPercentCell({
  exerciseIndex,
  setIndex,
  linked,
}: {
  exerciseIndex: number;
  setIndex: number;
  linked: boolean;
}) {
  const { control } = useFormContext<WorkoutFormInput>();
  const basePath = `exercises.${exerciseIndex}.sets.${setIndex}` as const;
  if (!linked) {
    return <View className="w-24 px-2" />;
  }
  return (
    <View className="w-24 px-2">
      <Controller
        control={control}
        name={`${basePath}.loadPercent`}
        render={({ field, fieldState }) => (
          <Input
            variant="outline-primary"
            keyboardType="number-pad"
            value={field.value}
            onChangeText={(text) =>
              field.onChange(sanitizeInteger(text, { max: MAX_LOAD_PERCENT }))
            }
            onBlur={field.onBlur}
            aria-invalid={fieldState.invalid}
            className="h-8 py-0 text-sm"
            maxLength={3}
            testID={`workout-form.set-${setIndex}.load-percent`}
          />
        )}
      />
    </View>
  );
}

export function BuilderSetCells({
  exerciseIndex,
  setIndex,
  layout,
  distanceUnit,
}: {
  exerciseIndex: number;
  setIndex: number;
  layout: BuilderColumnLayout;
  distanceUnit: DistanceUnit;
}) {
  const { control } = useFormContext<WorkoutFormInput>();
  const basePath = `exercises.${exerciseIndex}.sets.${setIndex}` as const;
  const measurementType = useWatch({ control, name: `${basePath}.measurementType` });
  const type = useWatch({ control, name: `${basePath}.type` });
  const dims = measurementDimensions(measurementType);
  const linked = type === 'drop' || type === 'cluster';

  return (
    <>
      {layout.reps ? (
        dims.reps ? (
          <RepsRangeCells exerciseIndex={exerciseIndex} setIndex={setIndex} />
        ) : (
          <>
            <View className="w-20 pr-2 pl-3" />
            <View className="w-20 px-2" />
          </>
        )
      ) : null}
      {layout.duration ? (
        dims.duration ? (
          <DurationTargetCell exerciseIndex={exerciseIndex} setIndex={setIndex} />
        ) : (
          <View className="w-28 px-2" />
        )
      ) : null}
      {layout.distance ? (
        dims.distance ? (
          <DistanceTargetCell
            exerciseIndex={exerciseIndex}
            setIndex={setIndex}
            unit={distanceUnit}
          />
        ) : (
          <View className="w-32 px-2" />
        )
      ) : null}
      {layout.loadPercent ? (
        <LoadPercentCell exerciseIndex={exerciseIndex} setIndex={setIndex} linked={linked} />
      ) : null}
    </>
  );
}

export function SetErrorMessage({
  exerciseIndex,
  setIndex,
  className,
}: {
  exerciseIndex: number;
  setIndex: number;
  className?: string;
}) {
  const { t } = useTranslation();
  const { control } = useFormContext<WorkoutFormInput>();
  const { errors } = useFormState({
    control,
    name: `exercises.${exerciseIndex}.sets.${setIndex}`,
  });
  const setErrors = errors.exercises?.[exerciseIndex]?.sets?.[setIndex];
  const messages = [
    setErrors?.repsMin?.message,
    setErrors?.repsMax?.message,
    setErrors?.duration?.message,
    setErrors?.distance?.message,
    setErrors?.loadPercent?.message,
  ].filter((message): message is string => Boolean(message));
  const unique = [...new Set(messages)];
  if (unique.length === 0) return null;

  return (
    <View className={`gap-0.5 pt-1.5 ${className ?? ''}`}>
      {unique.map((message) => (
        <Text key={message} className="text-destructive text-xs">
          {`• ${t(message)}`}
        </Text>
      ))}
    </View>
  );
}

export function SetTypePressable({
  value,
  onPress,
  testID,
}: {
  value: SetType;
  onPress: () => void;
  testID?: string;
}) {
  const { t } = useTranslation();
  const typeConfig = SET_TYPE_CONFIG[value];
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      className="h-8 flex-row items-center justify-center gap-1 border-primary border-b"
      accessibilityRole="button"
      testID={testID}
    >
      <Text className={`w-5 text-center font-sans-semibold text-sm ${typeConfig.textColor}`}>
        {t(typeConfig.token)}
      </Text>
      <Icon as={ChevronDown} size={12} className="text-muted-foreground" />
    </Pressable>
  );
}
