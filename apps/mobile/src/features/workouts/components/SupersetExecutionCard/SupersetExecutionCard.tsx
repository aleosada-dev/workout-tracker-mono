import { MAX_REPS, type MeasurementType, measurementDimensions } from '@workout-tracker/domain';
import { Button, Card, Checkbox, Icon, Input, Text } from '@workout-tracker/ui-mobile';
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
import { Controller, useFormContext, useFormState, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { SET_TYPE_CONFIG, type SetType } from '@/features/exercises/lib/sets';
import { useUserPreferences } from '@/features/preferences/hooks/use-user-preferences';
import {
  formatRestSeconds,
  formatTime,
  sanitizeDecimal,
  sanitizeInteger,
} from '@/features/shared/lib/utils';
import { AliasSelector } from '@/features/workouts/components/AliasSelector';
import {
  DistanceInput,
  type DistanceUnit,
  DistanceUnitToggle,
  DurationPickerCell,
  defaultDistanceUnit,
  formatDistance,
} from '@/features/workouts/components/ExerciseExecutionCard/set-cells';
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
  resolveLastBucketSets,
  restTimerDuration,
} from '@/features/workouts/lib/execution-form';
import {
  buildRounds,
  type ColumnLayout,
  exerciseColumnLayout,
  formatSetTarget,
  type RoundMemberView,
  type SupersetMember,
  weightPlaceholder,
} from '@/features/workouts/lib/workout-mappers';
import { activeWorkout$ } from '@/features/workouts/state/active-workout-store';
import { startRestTimer } from '@/features/workouts/state/rest-timer-bridge';
import type { SupersetExecutionCardProps } from './types';

const MAX_WEIGHT_INTEGER_DIGITS = 3;
const MAX_WEIGHT_FRACTION_DIGITS = 2;

