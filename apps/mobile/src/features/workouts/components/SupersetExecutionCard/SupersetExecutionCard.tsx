import { getValidSetTypesAt } from '@workout-tracker/domain';
import { Button, Card, Checkbox, Icon, Input, Text } from '@workout-tracker/ui-mobile';
import * as Crypto from 'expo-crypto';
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Circle,
  GripVertical,
  Plus,
  Timer,
} from 'lucide-react-native';
import { useRef, useState } from 'react';
import { Controller, useFormContext, useFormState, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { SET_TYPE_CONFIG, type SetType } from '@/features/exercises/lib/sets';
import { useUserPreferences } from '@/features/preferences/hooks/use-user-preferences';
import { formatRestSeconds, sanitizeDecimal, sanitizeInteger } from '@/features/shared/lib/utils';
import {
  SetTypePickerSheet,
  type SetTypePickerSheetRef,
} from '@/features/workouts/components/SetTypePickerSheet';
import { SetTypesHelpDialog } from '@/features/workouts/components/SetTypesHelpDialog';
import {
  type AddSetEntry,
  SupersetAddSetsSheet,
  type SupersetAddSetsSheetRef,
} from '@/features/workouts/components/SupersetAddSetsSheet';
import { SupersetHelpDialog } from '@/features/workouts/components/SupersetHelpDialog';
import {
  autofillFromLast,
  type ExecutionFormInput,
  matchExecutionSetsByLogicalKey,
  matchExecutionSetsToTemplate,
  restTimerDuration,
} from '@/features/workouts/lib/execution-form';
import {
  formatSetTarget,
  type SupersetMember,
  weightPlaceholder,
} from '@/features/workouts/lib/workout-mappers';
import { activeWorkout$ } from '@/features/workouts/state/active-workout-store';
import { startRestTimer } from '@/features/workouts/state/rest-timer-bridge';
import type { SupersetExecutionCardProps } from './types';

const MAX_WEIGHT_INTEGER_DIGITS = 3;
const MAX_WEIGHT_FRACTION_DIGITS = 2;
const MAX_REPS = 99;

const SET_TYPE_INITIAL: Record<SetType, string> = {
  warmup: 'W',
  normal: 'N',
  drop: 'D',
  cluster: 'C',
};

type MemberSets = ExecutionFormInput['exercises'][number]['sets'];

type PressTypeHandler = (exerciseIndex: number, setIndex: number, currentType: SetType) => void;

type RoundMemberView = {
  exerciseIndex: number;
  letter: SupersetMember['letter'];
  setIndexes: number[];
  ids: string[];
};

function buildRounds(members: SupersetMember[], setsByMember: MemberSets[]) {
  const roundOrders = Array.from(
    new Set(setsByMember.flatMap((sets) => (sets ?? []).map((set) => set.roundOrder))),
  ).sort((a, b) => a - b);
  return roundOrders.map((roundOrder) => ({
    roundOrder,
    roundMembers: members
      .map((member, i) => {
        const sets = setsByMember[i] ?? [];
        const matched = sets
          .map((set, idx) => ({ set, idx }))
          .filter(({ set }) => set.roundOrder === roundOrder);
        if (matched.length === 0) return null;
        return {
          exerciseIndex: member.exerciseIndex,
          letter: member.letter,
          setIndexes: matched.map(({ idx }) => idx),
          ids: matched.map(({ set }) => set.id),
        } satisfies RoundMemberView;
      })
      .filter((value): value is RoundMemberView => value !== null),
  }));
}

export function SupersetExecutionCard({
  members,
  restSeconds,
  dragHandle,
  onPressMember,
  selectable = false,
  selected = false,
  onToggleSelect,
  onLongPress,
}: SupersetExecutionCardProps) {
  const { t } = useTranslation();
  const [collapsed, setCollapsed] = useState(true);
  const isCollapsed = selectable || collapsed;
  const { control, getValues, setValue } = useFormContext<ExecutionFormInput>();
  const memberSetsNames = members.map((m) => `exercises.${m.exerciseIndex}.sets` as const);
  const watchedMemberSets = useWatch({ control, name: memberSetsNames }) as
    | MemberSets[]
    | undefined;
  const setsByMember = watchedMemberSets ?? [];
  const rounds = buildRounds(members, setsByMember);
  const { errors } = useFormState({ control, name: 'exercises' });
  const hasError = members.some((m) => Boolean(errors.exercises?.[m.exerciseIndex]));
  const setTypePickerRef = useRef<SetTypePickerSheetRef>(null);
  const addSetsSheetRef = useRef<SupersetAddSetsSheetRef>(null);

  const rematchMember = (exerciseIndex: number) => {
    const memberSets = getValues(`exercises.${exerciseIndex}.sets`);
    const variationId = getValues(`exercises.${exerciseIndex}.variation.id`);

    const lastExercise = activeWorkout$.lastSets
      .peek()
      ?.find((exercise) => exercise.variationId === variationId);
    matchExecutionSetsByLogicalKey(memberSets, lastExercise?.sets).forEach((last, i) => {
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

  const handleConfirmAddSets = (entries: AddSetEntry[]) => {
    const byMember = new Map<number, SetType[]>();
    for (const entry of entries) {
      const list = byMember.get(entry.exerciseIndex) ?? [];
      list.push(entry.type);
      byMember.set(entry.exerciseIndex, list);
    }
    const nextRound =
      members.reduce(
        (max, m) =>
          getValues(`exercises.${m.exerciseIndex}.sets`).reduce(
            (acc, set) => Math.max(acc, set.roundOrder),
            max,
          ),
        -1,
      ) + 1;
    for (const [exerciseIndex, types] of byMember) {
      const current = getValues(`exercises.${exerciseIndex}.sets`);
      const measurementType = current[current.length - 1]?.measurementType ?? 'weight_reps';
      const appended = types.map((type) => ({
        id: Crypto.randomUUID(),
        type,
        measurementType,
        roundOrder: nextRound,
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
      }));
      setValue(`exercises.${exerciseIndex}.sets`, [...current, ...appended], { shouldDirty: true });
      rematchMember(exerciseIndex);
    }
  };

  const handleAddSet = () => {
    const sheetMembers = members.map((member) => ({
      exerciseIndex: member.exerciseIndex,
      letter: member.letter,
      name: member.name,
      existingTypes: getValues(`exercises.${member.exerciseIndex}.sets`).map((set) => set.type),
    }));
    addSetsSheetRef.current?.present(sheetMembers, handleConfirmAddSets);
  };

  const handleChangeSetType = (exerciseIndex: number, setIndex: number, next: SetType) => {
    setValue(`exercises.${exerciseIndex}.sets.${setIndex}.type`, next, { shouldDirty: true });
    if ((next === 'drop' || next === 'cluster') && setIndex > 0) {
      const previousRound = getValues(`exercises.${exerciseIndex}.sets.${setIndex - 1}.roundOrder`);
      setValue(`exercises.${exerciseIndex}.sets.${setIndex}.roundOrder`, previousRound, {
        shouldDirty: true,
      });
    }
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

  const removeRound = (roundOrder: number) => {
    for (const member of members) {
      const current = getValues(`exercises.${member.exerciseIndex}.sets`);
      const next = current.filter((set) => set.roundOrder !== roundOrder);
      if (next.length === current.length) continue;
      setValue(`exercises.${member.exerciseIndex}.sets`, next, { shouldDirty: true });
      rematchMember(member.exerciseIndex);
    }
  };

  const handleConfirmEditRound = (roundOrder: number, entries: AddSetEntry[]) => {
    for (const member of members) {
      const current = getValues(`exercises.${member.exerciseIndex}.sets`);
      const before = current.filter((set) => set.roundOrder < roundOrder);
      const after = current.filter((set) => set.roundOrder > roundOrder);
      const measurementType = current[current.length - 1]?.measurementType ?? 'weight_reps';
      const roundSets = entries
        .filter((entry) => entry.exerciseIndex === member.exerciseIndex)
        .map((entry) => {
          const existing = entry.setId ? current.find((set) => set.id === entry.setId) : undefined;
          if (existing) return { ...existing, type: entry.type, roundOrder };
          return {
            id: Crypto.randomUUID(),
            type: entry.type,
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
          };
        });
      setValue(`exercises.${member.exerciseIndex}.sets`, [...before, ...roundSets, ...after], {
        shouldDirty: true,
      });
      rematchMember(member.exerciseIndex);
    }
  };

  const handleEditRound = (roundOrder: number) => {
    const sheetMembers = members.map((member) => ({
      exerciseIndex: member.exerciseIndex,
      letter: member.letter,
      name: member.name,
      existingTypes: getValues(`exercises.${member.exerciseIndex}.sets`)
        .filter((set) => set.roundOrder < roundOrder)
        .map((set) => set.type),
    }));
    const initialEntries: AddSetEntry[] = members.flatMap((member) =>
      getValues(`exercises.${member.exerciseIndex}.sets`)
        .filter((set) => set.roundOrder === roundOrder)
        .map((set) => ({ exerciseIndex: member.exerciseIndex, type: set.type, setId: set.id })),
    );
    addSetsSheetRef.current?.present(
      sheetMembers,
      (entries) => handleConfirmEditRound(roundOrder, entries),
      { initialEntries, onDelete: () => removeRound(roundOrder) },
    );
  };

  const handlePressType: PressTypeHandler = (exerciseIndex, setIndex, currentType) => {
    const exerciseSets = getValues(`exercises.${exerciseIndex}.sets`);
    const validTypes = getValidSetTypesAt(exerciseSets, setIndex);
    setTypePickerRef.current?.present(
      currentType,
      validTypes,
      (next) => handleChangeSetType(exerciseIndex, setIndex, next),
      {
        onRemoveSet:
          exerciseSets.length > 1
            ? () => handleRemoveExerciseSet(exerciseIndex, setIndex)
            : undefined,
      },
    );
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
          className="flex-1 flex-row items-center gap-1.5"
          onPress={selectable ? onToggleSelect : undefined}
          onLongPress={onLongPress}
          delayLongPress={350}
          disabled={selectable ? !onToggleSelect : !onLongPress}
          accessibilityRole={selectable ? 'checkbox' : undefined}
          accessibilityState={selectable ? { checked: selected } : undefined}
        >
          <Text className="font-sans-semibold text-base text-foreground">
            {t('workoutExecutionScreen.superset.title')}
          </Text>
          {selectable ? null : <SupersetHelpDialog />}
        </Pressable>
        {selectable ? null : (
          <Pressable
            onPress={() => setCollapsed((c) => !c)}
            hitSlop={12}
            accessibilityRole="button"
            testID="workout-execution.superset.collapse"
          >
            <Icon as={collapsed ? ChevronDown : ChevronUp} size={20} className="text-foreground" />
          </Pressable>
        )}
      </View>

      <View className="gap-2 px-4">
        {members.map((member) => {
          const onPress = selectable
            ? onToggleSelect
            : onPressMember
              ? () => onPressMember(member.variationId)
              : undefined;
          return (
            <Pressable
              key={member.exerciseIndex}
              className="flex-row items-center gap-2"
              onPress={onPress}
              onLongPress={onLongPress}
              delayLongPress={350}
              disabled={!onPress && !onLongPress}
              accessibilityRole={selectable ? 'checkbox' : onPressMember ? 'link' : undefined}
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
          );
        })}
      </View>

      {!isCollapsed ? (
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

            {rounds.map(({ roundOrder, roundMembers }) => (
              <SupersetSetRow
                key={roundMembers.flatMap((m) => m.ids).join('-')}
                roundOrder={roundOrder}
                roundMembers={roundMembers}
                onPressType={handlePressType}
                onEditRound={handleEditRound}
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
      <SupersetAddSetsSheet ref={addSetsSheetRef} />
    </Card>
  );
}

function SupersetSetRow({
  roundOrder,
  roundMembers,
  onPressType,
  onEditRound,
}: {
  roundOrder: number;
  roundMembers: RoundMemberView[];
  onPressType: PressTypeHandler;
  onEditRound: (roundOrder: number) => void;
}) {
  const { control, getValues, setValue } = useFormContext<ExecutionFormInput>();
  const { data: preferences } = useUserPreferences();
  const doneNames = roundMembers.flatMap((m) =>
    m.setIndexes.map((setIndex) => `exercises.${m.exerciseIndex}.sets.${setIndex}.done` as const),
  );
  const dones = useWatch({ control, name: doneNames });
  const allDone = Array.isArray(dones) && dones.length > 0 ? dones.every(Boolean) : false;

  const toggle = (next: boolean) => {
    for (const member of roundMembers) {
      for (const setIndex of member.setIndexes) {
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
    }
    if (next && (preferences?.autoStartRestTimer ?? true)) {
      const last = roundMembers[roundMembers.length - 1];
      const exerciseRest = last ? getValues(`exercises.${last.exerciseIndex}.restSeconds`) : null;
      const rest = restTimerDuration(exerciseRest ?? preferences?.defaultRestSeconds ?? null);
      if (rest != null) {
        startRestTimer(rest);
      }
    }
  };

  return (
    <View className={`-mx-4 flex-row items-stretch px-4 py-1 ${allDone ? 'bg-primary/10' : ''}`}>
      <View className="flex-1">
        {roundMembers.map((member) =>
          member.setIndexes.map((setIndex) => (
            <SupersetMemberCell
              key={`${member.exerciseIndex}-${setIndex}`}
              exerciseIndex={member.exerciseIndex}
              setIndex={setIndex}
              letter={member.letter}
              onPressType={onPressType}
              onPressLetter={() => onEditRound(roundOrder)}
            />
          )),
        )}
      </View>
      <Pressable
        onPress={() => toggle(!allDone)}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: allDone }}
        className="w-10 items-center justify-center"
        hitSlop={0}
        testID={`workout-execution.superset.round-${roundOrder}.done`}
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
  onPressLetter,
}: {
  exerciseIndex: number;
  setIndex: number;
  letter: SupersetMember['letter'];
  onPressType: PressTypeHandler;
  onPressLetter: () => void;
}) {
  const { control } = useFormContext<ExecutionFormInput>();
  const { data: preferences } = useUserPreferences();
  const basePath = `exercises.${exerciseIndex}.sets.${setIndex}` as const;
  const lastKg = useWatch({ control, name: `${basePath}.lastKg` });
  const lastReps = useWatch({ control, name: `${basePath}.lastReps` });
  const repsMin = useWatch({ control, name: `${basePath}.repsMin` });
  const repsMax = useWatch({ control, name: `${basePath}.repsMax` });
  const loadPercent = useWatch({ control, name: `${basePath}.loadPercent` });
  const target = formatSetTarget(repsMin ?? null, repsMax ?? null);
  const adjusted = loadPercent != null;
  const kgPlaceholder = weightPlaceholder(lastKg, loadPercent, preferences?.loadRounding ?? 'none');

  return (
    <View className="flex-row items-center py-0.5">
      <Pressable
        onPress={onPressLetter}
        hitSlop={8}
        accessibilityRole="button"
        testID={`workout-execution.superset.set-${setIndex}.exercise-${exerciseIndex}.letter`}
        className="w-8 items-center"
      >
        <View className="h-5 w-5 items-center justify-center rounded-full bg-primary">
          <Text className="font-sans-semibold text-[10px] text-primary-foreground">{letter}</Text>
        </View>
      </Pressable>
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
              className={`h-8 max-w-[80px] py-0 text-sm ${adjusted ? 'placeholder:font-sans-semibold placeholder:text-primary' : ''}`}
              placeholder={kgPlaceholder}
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
        <Text
          className={`text-center text-xs ${adjusted ? 'font-sans-semibold text-primary' : 'text-muted-foreground'}`}
        >
          {target}
        </Text>
      </View>
    </View>
  );
}
