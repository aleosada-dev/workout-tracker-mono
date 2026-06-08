import { getValidSetTypesAt } from '@workout-tracker/domain';
import { Button, Card, Checkbox, Icon, Text } from '@workout-tracker/ui-mobile';
import * as Crypto from 'expo-crypto';
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Circle,
  Cog,
  GripVertical,
  Plus,
  StickyNote,
  Timer,
} from 'lucide-react-native';
import { useRef, useState } from 'react';
import { Controller, useFieldArray, useFormContext, useFormState, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { SET_TYPE_CONFIG, type SetType } from '@/features/exercises/lib/sets';
import { useUserPreferences } from '@/features/preferences/hooks/use-user-preferences';
import { formatRestSeconds } from '@/features/shared/lib/utils';
import { AliasSelector } from '@/features/workouts/components/AliasSelector';
import {
  MeasurementTypePickerSheet,
  type MeasurementTypePickerSheetRef,
} from '@/features/workouts/components/MeasurementTypePickerSheet';
import {
  SetTypePickerSheet,
  type SetTypePickerSheetRef,
} from '@/features/workouts/components/SetTypePickerSheet';
import { SetTypesHelpDialog } from '@/features/workouts/components/SetTypesHelpDialog';
import {
  autofillFromLast,
  type ExecutionFormInput,
  matchExecutionSetsByLogicalKey,
  matchExecutionSetsToTemplate,
  resolveLastBucketSets,
  restTimerDuration,
} from '@/features/workouts/lib/execution-form';
import { type ColumnLayout, exerciseColumnLayout } from '@/features/workouts/lib/workout-mappers';
import { activeWorkout$ } from '@/features/workouts/state/active-workout-store';
import { startRestTimer } from '@/features/workouts/state/rest-timer-bridge';
import { DurationSetRow, RepsSetRow, WeightRepsSetRow } from './set-rows';
import type { ExerciseExecutionCardProps } from './types';

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
  note,
  restSeconds,
  dragHandle,
  onPressHeader,
  selectable = false,
  selected = false,
  onToggleSelect,
  onLongPress,
}: ExerciseExecutionCardProps) {
  const { t } = useTranslation();
  const [collapsed, setCollapsed] = useState(true);
  const isCollapsed = selectable || collapsed;
  const { control, getValues, setValue } = useFormContext<ExecutionFormInput>();
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
  const measurementPickerRef = useRef<MeasurementTypePickerSheetRef>(null);
  const measurementTypes = useWatch({
    control,
    name: fields.map((_, i) => `exercises.${exerciseIndex}.sets.${i}.measurementType` as const),
  });
  const layout = exerciseColumnLayout(
    measurementTypes.map((measurementType) => ({ measurementType })),
  );
  const showSetType = getValues(`exercises.${exerciseIndex}.exerciseType`) !== 'preparatory';
  const variationId = getValues(`exercises.${exerciseIndex}.variation.id`);
  const equipmentName = t(
    `equipment.${getValues(`exercises.${exerciseIndex}.variation.equipment.slug`)}`,
  );
  const athleteId = activeWorkout$.athleteId.peek();

  const rematchExercise = () => {
    const sets = getValues(`exercises.${exerciseIndex}.sets`);
    const variationId = getValues(`exercises.${exerciseIndex}.variation.id`);

    const aliasId = getValues(`exercises.${exerciseIndex}.aliasId`);
    const lastExercise = activeWorkout$.lastSets
      .peek()
      ?.find((exercise) => exercise.variationId === variationId);
    matchExecutionSetsByLogicalKey(sets, resolveLastBucketSets(lastExercise, aliasId)).forEach(
      (last, i) => {
        setValue(`exercises.${exerciseIndex}.sets.${i}.lastKg`, last.lastKg);
        setValue(`exercises.${exerciseIndex}.sets.${i}.lastReps`, last.lastReps);
      },
    );

    const templateExercise = activeWorkout$.workoutTemplate
      .peek()
      ?.exercises.find((exercise) => exercise.variation.id === variationId);
    if (templateExercise) {
      matchExecutionSetsToTemplate(sets, templateExercise.sets).forEach((target, i) => {
        setValue(`exercises.${exerciseIndex}.sets.${i}.repsMin`, target.repsMin);
        setValue(`exercises.${exerciseIndex}.sets.${i}.repsMax`, target.repsMax);
        setValue(`exercises.${exerciseIndex}.sets.${i}.durationTarget`, target.durationTarget);
      });
    }
  };

  const handleAddSet = () => {
    const sets = getValues(`exercises.${exerciseIndex}.sets`);
    const measurementType = sets[sets.length - 1]?.measurementType ?? 'weight_reps';
    const roundOrder = (sets[sets.length - 1]?.roundOrder ?? -1) + 1;
    append({
      id: Crypto.randomUUID(),
      type: 'normal',
      measurementType,
      roundOrder,
      repsMin: null,
      repsMax: null,
      durationTarget: null,
      kg: '',
      reps: '',
      duration: '',
      done: false,
      linkedSetId: null,
      loadPercent: null,
      loadPercentOfPrevious: null,
    });
    rematchExercise();
  };

  return (
    <Card className={`gap-3 py-2 ${hasError ? 'border-destructive/50' : ''}`}>
      <View className="flex-row items-center justify-between gap-2 px-4">
        {selectable ? (
          <Icon
            as={selected ? CheckCircle2 : Circle}
            size={22}
            className={selected ? 'text-primary' : 'text-muted-foreground'}
          />
        ) : (
          (dragHandle ?? <Icon as={GripVertical} size={18} className="text-muted-foreground" />)
        )}
        <Pressable
          className="flex-1"
          onPress={selectable ? onToggleSelect : onPressHeader}
          onLongPress={onLongPress}
          delayLongPress={350}
          disabled={selectable ? !onToggleSelect : !onPressHeader && !onLongPress}
          accessibilityRole={selectable ? 'checkbox' : onPressHeader ? 'link' : undefined}
          accessibilityState={selectable ? { checked: selected } : undefined}
        >
          <Text className="font-sans-semibold text-base" numberOfLines={1}>
            {name}
          </Text>
          <Text variant="muted" className="text-xs" numberOfLines={1}>
            {variationName ?? t('workoutExecutionScreen.exercise.noVariation')}
          </Text>
        </Pressable>
        {selectable ? null : (
          <Pressable
            onPress={() => setCollapsed((c) => !c)}
            hitSlop={12}
            accessibilityRole="button"
            testID="workout-execution.exercise.collapse"
          >
            <Icon as={collapsed ? ChevronDown : ChevronUp} size={20} className="text-foreground" />
          </Pressable>
        )}
      </View>

      {!isCollapsed ? (
        <Animated.View entering={FadeIn.duration(180)} exiting={FadeOut.duration(120)}>
          {showSetType ? (
            <View className="flex-row items-center gap-2 px-4 pb-3">
              <View className="shrink flex-row items-center gap-1.5">
                <Icon as={Cog} size={14} className="text-muted-foreground" />
                <Text variant="muted" className="shrink text-sm" numberOfLines={1}>
                  {equipmentName}
                </Text>
              </View>
              <View className="h-4 w-px bg-border" />
              <AliasSelector
                exerciseIndex={exerciseIndex}
                variationId={variationId}
                userId={athleteId}
                onChanged={rematchExercise}
              />
            </View>
          ) : null}
          {restSeconds != null || (note != null && note.length > 0) ? (
            <View className="flex-row items-start gap-3 px-4 pb-4">
              <View className="flex-1 flex-row items-start gap-2">
                {note != null && note.length > 0 ? (
                  <>
                    <Icon as={StickyNote} size={16} className="mt-0.5 text-foreground" />
                    <Text className="flex-1 text-sm">{note}</Text>
                  </>
                ) : null}
              </View>
              {restSeconds != null ? (
                <View className="flex-row items-center gap-2">
                  <Icon as={Timer} size={16} className="text-foreground" />
                  <Text className="text-sm">{formatRestSeconds(restSeconds)}</Text>
                </View>
              ) : null}
            </View>
          ) : null}
          <View className="px-4">
            <View className="flex-row items-center pb-2">
              <View className="w-10 items-center">
                <View className="flex-row items-center gap-1">
                  <Text className="font-sans-medium text-muted-foreground text-xs uppercase tracking-wider">
                    #
                  </Text>
                  {showSetType ? <SetTypesHelpDialog /> : null}
                </View>
              </View>
              {layout.weight ? (
                <View className="w-20 pr-2 pl-3">
                  <Text className="font-sans-medium text-muted-foreground text-xs uppercase tracking-wider">
                    {t('workoutExecutionScreen.exercise.headers.weight')}
                  </Text>
                </View>
              ) : null}
              {layout.reps ? (
                <View className="w-20 px-2">
                  <Text className="font-sans-medium text-muted-foreground text-xs uppercase tracking-wider">
                    {t('workoutExecutionScreen.exercise.headers.reps')}
                  </Text>
                </View>
              ) : null}
              {layout.duration && !layout.weight && !layout.reps ? (
                <View className="w-28 px-2">
                  <Text className="font-sans-medium text-muted-foreground text-xs uppercase tracking-wider">
                    {t('workoutExecutionScreen.exercise.headers.duration')}
                  </Text>
                </View>
              ) : null}
              <View className="w-20 px-2">
                <Text className="text-center font-sans-medium text-muted-foreground text-xs uppercase tracking-wider">
                  {t('workoutExecutionScreen.exercise.headers.target')}
                </Text>
              </View>
              <View className="flex-1" />
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
                layout={layout}
                showSetType={showSetType}
                onPressMeasurement={() => {
                  const current = getValues(
                    `exercises.${exerciseIndex}.sets.${setIndex}.measurementType`,
                  );
                  measurementPickerRef.current?.present(
                    current,
                    (next) => {
                      const sets = getValues(`exercises.${exerciseIndex}.sets`);
                      sets.forEach((_, i) => {
                        setValue(`exercises.${exerciseIndex}.sets.${i}.measurementType`, next, {
                          shouldDirty: true,
                          shouldValidate: true,
                        });
                      });
                      rematchExercise();
                    },
                    fields.length > 1
                      ? () => {
                          remove(setIndex);
                          rematchExercise();
                        }
                      : undefined,
                  );
                }}
                onPressType={(currentType, onChange) => {
                  const sets = getValues(`exercises.${exerciseIndex}.sets`);
                  const validTypes = getValidSetTypesAt(sets, setIndex);
                  setTypePickerRef.current?.present(
                    currentType,
                    validTypes,
                    (next) => {
                      onChange(next);
                      if ((next === 'drop' || next === 'cluster') && setIndex > 0) {
                        setValue(
                          `exercises.${exerciseIndex}.sets.${setIndex}.roundOrder`,
                          getValues(`exercises.${exerciseIndex}.sets.${setIndex - 1}.roundOrder`),
                          { shouldDirty: true },
                        );
                      }
                      rematchExercise();
                    },
                    fields.length > 1
                      ? {
                          onRemoveSet: () => {
                            remove(setIndex);
                            rematchExercise();
                          },
                        }
                      : undefined,
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
      <MeasurementTypePickerSheet ref={measurementPickerRef} />
    </Card>
  );
}

function SetRow({
  exerciseIndex,
  setIndex,
  layout,
  showSetType,
  onPressType,
  onPressMeasurement,
}: {
  exerciseIndex: number;
  setIndex: number;
  layout: ColumnLayout;
  showSetType: boolean;
  onPressType: (currentType: SetType, onChange: (next: SetType) => void) => void;
  onPressMeasurement: () => void;
}) {
  const { control, getValues, setValue } = useFormContext<ExecutionFormInput>();
  const { data: preferences } = useUserPreferences();
  const basePath = `exercises.${exerciseIndex}.sets.${setIndex}` as const;
  const done = useWatch({ control, name: `${basePath}.done` });
  const measurementType = useWatch({ control, name: `${basePath}.measurementType` });

  const fireRestTimer = () => {
    if (!(preferences?.autoStartRestTimer ?? true)) {
      return;
    }
    const exerciseRest = getValues(`exercises.${exerciseIndex}.restSeconds`);
    const rest = restTimerDuration(exerciseRest ?? preferences?.defaultRestSeconds ?? null);
    if (rest != null) {
      startRestTimer(rest);
    }
  };

  const handleToggleDone = (next: boolean) => {
    if (next) {
      const kg = autofillFromLast(getValues(`${basePath}.kg`), getValues(`${basePath}.lastKg`));
      if (kg != null) {
        setValue(`${basePath}.kg`, kg, { shouldDirty: true, shouldValidate: true });
      }
      const reps = autofillFromLast(
        getValues(`${basePath}.reps`),
        getValues(`${basePath}.lastReps`),
      );
      if (reps != null) {
        setValue(`${basePath}.reps`, reps, { shouldDirty: true, shouldValidate: true });
      }
      fireRestTimer();
    }
  };

  const handleTimerComplete = () => {
    setValue(`${basePath}.done`, true, { shouldDirty: true, shouldValidate: true });
    fireRestTimer();
  };

  return (
    <View className={`-mx-4 flex-row items-center px-4 py-0.5 ${done ? 'bg-primary/10' : ''}`}>
      <View className="w-10">
        {showSetType ? (
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
        ) : (
          <Pressable
            onPress={onPressMeasurement}
            hitSlop={8}
            className="h-8 flex-row items-center justify-center gap-1 border-primary border-b"
            accessibilityRole="button"
            testID={`workout-execution.set-${setIndex}.measurement`}
          >
            <Text className="w-5 text-center font-sans-semibold text-foreground text-sm">
              {setIndex + 1}
            </Text>
            <Icon as={ChevronDown} size={12} className="text-muted-foreground" />
          </Pressable>
        )}
      </View>
      {measurementType === 'reps' ? (
        <RepsSetRow exerciseIndex={exerciseIndex} setIndex={setIndex} layout={layout} />
      ) : measurementType === 'duration' ? (
        <DurationSetRow
          exerciseIndex={exerciseIndex}
          setIndex={setIndex}
          layout={layout}
          onComplete={handleTimerComplete}
        />
      ) : (
        <WeightRepsSetRow exerciseIndex={exerciseIndex} setIndex={setIndex} layout={layout} />
      )}
      <View className="flex-1" />
      <Controller
        control={control}
        name={`${basePath}.done`}
        render={({ field }) => {
          const toggle = (next: boolean) => {
            handleToggleDone(next);
            field.onChange(next);
          };
          return (
            <Pressable
              onPress={() => toggle(!field.value)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: field.value }}
              className="w-10 items-center justify-center self-stretch"
              hitSlop={0}
            >
              <Checkbox checked={field.value} onCheckedChange={toggle} hitSlop={0} />
            </Pressable>
          );
        }}
      />
    </View>
  );
}
