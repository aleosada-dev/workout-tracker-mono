import { measurementDimensions } from '@workout-tracker/domain';
import { Button, Card, Icon, Text } from '@workout-tracker/ui-mobile';
import * as Crypto from 'expo-crypto';
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Circle,
  GripVertical,
  Pencil,
  Plus,
  StickyNote,
  Timer,
} from 'lucide-react-native';
import { useRef, useState } from 'react';
import { useFormContext, useFormState, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import type { SetType } from '@/features/exercises/lib/sets';
import { formatRestSeconds } from '@/features/shared/lib/utils';
import type { BuilderColumnLayout } from '@/features/workouts/components/ExerciseBuilderCard/builder-set-rows';
import {
  DistanceTargetCell,
  DurationTargetCell,
  LoadPercentCell,
  RepsRangeCells,
  SetErrorMessage,
  SetTypePressable,
} from '@/features/workouts/components/ExerciseBuilderCard/builder-set-rows';
import {
  type DistanceUnit,
  DistanceUnitToggle,
  defaultDistanceUnit,
} from '@/features/workouts/components/ExerciseExecutionCard/set-cells';
import {
  ExerciseSettingsSheet,
  type ExerciseSettingsSheetRef,
} from '@/features/workouts/components/ExerciseSettingsSheet';
import { SetTypesHelpDialog } from '@/features/workouts/components/SetTypesHelpDialog';
import {
  type AddSetEntry,
  SupersetAddSetsSheet,
  type SupersetAddSetsSheetRef,
} from '@/features/workouts/components/SupersetAddSetsSheet';
import { SupersetHelpDialog } from '@/features/workouts/components/SupersetHelpDialog';
import { buildBuilderSet, type WorkoutFormInput } from '@/features/workouts/lib/builder-form';
import {
  buildRounds,
  exerciseColumnLayout,
  type RoundMemberView,
  type SupersetMember,
} from '@/features/workouts/lib/workout-mappers';

type MemberSets = WorkoutFormInput['exercises'][number]['sets'];

export interface SupersetBuilderCardProps {
  members: SupersetMember[];
  restSeconds?: number | null;
  dragHandle?: React.ReactNode;
  selectable?: boolean;
  selected?: boolean;
  onToggleSelect?: () => void;
  onLongPress?: () => void;
}

export function SupersetBuilderCard({
  members,
  restSeconds,
  dragHandle,
  selectable = false,
  selected = false,
  onToggleSelect,
  onLongPress,
}: SupersetBuilderCardProps) {
  const { t } = useTranslation();
  const [collapsed, setCollapsed] = useState(true);
  const isCollapsed = selectable || collapsed;
  const { control, getValues, setValue } = useFormContext<WorkoutFormInput>();
  const memberSetsNames = members.map((m) => `exercises.${m.exerciseIndex}.sets` as const);
  const watchedMemberSets = useWatch({ control, name: memberSetsNames }) as
    | MemberSets[]
    | undefined;
  const setsByMember = watchedMemberSets ?? [];
  const rounds = buildRounds(members, setsByMember);
  const allSets = setsByMember.flatMap((sets) => sets ?? []);
  const layout: BuilderColumnLayout = {
    ...exerciseColumnLayout(allSets.map((set) => ({ measurementType: set.measurementType }))),
    loadPercent: allSets.some((set) => set.type === 'drop' || set.type === 'cluster'),
  };
  const { errors } = useFormState({ control, name: 'exercises' });
  const hasError = members.some((m) => Boolean(errors.exercises?.[m.exerciseIndex]));
  const addSetsSheetRef = useRef<SupersetAddSetsSheetRef>(null);
  const settingsSheetRef = useRef<ExerciseSettingsSheetRef>(null);
  const [distanceUnit, setDistanceUnit] = useState<DistanceUnit>(() =>
    defaultDistanceUnit(
      members.reduce<number | null>(
        (max, m) =>
          getValues(`exercises.${m.exerciseIndex}.sets`).reduce<number | null>((acc, s) => {
            const meters = s.distance === '' ? null : Number(s.distance);
            return meters != null && meters > (acc ?? 0) ? meters : acc;
          }, max),
        null,
      ),
    ),
  );

  const handleEditMemberSettings = (exerciseIndex: number) => {
    settingsSheetRef.current?.present(
      {
        note: getValues(`exercises.${exerciseIndex}.note`),
        restSeconds: getValues(`exercises.${exerciseIndex}.restSeconds`),
      },
      (next) => {
        setValue(`exercises.${exerciseIndex}.note`, next.note, { shouldDirty: true });
        setValue(`exercises.${exerciseIndex}.restSeconds`, next.restSeconds, {
          shouldDirty: true,
        });
      },
    );
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
        ...buildBuilderSet(Crypto.randomUUID(), type, measurementType, nextRound),
      }));
      setValue(`exercises.${exerciseIndex}.sets`, [...current, ...appended], {
        shouldDirty: true,
      });
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
          return buildBuilderSet(Crypto.randomUUID(), entry.type, measurementType, roundOrder);
        });
      setValue(`exercises.${member.exerciseIndex}.sets`, [...before, ...roundSets, ...after], {
        shouldDirty: true,
      });
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
            testID="workout-form.superset.collapse"
          >
            <Icon as={collapsed ? ChevronDown : ChevronUp} size={20} className="text-foreground" />
          </Pressable>
        )}
      </View>

      <View className="gap-2 px-4">
        {members.map((member) => {
          const hasNote = member.note != null && member.note.length > 0;
          return (
            <View key={member.exerciseIndex} className="gap-1">
              <Pressable
                className="flex-row items-center gap-2"
                onPress={selectable ? onToggleSelect : undefined}
                onLongPress={onLongPress}
                delayLongPress={350}
                disabled={selectable ? !onToggleSelect : !onLongPress}
                accessibilityRole={selectable ? 'checkbox' : undefined}
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
                {!isCollapsed ? (
                  <Pressable
                    onPress={() => handleEditMemberSettings(member.exerciseIndex)}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel={t('workoutFormScreen.exercise.editDetails')}
                    testID={`workout-form.superset.member-${member.exerciseIndex}.edit-details`}
                  >
                    <Icon as={Pencil} size={16} className="text-muted-foreground" />
                  </Pressable>
                ) : null}
              </Pressable>
              {hasNote && !isCollapsed ? (
                <View className="flex-row items-start gap-1.5 pl-7">
                  <Icon as={StickyNote} size={13} className="mt-0.5 text-muted-foreground" />
                  <Text variant="muted" className="flex-1 text-xs">
                    {member.note}
                  </Text>
                </View>
              ) : null}
            </View>
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
              {layout.reps ? (
                <>
                  <View className="w-20 pr-2 pl-3">
                    <Text className="font-sans-medium text-muted-foreground text-xs uppercase tracking-wider">
                      {t('workoutFormScreen.exercise.headers.repsMin')}
                    </Text>
                  </View>
                  <View className="w-20 px-2">
                    <Text className="font-sans-medium text-muted-foreground text-xs uppercase tracking-wider">
                      {t('workoutFormScreen.exercise.headers.repsMax')}
                    </Text>
                  </View>
                </>
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
                    testID="workout-form.superset.distance-unit"
                  />
                </View>
              ) : null}
              {layout.loadPercent ? (
                <View className="w-16 px-2">
                  <Text className="font-sans-medium text-muted-foreground text-xs uppercase tracking-wider">
                    {t('workoutFormScreen.exercise.headers.loadPercent')}
                  </Text>
                </View>
              ) : null}
              <View className="flex-1" />
            </View>

            {rounds.map(({ roundOrder, roundMembers }) => (
              <View key={roundMembers.flatMap((m) => m.ids).join('-')} className="-mx-4 px-4 py-1">
                {roundMembers.map((member) =>
                  member.setIndexes.map((setIndex) => (
                    <BuilderMemberCell
                      key={`${member.exerciseIndex}-${setIndex}`}
                      exerciseIndex={member.exerciseIndex}
                      setIndex={setIndex}
                      letter={member.letter}
                      layout={layout}
                      distanceUnit={distanceUnit}
                      onPressLetter={() => handleEditRound(roundOrder)}
                    />
                  )),
                )}
              </View>
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
      <ExerciseSettingsSheet ref={settingsSheetRef} />
    </Card>
  );
}

function BuilderMemberCell({
  exerciseIndex,
  setIndex,
  letter,
  layout,
  distanceUnit,
  onPressLetter,
}: {
  exerciseIndex: number;
  setIndex: number;
  letter: RoundMemberView['letter'];
  layout: BuilderColumnLayout;
  distanceUnit: DistanceUnit;
  onPressLetter: () => void;
}) {
  const { control } = useFormContext<WorkoutFormInput>();
  const basePath = `exercises.${exerciseIndex}.sets.${setIndex}` as const;
  const measurementType = useWatch({ control, name: `${basePath}.measurementType` });
  const type = useWatch({ control, name: `${basePath}.type` });
  const dims = measurementDimensions(measurementType);
  const linked = type === 'drop' || type === 'cluster';

  return (
    <View className="py-0.5">
      <View className="flex-row items-center">
        <Pressable
          onPress={onPressLetter}
          hitSlop={8}
          accessibilityRole="button"
          testID={`workout-form.superset.set-${setIndex}.exercise-${exerciseIndex}.letter`}
          className="w-8 items-center"
        >
          <View className="h-5 w-5 items-center justify-center rounded-full bg-primary">
            <Text className="font-sans-semibold text-[10px] text-primary-foreground">{letter}</Text>
          </View>
        </Pressable>
        <View className="w-10 justify-center">
          <SetTypePressable
            value={type}
            onPress={onPressLetter}
            testID={`workout-form.superset.set-${setIndex}.exercise-${exerciseIndex}.type`}
          />
        </View>
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
        <View className="flex-1" />
      </View>
      <SetErrorMessage exerciseIndex={exerciseIndex} setIndex={setIndex} />
    </View>
  );
}