type MemberSets = ExecutionFormInput['exercises'][number]['sets'];

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
  const { data: preferences } = useUserPreferences();
  const [collapsed, setCollapsed] = useState(true);
  const isCollapsed = selectable || collapsed;
  const effectiveRestSeconds = restSeconds ?? preferences?.defaultRestSeconds ?? null;
  const [expandedNotes, setExpandedNotes] = useState<ReadonlySet<number>>(() => new Set());
  const toggleNote = (exerciseIndex: number) =>
    setExpandedNotes((prev) => {
      const next = new Set(prev);
      if (next.has(exerciseIndex)) {
        next.delete(exerciseIndex);
      } else {
        next.add(exerciseIndex);
      }
      return next;
    });
  const { control, getValues, setValue } = useFormContext<ExecutionFormInput>();
  const [distanceUnit, setDistanceUnit] = useState<DistanceUnit>(() =>
    defaultDistanceUnit(
      members.reduce<number | null>(
        (max, m) =>
          getValues(`exercises.${m.exerciseIndex}.sets`).reduce<number | null>(
            (acc, s) =>
              s.distanceTarget != null && s.distanceTarget > (acc ?? 0) ? s.distanceTarget : acc,
            max,
          ),
        null,
      ),
    ),
  );
  const athleteId = activeWorkout$.athleteId.peek();
  const memberSetsNames = members.map((m) => `exercises.${m.exerciseIndex}.sets` as const);
  const watchedMemberSets = useWatch({ control, name: memberSetsNames }) as
    | MemberSets[]
    | undefined;
  const setsByMember = watchedMemberSets ?? [];
  const rounds = buildRounds(members, setsByMember);
  const layout = exerciseColumnLayout(
    setsByMember
      .flatMap((sets) => sets ?? [])
      .map((set) => ({ measurementType: set.measurementType })),
  );
  const { errors } = useFormState({ control, name: 'exercises' });
  const hasError = members.some((m) => Boolean(errors.exercises?.[m.exerciseIndex]));
  const addSetsSheetRef = useRef<SupersetAddSetsSheetRef>(null);

  const rematchMember = (exerciseIndex: number) => {
    const memberSets = getValues(`exercises.${exerciseIndex}.sets`);
    const variationId = getValues(`exercises.${exerciseIndex}.variation.id`);

    const aliasId = getValues(`exercises.${exerciseIndex}.aliasId`);
    const lastExercise = activeWorkout$.lastSets
      .peek()
      ?.find((exercise) => exercise.variationId === variationId);
    matchExecutionSetsByLogicalKey(
      memberSets,
      resolveLastBucketSets(lastExercise, aliasId),
    ).forEach((last, i) => {
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
        setValue(`exercises.${exerciseIndex}.sets.${i}.distanceTarget`, target.distanceTarget);
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
        distanceTarget: null,
        kg: '',
        reps: '',
        duration: '',
        distance: '',
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
            distanceTarget: null,
            kg: '',
            reps: '',
            duration: '',
            distance: '',
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
              ? () => onPressMember(member.variationId, member.aliasId)
              : undefined;
          const hasNote = member.note != null && member.note.length > 0;
          const noteExpanded = expandedNotes.has(member.exerciseIndex);
          const equipmentName = t(
            `equipment.${getValues(`exercises.${member.exerciseIndex}.variation.equipment.slug`)}`,
          );
          return (
            <View key={member.exerciseIndex} className="gap-1">
              <Pressable
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
              {!isCollapsed ? (
                <View className="flex-row items-center gap-2 pl-7">
                  <View className="shrink flex-row items-center gap-1.5">
                    <Icon as={Cog} size={14} className="text-muted-foreground" />
                    <Text variant="muted" className="shrink text-sm" numberOfLines={1}>
                      {equipmentName}
                    </Text>
                  </View>
                  <View className="h-4 w-px bg-border" />
                  <AliasSelector
                    exerciseIndex={member.exerciseIndex}
                    variationId={member.variationId}
                    userId={athleteId}
                    onChanged={() => rematchMember(member.exerciseIndex)}
                  />
                </View>
              ) : null}
              {hasNote && !isCollapsed ? (
                <Pressable
                  className="flex-row items-start gap-1.5 pl-7"
                  onPress={() => toggleNote(member.exerciseIndex)}
                  accessibilityRole="button"
                >
                  <Icon as={StickyNote} size={13} className="mt-0.5 text-muted-foreground" />
                  <Text
                    variant="muted"
                    className="flex-1 text-xs"
                    numberOfLines={noteExpanded ? undefined : 1}
                  >
                    {member.note}
                  </Text>
                </Pressable>
              ) : null}
            </View>
          );
        })}
      </View>

      {!isCollapsed ? (
        <Animated.View entering={FadeIn.duration(180)} exiting={FadeOut.duration(120)}>
          {effectiveRestSeconds != null ? (
            <View className="flex-row items-center justify-end gap-2 px-4 pt-3 pb-4">
              <Icon as={Timer} size={16} className="text-foreground" />
              <Text className="text-sm">{formatRestSeconds(effectiveRestSeconds)}</Text>
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
              {layout.weight ? (
                <View className="min-w-[72px] flex-1 pr-2 pl-3">
                  <Text className="font-sans-medium text-muted-foreground text-xs uppercase tracking-wider">
                    {t('workoutExecutionScreen.exercise.headers.weight')}
                  </Text>
                </View>
              ) : null}
              {layout.reps ? (
                <View className="min-w-[56px] flex-1 px-2">
                  <Text className="font-sans-medium text-muted-foreground text-xs uppercase tracking-wider">
                    {t('workoutExecutionScreen.exercise.headers.reps')}
                  </Text>
                </View>
              ) : null}
              {layout.duration ? (
                <View className="w-28 px-2">
                  <Text className="font-sans-medium text-muted-foreground text-xs uppercase tracking-wider">
                    {t('workoutExecutionScreen.exercise.headers.duration')}
                  </Text>
                </View>
              ) : null}
              {layout.distance ? (
                <View className="w-32 flex-row items-center gap-1.5 px-2">
                  <Text className="font-sans-medium text-muted-foreground text-xs uppercase tracking-wider">
                    {t('workoutExecutionScreen.exercise.headers.distance')}
                  </Text>
                  <DistanceUnitToggle
                    unit={distanceUnit}
                    onToggle={() => setDistanceUnit((u) => (u === 'm' ? 'km' : 'm'))}
                    testID="workout-execution.superset.distance-unit"
                  />
                </View>
              ) : null}
              <View className="min-w-[64px] flex-1 px-2">
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
                layout={layout}
                distanceUnit={distanceUnit}
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
      <SupersetAddSetsSheet ref={addSetsSheetRef} />
    </Card>
  );
}

function SupersetSetRow({
  roundOrder,
  roundMembers,
  layout,
  distanceUnit,
  onEditRound,
}: {
  roundOrder: number;
  roundMembers: RoundMemberView[];
  layout: ColumnLayout;
  distanceUnit: DistanceUnit;
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
          const duration = autofillFromLast(
            getValues(`${base}.duration`),
            getValues(`${base}.durationTarget`),
          );
          if (duration != null) {
            setValue(`${base}.duration`, duration, { shouldDirty: true, shouldValidate: true });
          }
          const distance = autofillFromLast(
            getValues(`${base}.distance`),
            getValues(`${base}.distanceTarget`),
          );
          if (distance != null) {
            setValue(`${base}.distance`, distance, { shouldDirty: true, shouldValidate: true });
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
    <View className={`-mx-4 flex-row items-center px-4 py-1 ${allDone ? 'bg-primary/10' : ''}`}>
      <View className="flex-1">
        {roundMembers.map((member) =>
          member.setIndexes.map((setIndex) => (
            <SupersetMemberCell
              key={`${member.exerciseIndex}-${setIndex}`}
              exerciseIndex={member.exerciseIndex}
              setIndex={setIndex}
              letter={member.letter}
              layout={layout}
              distanceUnit={distanceUnit}
              onPressLetter={() => onEditRound(roundOrder)}
            />
          )),
        )}
      </View>
      <View className="w-10">
        <Pressable
          onPress={() => toggle(!allDone)}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: allDone }}
          className="w-10 items-center justify-center py-3"
          hitSlop={0}
          testID={`workout-execution.superset.round-${roundOrder}.done`}
        >
          <Checkbox checked={allDone} onCheckedChange={toggle} hitSlop={0} />
        </Pressable>
      </View>
    </View>
  );
}

function memberTarget(
  measurementType: MeasurementType,
  values: {
    repsMin: number | null | undefined;
    repsMax: number | null | undefined;
    durationTarget: number | null | undefined;
    distanceTarget: number | null | undefined;
  },
): string {
  const dims = measurementDimensions(measurementType);
  if (dims.distance) {
    return values.distanceTarget != null && values.distanceTarget > 0
      ? formatDistance(values.distanceTarget)
      : '';
  }
  if (dims.duration && !dims.reps) {
    return values.durationTarget != null && values.durationTarget > 0
      ? formatTime(values.durationTarget)
      : '';
  }
  return formatSetTarget(values.repsMin ?? null, values.repsMax ?? null);
}

function SupersetMemberCell({
  exerciseIndex,
  setIndex,
  letter,
  layout,
  distanceUnit,
  onPressLetter,
}: {
  exerciseIndex: number;
  setIndex: number;
  letter: SupersetMember['letter'];
  layout: ColumnLayout;
  distanceUnit: DistanceUnit;
  onPressLetter: () => void;
}) {
  const { t } = useTranslation();
  const { control } = useFormContext<ExecutionFormInput>();
  const { data: preferences } = useUserPreferences();
  const basePath = `exercises.${exerciseIndex}.sets.${setIndex}` as const;
  const measurementType = useWatch({ control, name: `${basePath}.measurementType` });
  const lastKg = useWatch({ control, name: `${basePath}.lastKg` });
  const lastReps = useWatch({ control, name: `${basePath}.lastReps` });
  const repsMin = useWatch({ control, name: `${basePath}.repsMin` });
  const repsMax = useWatch({ control, name: `${basePath}.repsMax` });
  const durationTarget = useWatch({ control, name: `${basePath}.durationTarget` });
  const distanceTarget = useWatch({ control, name: `${basePath}.distanceTarget` });
  const loadPercent = useWatch({ control, name: `${basePath}.loadPercent` });
  const dims = measurementDimensions(measurementType);
  const target = memberTarget(measurementType, {
    repsMin,
    repsMax,
    durationTarget,
    distanceTarget,
  });
  const adjusted = loadPercent != null;
  const kgPlaceholder = weightPlaceholder(lastKg, loadPercent, preferences?.loadRounding ?? 'none');

  return (
    <View className="w-full flex-row items-center py-0.5">
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
                onPress={onPressLetter}
                hitSlop={8}
                className="h-8 flex-row items-center justify-center gap-1 border-primary border-b"
                accessibilityRole="button"
                testID={`workout-execution.superset.set-${setIndex}.exercise-${exerciseIndex}.type`}
              >
                <Text
                  className={`w-5 text-center font-sans-semibold text-sm ${typeConfig.textColor}`}
                >
                  {t(typeConfig.token)}
                </Text>
                <Icon as={ChevronDown} size={12} className="text-muted-foreground" />
              </Pressable>
            );
          }}
        />
      </View>
      {layout.weight ? (
        <View className="min-w-[72px] flex-1 pr-2 pl-3">
          {dims.weight ? (
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
          ) : null}
        </View>
      ) : null}
      {layout.reps ? (
        <View className="min-w-[56px] flex-1 px-2">
          {dims.reps ? (
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
          ) : null}
        </View>
      ) : null}
      {layout.duration ? (
        dims.duration ? (
          <DurationPickerCell exerciseIndex={exerciseIndex} setIndex={setIndex} />
        ) : (
          <View className="w-28 px-2" />
        )
      ) : null}
      {layout.distance ? (
        dims.distance ? (
          <Controller
            control={control}
            name={`${basePath}.distance`}
            render={({ field, fieldState }) => (
              <DistanceInput
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                invalid={fieldState.invalid}
                unit={distanceUnit}
                testID={`workout-execution.superset.set-${setIndex}.exercise-${exerciseIndex}.distance`}
              />
            )}
          />
        ) : (
          <View className="w-32 px-2" />
        )
      ) : null}
      <View className="min-w-[64px] flex-1 px-2">
        <Text
          className={`text-center text-xs ${adjusted ? 'font-sans-semibold text-primary' : 'text-muted-foreground'}`}
        >
          {target}
        </Text>
      </View>
    </View>
  );
}
