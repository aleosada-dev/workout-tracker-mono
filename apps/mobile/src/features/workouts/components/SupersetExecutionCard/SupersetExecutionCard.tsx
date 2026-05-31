import { getValidSetTypesAt } from '@workout-tracker/domain';
import { Button, Card, Checkbox, Icon, Input, Text } from '@workout-tracker/ui-mobile';
import * as Crypto from 'expo-crypto';
import { ChevronDown, ChevronUp, GripVertical, Plus, Timer } from 'lucide-react-native';
import { useRef, useState } from 'react';
import { Controller, useFormContext, useFormState, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { SET_TYPE_CONFIG, type SetType } from '@/features/exercises/lib/sets';
import { formatRestSeconds, sanitizeDecimal, sanitizeInteger } from '@/features/shared/lib/utils';
import {
  SetTypePickerSheet,
  type SetTypePickerSheetRef,
} from '@/features/workouts/components/SetTypePickerSheet';
import { SetTypesHelpDialog } from '@/features/workouts/components/SetTypesHelpDialog';
import { SupersetHelpDialog } from '@/features/workouts/components/SupersetHelpDialog';
import {
  autofillFromLast,
  type ExecutionFormInput,
  matchExecutionSetsToLog,
  matchExecutionSetsToTemplate,
  restTimerDuration,
} from '@/features/workouts/lib/execution-form';
import { formatSetTarget, type SupersetMember } from '@/features/workouts/lib/workout-mappers';
import { activeWorkout$ } from '@/features/workouts/state/active-workout-store';
import { startRestTimer } from '@/features/workouts/state/rest-timer-bridge';
import type { SupersetExecutionCardProps } from './types';

const MAX_WEIGHT_INTEGER_DIGITS = 3;
const MAX_WEIGHT_FRACTION_DIGITS = 2;
const MAX_REPS = 99;

const SELECTABLE_SET_TYPES: readonly SetType[] = ['warmup', 'normal'];

const SET_TYPE_INITIAL: Record<SetType, string> = {
  warmup: 'W',
  normal: 'N',
  drop: 'D',
  cluster: 'C',
};

type MemberSets = ExecutionFormInput['exercises'][number]['sets'];

type PressTypeHandler = (exerciseIndex: number, setIndex: number, currentType: SetType) => void;

export function SupersetExecutionCard({
  members,
  restSeconds,
  dragHandle,
  onPressMember,
}: SupersetExecutionCardProps) {
  const { t } = useTranslation();
  const [collapsed, setCollapsed] = useState(true);
  const { control, getValues, setValue } = useFormContext<ExecutionFormInput>();
  const memberSetsNames = members.map((m) => `exercises.${m.exerciseIndex}.sets` as const);
  const watchedMemberSets = useWatch({ control, name: memberSetsNames }) as
    | MemberSets[]
    | undefined;
  const setsByMember = watchedMemberSets ?? [];
  const maxSets = setsByMember.reduce((max, sets) => Math.max(max, sets?.length ?? 0), 0);
  const { errors } = useFormState({ control, name: 'exercises' });
  const hasError = members.some((m) => Boolean(errors.exercises?.[m.exerciseIndex]));
  const setTypePickerRef = useRef<SetTypePickerSheetRef>(null);

  const rematchMember = (exerciseIndex: number) => {
    const memberSets = getValues(`exercises.${exerciseIndex}.sets`);
    const variationId = getValues(`exercises.${exerciseIndex}.variation.id`);

    const logExercise = activeWorkout$.lastLog
      .peek()
      ?.exercises.find((exercise) => exercise.variationId === variationId);
    matchExecutionSetsToLog(memberSets, logExercise?.sets).forEach((last, i) => {
      setValue(`exercises.${exerciseIndex}.sets.${i}.lastKg`, last.lastKg);
      setValue(`exercises.${exerciseIndex}.sets.${i}.lastReps`, last.lastReps);
    });

    const templateExercise = activeWorkout$.workoutTemplate
      .peek()
      ?.exercises.find((exercise) => exercise.variation.id === variationId);
    if (templateExercise) {
      matchExecutionSetsToTemplate(memberSets, templateExercise.sets).forEach((target, i) => {
        setValue(`exercises.${exerciseIndex}.sets.${i}.repsMin`, target.repsMin);
        setValue(`exercises.${exerciseIndex}.sets.${i}.repsMax`, target.repsMax);
        setValue(`exercises.${exerciseIndex}.sets.${i}.durationTarget`, target.durationTarget);
      });
    }
  };

  const handleAddSet = () => {
    for (const member of members) {
      const current = getValues(`exercises.${member.exerciseIndex}.sets`);
      const measurementType = current[current.length - 1]?.measurementType ?? 'weight_reps';
      setValue(
        `exercises.${member.exerciseIndex}.sets`,
        [
          ...current,
          {
            id: Crypto.randomUUID(),
            type: 'normal',
            measurementType,
            repsMin: null,
            repsMax: null,
            durationTarget: null,
            kg: '',
            reps: '',
            duration: '',
            done: false,
          },
        ],
        { shouldDirty: true },
      );
      rematchMember(member.exerciseIndex);
    }
  };

  const handleChangeSetType = (exerciseIndex: number, setIndex: number, next: SetType) => {
    setValue(`exercises.${exerciseIndex}.sets.${setIndex}.type`, next, { shouldDirty: true });
    rematchMember(exerciseIndex);
  };

  const handleRemoveExerciseSet = (exerciseIndex: number, setIndex: number) => {
    const current = getValues(`exercises.${exerciseIndex}.sets`);
    setValue(
      `exercises.${exerciseIndex}.sets`,
      current.filter((_, i) => i !== setIndex),
      { shouldDirty: true },
    );
    rematchMember(exerciseIndex);
  };

  const handleRemoveSupersetSet = (setIndex: number) => {
    for (const member of members) {
      const current = getValues(`exercises.${member.exerciseIndex}.sets`);
      if (setIndex >= current.length) continue;
      setValue(
        `exercises.${member.exerciseIndex}.sets`,
        current.filter((_, i) => i !== setIndex),
        { shouldDirty: true },
      );
      rematchMember(member.exerciseIndex);
    }
  };

  const handlePressType: PressTypeHandler = (exerciseIndex, setIndex, currentType) => {
    const exerciseSets = getValues(`exercises.${exerciseIndex}.sets`);
    const validTypes = getValidSetTypesAt(exerciseSets, setIndex).filter((type) =>
      SELECTABLE_SET_TYPES.includes(type),
    );
    const positions = members.reduce(
      (max, m) => Math.max(max, getValues(`exercises.${m.exerciseIndex}.sets`).length),
      0,
    );
    setTypePickerRef.current?.present(
      currentType,
      validTypes,
      (next) => handleChangeSetType(exerciseIndex, setIndex, next),
      {
        onRemoveSet:
          exerciseSets.length > 1
            ? () => handleRemoveExerciseSet(exerciseIndex, setIndex)
            : undefined,
        onRemoveSupersetSet: positions > 1 ? () => handleRemoveSupersetSet(setIndex) : undefined,
      },
    );
  };

  return (
    <Card className={`gap-3 py-2 ${hasError ? 'border-destructive/50' : ''}`}>
      <View className="flex-row items-center justify-between gap-2 px-4">
        {dragHandle ?? <Icon as={GripVertical} size={18} className="text-muted-foreground" />}
        <View className="flex-1 flex-row items-center gap-1.5">
          <Text className="font-sans-semibold text-base text-foreground">
            {t('workoutExecutionScreen.superset.title')}
          </Text>
          <SupersetHelpDialog />
        </View>
        <Pressable
          onPress={() => setCollapsed((c) => !c)}
          hitSlop={12}
          accessibilityRole="button"
          testID="workout-execution.superset.collapse"
        >
          <Icon as={collapsed ? ChevronDown : ChevronUp} size={20} className="text-foreground" />
        </Pressable>
      </View>

      <View className="gap-2 px-4">
        {members.map((member) => (
          <Pressable
            key={member.exerciseIndex}
            className="flex-row items-center gap-2"
            onPress={onPressMember ? () => onPressMember(member.variationId) : undefined}
            disabled={!onPressMember}
            accessibilityRole={onPressMember ? 'link' : undefined}
          >
            <View className="h-5 w-5 items-center justify-center rounded-full bg-primary">
              <Text className="font-sans-semibold text-[10px] text-primary-foreground">
                {member.letter}
              </Text>
            </View>
            <View className="flex-1">
              <Text className="text-sm" numberOfLines={1}>
                {member.name}
              </Text>
              {member.variationName != null ? (
                <Text variant="muted" className="text-xs" numberOfLines={1}>
                  {member.variationName}
                </Text>
              ) : null}
            </View>
          </Pressable>
        ))}
      </View>

      {!collapsed ? (
        <Animated.View entering={FadeIn.duration(180)} exiting={FadeOut.duration(120)}>
          {restSeconds != null ? (
            <View className="flex-row items-center justify-end gap-2 px-4 pt-3 pb-4">
              <Icon as={Timer} size={16} className="text-foreground" />
              <Text className="text-sm">{formatRestSeconds(restSeconds)}</Text>
            </View>
          ) : null}
          <View className="px-4">
            <View className="flex-row items-center pb-2">
              <View className="w-8" />
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

            {Array.from({ length: maxSets }).map((_, setIndex) => (
              <SupersetSetRow
                key={setsByMember.map((sets) => sets?.[setIndex]?.id ?? 'x').join('-')}
                members={members}
                setsByMember={setsByMember}
                setIndex={setIndex}
                onPressType={handlePressType}
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

function SupersetSetRow({
  members,
  setsByMember,
  setIndex,
  onPressType,
}: {
  members: SupersetMember[];
  setsByMember: MemberSets[];
  setIndex: number;
  onPressType: PressTypeHandler;
}) {
  const { control, getValues, setValue } = useFormContext<ExecutionFormInput>();
  const presentMembers = members.filter((_, i) => (setsByMember[i]?.length ?? 0) > setIndex);
  const doneNames = presentMembers.map(
    (m) => `exercises.${m.exerciseIndex}.sets.${setIndex}.done` as const,
  );
  const dones = useWatch({ control, name: doneNames });
  const allDone = Array.isArray(dones) && dones.length > 0 ? dones.every(Boolean) : false;

  const toggle = (next: boolean) => {
    for (const member of presentMembers) {
      const base = `exercises.${member.exerciseIndex}.sets.${setIndex}` as const;
      if (next) {
        const kg = autofillFromLast(getValues(`${base}.kg`), getValues(`${base}.lastKg`));
        if (kg != null) {
          setValue(`${base}.kg`, kg, { shouldDirty: true, shouldValidate: true });
        }
        const reps = autofillFromLast(getValues(`${base}.reps`), getValues(`${base}.lastReps`));
        if (reps != null) {
          setValue(`${base}.reps`, reps, { shouldDirty: true, shouldValidate: true });
        }
      }
      setValue(`${base}.done`, next, { shouldDirty: true, shouldValidate: true });
    }
    if (next) {
      const last = presentMembers[presentMembers.length - 1];
      const rest = last
        ? restTimerDuration(getValues(`exercises.${last.exerciseIndex}.restSeconds`))
        : null;
      if (rest != null) {
        startRestTimer(rest);
      }
    }
  };

  return (
    <View className={`-mx-4 flex-row items-stretch px-4 py-1 ${allDone ? 'bg-primary/10' : ''}`}>
      <View className="flex-1">
        {presentMembers.map((member) => (
          <SupersetMemberCell
            key={member.exerciseIndex}
            exerciseIndex={member.exerciseIndex}
            setIndex={setIndex}
            letter={member.letter}
            onPressType={onPressType}
          />
        ))}
      </View>
      <Pressable
        onPress={() => toggle(!allDone)}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: allDone }}
        className="w-10 items-center justify-center"
        hitSlop={0}
        testID={`workout-execution.superset.set-${setIndex}.done`}
      >
        <Checkbox checked={allDone} onCheckedChange={toggle} hitSlop={0} />
      </Pressable>
    </View>
  );
}

function SupersetMemberCell({
  exerciseIndex,
  setIndex,
  letter,
  onPressType,
}: {
  exerciseIndex: number;
  setIndex: number;
  letter: SupersetMember['letter'];
  onPressType: PressTypeHandler;
}) {
  const { control } = useFormContext<ExecutionFormInput>();
  const basePath = `exercises.${exerciseIndex}.sets.${setIndex}` as const;
  const lastKg = useWatch({ control, name: `${basePath}.lastKg` });
  const lastReps = useWatch({ control, name: `${basePath}.lastReps` });
  const repsMin = useWatch({ control, name: `${basePath}.repsMin` });
  const repsMax = useWatch({ control, name: `${basePath}.repsMax` });
  const target = formatSetTarget(repsMin ?? null, repsMax ?? null);

  return (
    <View className="flex-row items-center py-0.5">
      <View className="w-8 items-center">
        <View className="h-5 w-5 items-center justify-center rounded-full bg-primary">
          <Text className="font-sans-semibold text-[10px] text-primary-foreground">{letter}</Text>
        </View>
      </View>
      <View className="w-10 justify-center">
        <Controller
          control={control}
          name={`${basePath}.type`}
          render={({ field }) => {
            const typeConfig = SET_TYPE_CONFIG[field.value];
            return (
              <Pressable
                onPress={() => onPressType(exerciseIndex, setIndex, field.value)}
                hitSlop={8}
                className="h-8 flex-row items-center justify-center gap-1 border-primary border-b"
                accessibilityRole="button"
                testID={`workout-execution.superset.set-${setIndex}.exercise-${exerciseIndex}.type`}
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
              className="h-8 max-w-[80px] py-0 text-sm"
              placeholder={lastKg != null ? String(lastKg) : undefined}
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
              className="h-8 max-w-[80px] py-0 text-sm"
              maxLength={2}
              placeholder={lastReps != null ? String(lastReps) : undefined}
            />
          )}
        />
      </View>
      <View className="w-20 px-2">
        <Text variant="muted" className="text-center text-xs">
          {target}
        </Text>
      </View>
    </View>
  );
}
