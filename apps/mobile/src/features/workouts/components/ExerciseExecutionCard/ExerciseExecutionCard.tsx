import { getValidSetTypesAt } from '@workout-tracker/domain';
import { Button, Card, Checkbox, Icon, Input, Text } from '@workout-tracker/ui-mobile';
import * as Crypto from 'expo-crypto';
import { ChevronDown, ChevronUp, GripVertical, Plus } from 'lucide-react-native';
import { useRef, useState } from 'react';
import { Controller, useFieldArray, useFormContext, useFormState, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { SET_TYPE_CONFIG, type SetType } from '@/features/exercises/lib/sets';
import { sanitizeDecimal, sanitizeInteger } from '@/features/shared/lib/utils';
import {
  SetTypePickerSheet,
  type SetTypePickerSheetRef,
} from '@/features/workouts/components/SetTypePickerSheet';
import { SetTypesHelpDialog } from '@/features/workouts/components/SetTypesHelpDialog';
import type { ExecutionFormInput } from '@/features/workouts/lib/execution-form';
import type { ExerciseExecutionCardProps } from './types';

const MAX_WEIGHT_INTEGER_DIGITS = 3;
const MAX_WEIGHT_FRACTION_DIGITS = 2;
const MAX_REPS = 99;

const SET_TYPE_INITIAL: Record<SetType, string> = {
  warmup: 'W',
  normal: 'N',
  drop: 'D',
  cluster: 'C',
};

export function ExerciseExecutionCard({
  exerciseIndex,
  name,
  variationName,
  setTargets,
  dragHandle,
  onPressHeader,
}: ExerciseExecutionCardProps) {
  const { t } = useTranslation();
  const [collapsed, setCollapsed] = useState(true);
  const { control, getValues } = useFormContext<ExecutionFormInput>();
  const { fields, append, remove } = useFieldArray({
    control,
    name: `exercises.${exerciseIndex}.sets`,
  });
  const { errors } = useFormState({
    control,
    name: `exercises.${exerciseIndex}`,
  });
  const hasError = Boolean(errors.exercises?.[exerciseIndex]);
  const setTypePickerRef = useRef<SetTypePickerSheetRef>(null);

  const handleAddSet = () => {
    const previous = fields[fields.length - 1];
    append({
      id: Crypto.randomUUID(),
      type: previous?.type ?? 'normal',
      repsMin: null,
      repsMax: null,
      kg: '',
      reps: '',
      done: false,
    });
  };

  return (
    <Card className={`gap-3 py-2 ${hasError ? 'border-destructive/50' : ''}`}>
      <View className="flex-row items-center justify-between gap-2 px-4">
        {dragHandle ?? <Icon as={GripVertical} size={18} className="text-muted-foreground" />}
        <Pressable
          className="flex-1"
          onPress={onPressHeader}
          disabled={!onPressHeader}
          accessibilityRole={onPressHeader ? 'link' : undefined}
        >
          <Text className="font-sans-semibold text-base" numberOfLines={1}>
            {name}
          </Text>
          <Text variant="muted" className="text-xs" numberOfLines={1}>
            {variationName ?? t('workoutExecutionScreen.exercise.noVariation')}
          </Text>
        </Pressable>
        <Pressable onPress={() => setCollapsed((c) => !c)} hitSlop={12} accessibilityRole="button">
          <Icon as={collapsed ? ChevronDown : ChevronUp} size={20} className="text-foreground" />
        </Pressable>
      </View>

      {!collapsed ? (
        <Animated.View entering={FadeIn.duration(180)} exiting={FadeOut.duration(120)}>
          <View className="px-4">
            <View className="flex-row items-center pb-2">
              <View className="w-10">
                <View className="flex-row items-center gap-1">
                  <Text className="font-sans-medium text-muted-foreground text-xs uppercase tracking-wider">
                    #
                  </Text>
                  <SetTypesHelpDialog />
                </View>
              </View>
              <View className="flex-1 pr-2 pl-3">
                <Text className="font-sans-medium text-muted-foreground text-xs uppercase tracking-wider">
                  {t('workoutExecutionScreen.exercise.headers.weight')}
                </Text>
              </View>
              <View className="flex-1 px-2">
                <Text className="font-sans-medium text-muted-foreground text-xs uppercase tracking-wider">
                  {t('workoutExecutionScreen.exercise.headers.reps')}
                </Text>
              </View>
              <View className="w-20 px-2">
                <Text className="text-center font-sans-medium text-muted-foreground text-xs uppercase tracking-wider">
                  {t('workoutExecutionScreen.exercise.headers.target')}
                </Text>
              </View>
              <View className="w-10 items-center">
                <Text className="font-sans-medium text-muted-foreground text-xs uppercase tracking-wider">
                  ✓
                </Text>
              </View>
            </View>

            {fields.map((field, setIndex) => (
              <SetRow
                key={field.id}
                exerciseIndex={exerciseIndex}
                setIndex={setIndex}
                target={setTargets[setIndex] ?? ''}
                onPressType={(currentType, onChange) => {
                  const sets = getValues(`exercises.${exerciseIndex}.sets`);
                  const validTypes = getValidSetTypesAt(sets, setIndex);
                  setTypePickerRef.current?.present(
                    currentType,
                    validTypes,
                    onChange,
                    fields.length > 1 ? () => remove(setIndex) : undefined,
                  );
                }}
              />
            ))}
          </View>

          <View className="px-4 pt-3">
            <Button variant="outline" size="sm" onPress={handleAddSet} className="w-full">
              <Icon as={Plus} size={14} className="text-secondary-foreground" />
              <Text className="font-sans-semibold text-secondary-foreground text-sm">
                {t('workoutExecutionScreen.exercise.addSet')}
              </Text>
            </Button>
          </View>
        </Animated.View>
      ) : null}
      <SetTypePickerSheet ref={setTypePickerRef} />
    </Card>
  );
}

function SetRow({
  exerciseIndex,
  setIndex,
  target,
  onPressType,
}: {
  exerciseIndex: number;
  setIndex: number;
  target: string;
  onPressType: (currentType: SetType, onChange: (next: SetType) => void) => void;
}) {
  const { control } = useFormContext<ExecutionFormInput>();
  const basePath = `exercises.${exerciseIndex}.sets.${setIndex}` as const;
  const done = useWatch({ control, name: `${basePath}.done` });

  return (
    <View className={`-mx-4 flex-row items-center px-4 py-0.5 ${done ? 'bg-primary/10' : ''}`}>
      <View className="w-10">
        <Controller
          control={control}
          name={`${basePath}.type`}
          render={({ field }) => {
            const typeConfig = SET_TYPE_CONFIG[field.value];
            return (
              <Pressable
                onPress={() => onPressType(field.value, field.onChange)}
                hitSlop={8}
                className="h-8 flex-row items-center justify-center gap-1 border-primary border-b"
                accessibilityRole="button"
              >
                <Text
                  className={`w-5 text-center font-sans-semibold text-sm ${typeConfig.textColor}`}
                >
                  {SET_TYPE_INITIAL[field.value]}
                </Text>
                <Icon as={ChevronDown} size={12} className="text-muted-foreground" />
              </Pressable>
            );
          }}
        />
      </View>
      <View className="flex-1 pr-2 pl-3">
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
              onBlur={field.onBlur}
              aria-invalid={fieldState.invalid}
              className="h-8 py-0 text-sm"
            />
          )}
        />
      </View>
      <View className="flex-1 px-2">
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
              className="h-8 py-0 text-sm"
              maxLength={2}
            />
          )}
        />
      </View>
      <View className="w-20 px-2">
        <Text variant="muted" className="text-center text-xs">
          {target}
        </Text>
      </View>
      <Controller
        control={control}
        name={`${basePath}.done`}
        render={({ field }) => (
          <Pressable
            onPress={() => field.onChange(!field.value)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: field.value }}
            className="w-10 items-center justify-center self-stretch"
            hitSlop={0}
          >
            <Checkbox checked={field.value} onCheckedChange={field.onChange} hitSlop={0} />
          </Pressable>
        )}
      />
    </View>
  );
}
