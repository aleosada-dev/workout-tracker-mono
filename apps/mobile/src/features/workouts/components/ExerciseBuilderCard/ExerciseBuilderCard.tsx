import { applicableSetTypes, getValidSetTypesAt } from '@workout-tracker/domain';
import { Button, Card, Icon, Text } from '@workout-tracker/ui-mobile';
import * as Crypto from 'expo-crypto';
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Circle,
  GripVertical,
  Plus,
  Repeat,
  StickyNote,
  Timer,
} from 'lucide-react-native';
import { useRef, useState } from 'react';
import { useFieldArray, useFormContext, useFormState, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { formatRestSeconds } from '@/features/shared/lib/utils';
import {
  DurationPickerSheet,
  type DurationPickerSheetRef,
} from '@/features/workouts/components/DurationPickerSheet';
import {
  type DistanceUnit,
  DistanceUnitToggle,
  defaultDistanceUnit,
} from '@/features/workouts/components/ExerciseExecutionCard/set-cells';
import {
  ExerciseNoteSheet,
  type ExerciseNoteSheetRef,
} from '@/features/workouts/components/ExerciseNoteSheet';
import { LoadPercentHelpDialog } from '@/features/workouts/components/LoadPercentHelpDialog';
import {
  RemoveSetSheet,
  type RemoveSetSheetRef,
} from '@/features/workouts/components/RemoveSetSheet';
import {
  SetTypePickerSheet,
  type SetTypePickerSheetRef,
} from '@/features/workouts/components/SetTypePickerSheet';
import { SetTypesHelpDialog } from '@/features/workouts/components/SetTypesHelpDialog';
import { buildBuilderSet, type WorkoutFormInput } from '@/features/workouts/lib/builder-form';
import { exerciseColumnLayout } from '@/features/workouts/lib/workout-mappers';
import { AlternativeBuilderBlock } from './AlternativeBuilderBlock';
import { BuilderSetCells, SetErrorMessage, SetTypePressable } from './builder-set-rows';

export interface ExerciseBuilderCardProps {
  exerciseIndex: number;
  name: string;
  variationName?: string;
  alternativeName?: string;
  alternativeVariationName?: string | null;
  dragHandle?: React.ReactNode;
  selectable?: boolean;
  selected?: boolean;
  onToggleSelect?: () => void;
  onLongPress?: () => void;
  onPressName?: () => void;
  onAddAlternative?: () => void;
  onSwapAlternative?: () => void;
  onRemoveAlternative?: () => void;
  onPressAlternativeName?: () => void;
}

export function ExerciseBuilderCard({
  exerciseIndex,
  name,
  variationName,
  alternativeName,
  alternativeVariationName,
  dragHandle,
  selectable = false,
  selected = false,
  onToggleSelect,
  onLongPress,
  onPressName,
  onAddAlternative,
  onSwapAlternative,
  onRemoveAlternative,
  onPressAlternativeName,
}: ExerciseBuilderCardProps) {
  const { t } = useTranslation();
  const [collapsed, setCollapsed] = useState(true);
  const isCollapsed = selectable || collapsed;
  const { control, getValues, setValue } = useFormContext<WorkoutFormInput>();
  const { fields, append, remove } = useFieldArray({
    control,
    name: `exercises.${exerciseIndex}.sets`,
  });
  const { errors } = useFormState({ control, name: `exercises.${exerciseIndex}` });
  const hasError = Boolean(errors.exercises?.[exerciseIndex]);
  const setTypePickerRef = useRef<SetTypePickerSheetRef>(null);
  const removeSetSheetRef = useRef<RemoveSetSheetRef>(null);
  const noteSheetRef = useRef<ExerciseNoteSheetRef>(null);
  const restPickerRef = useRef<DurationPickerSheetRef>(null);
  const note = useWatch({ control, name: `exercises.${exerciseIndex}.note` });
  const restSeconds = useWatch({ control, name: `exercises.${exerciseIndex}.restSeconds` });
  const watchedSets = useWatch({ control, name: `exercises.${exerciseIndex}.sets` });
  const hasAlternative =
    useWatch({ control, name: `exercises.${exerciseIndex}.alternative` }) != null;
  const sets = watchedSets ?? [];
  const layout = {
    ...exerciseColumnLayout(sets.map((set) => ({ measurementType: set.measurementType }))),
    loadPercent: sets.some((set) => set.type === 'drop' || set.type === 'cluster'),
  };
  const [distanceUnit, setDistanceUnit] = useState<DistanceUnit>(() =>
    defaultDistanceUnit(
      getValues(`exercises.${exerciseIndex}.sets`).reduce<number | null>((max, s) => {
        const meters = s.distance === '' ? null : Number(s.distance);
        return meters != null && meters > (max ?? 0) ? meters : max;
      }, null),
    ),
  );
  const showSetType = getValues(`exercises.${exerciseIndex}.exerciseType`) !== 'preparatory';
  const hasNote = note != null && note.length > 0;

  const handleAddSet = () => {
    const current = getValues(`exercises.${exerciseIndex}.sets`);
    const measurementType = current[current.length - 1]?.measurementType ?? 'weight_reps';
    const roundOrder = (current[current.length - 1]?.roundOrder ?? -1) + 1;
    append(buildBuilderSet(Crypto.randomUUID(), 'normal', measurementType, roundOrder));
  };

  const handleEditNote = () => {
    noteSheetRef.current?.present(getValues(`exercises.${exerciseIndex}.note`), (next) => {
      setValue(`exercises.${exerciseIndex}.note`, next, { shouldDirty: true });
    });
  };

  const handleEditRest = () => {
    restPickerRef.current?.present(
      getValues(`exercises.${exerciseIndex}.restSeconds`) ?? 0,
      (secs) => {
        setValue(`exercises.${exerciseIndex}.restSeconds`, secs > 0 ? secs : null, {
          shouldDirty: true,
        });
      },
      () => {
        setValue(`exercises.${exerciseIndex}.restSeconds`, null, { shouldDirty: true });
      },
    );
  };

  const handlePressType = (setIndex: number) => {
    const current = getValues(`exercises.${exerciseIndex}.sets`);
    const validTypes = getValidSetTypesAt(current, setIndex);
    const options = applicableSetTypes(current[setIndex].measurementType);
    setTypePickerRef.current?.present(
      current[setIndex].type,
      validTypes,
      (next) => {
        setValue(`exercises.${exerciseIndex}.sets.${setIndex}.type`, next, { shouldDirty: true });
        if ((next === 'drop' || next === 'cluster') && setIndex > 0) {
          setValue(
            `exercises.${exerciseIndex}.sets.${setIndex}.roundOrder`,
            getValues(`exercises.${exerciseIndex}.sets.${setIndex - 1}.roundOrder`),
            { shouldDirty: true },
          );
        }
      },
      fields.length > 1 ? { onRemoveSet: () => remove(setIndex) } : undefined,
      options,
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
          className="flex-1"
          onPress={selectable ? onToggleSelect : onPressName}
          onLongPress={onLongPress}
          delayLongPress={350}
          disabled={selectable ? !onToggleSelect : !onLongPress && !onPressName}
          accessibilityRole={selectable ? 'checkbox' : onPressName ? 'button' : undefined}
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
            testID="workout-form.exercise.collapse"
          >
            <Icon as={collapsed ? ChevronDown : ChevronUp} size={20} className="text-foreground" />
          </Pressable>
        )}
      </View>

      {!isCollapsed ? (
        <Animated.View entering={FadeIn.duration(180)} exiting={FadeOut.duration(120)}>
          {hasAlternative ? (
            <AlternativeBuilderBlock
              exerciseIndex={exerciseIndex}
              name={alternativeName ?? ''}
              variationName={alternativeVariationName ?? null}
              onPressName={onPressAlternativeName}
              onSwap={() => onSwapAlternative?.()}
              onRemove={() => onRemoveAlternative?.()}
            />
          ) : onAddAlternative ? (
            <View className="px-4 pt-1">
              <Pressable
                onPress={onAddAlternative}
                accessibilityRole="button"
                className="flex-row items-center justify-center gap-2 py-1"
                testID={`workout-form.exercise-${exerciseIndex}.add-alternative`}
              >
                <Icon as={Repeat} size={14} className="text-muted-foreground" />
                <Text variant="muted" className="font-sans-medium text-sm">
                  {t('workoutFormScreen.alternative.add')}
                </Text>
              </Pressable>
            </View>
          ) : null}

          <View className="flex-row items-start gap-3 px-4 pt-4 pb-4">
            <Pressable
              onPress={handleEditNote}
              accessibilityRole="button"
              accessibilityLabel={t(
                hasNote
                  ? 'workoutFormScreen.exercise.editNote'
                  : 'workoutFormScreen.exercise.addNote',
              )}
              testID="workout-form.exercise.note"
              className="flex-1 flex-row items-start gap-2"
            >
              <Icon
                as={StickyNote}
                size={16}
                className={`mt-0.5 ${hasNote ? 'text-foreground' : 'text-muted-foreground'}`}
              />
              <Text
                variant={hasNote ? 'default' : 'muted'}
                className="flex-1 text-sm"
                numberOfLines={hasNote ? 2 : 1}
              >
                {hasNote ? note : t('workoutFormScreen.exercise.addNote')}
              </Text>
            </Pressable>
            <Pressable
              onPress={handleEditRest}
              accessibilityRole="button"
              accessibilityLabel={t('workoutFormScreen.exercise.editRest')}
              testID="workout-form.exercise.rest"
              className="flex-row items-center gap-2"
            >
              <Icon
                as={Timer}
                size={16}
                className={restSeconds != null ? 'text-foreground' : 'text-muted-foreground'}
              />
              <Text variant={restSeconds != null ? 'default' : 'muted'} className="text-sm">
                {restSeconds != null
                  ? formatRestSeconds(restSeconds)
                  : t('workoutFormScreen.exercise.restUndefined')}
              </Text>
            </Pressable>
          </View>

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
              {layout.reps ? (
                <View className="w-40 pl-3">
                  <Text className="font-sans-medium text-muted-foreground text-xs uppercase tracking-wider">
                    {t('workoutFormScreen.exercise.headers.reps')}
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
                    testID="workout-form.exercise.distance-unit"
                  />
                </View>
              ) : null}
              {layout.loadPercent ? (
                <View className="w-24 flex-row items-center gap-1 px-2">
                  <Text className="shrink font-sans-medium text-muted-foreground text-xs uppercase tracking-wider">
                    {t('workoutFormScreen.exercise.headers.loadPercent')}
                  </Text>
                  <LoadPercentHelpDialog />
                </View>
              ) : null}
              <View className="flex-1" />
            </View>

            {fields.map((field, setIndex) => (
              <BuilderSetRow
                key={field.id}
                exerciseIndex={exerciseIndex}
                setIndex={setIndex}
                layout={layout}
                showSetType={showSetType}
                distanceUnit={distanceUnit}
                canRemove={fields.length > 1}
                onPressType={() => handlePressType(setIndex)}
                onRemoveSet={() => {
                  removeSetSheetRef.current?.present(() => remove(setIndex));
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
      <RemoveSetSheet ref={removeSetSheetRef} />
      <ExerciseNoteSheet ref={noteSheetRef} />
      <DurationPickerSheet ref={restPickerRef} />
    </Card>
  );
}

function BuilderSetRow({
  exerciseIndex,
  setIndex,
  layout,
  showSetType,
  distanceUnit,
  canRemove,
  onPressType,
  onRemoveSet,
}: {
  exerciseIndex: number;
  setIndex: number;
  layout: ReturnType<typeof exerciseColumnLayout> & { loadPercent: boolean };
  showSetType: boolean;
  distanceUnit: DistanceUnit;
  canRemove: boolean;
  onPressType: () => void;
  onRemoveSet: () => void;
}) {
  const { t } = useTranslation();
  const { control } = useFormContext<WorkoutFormInput>();
  const type = useWatch({
    control,
    name: `exercises.${exerciseIndex}.sets.${setIndex}.type`,
  });

  return (
    <View className="-mx-4 px-4 py-0.5">
      <View className="flex-row items-center">
        <View className="w-10">
          {showSetType ? (
            <SetTypePressable
              value={type}
              onPress={onPressType}
              testID={`workout-form.set-${setIndex}.type`}
            />
          ) : canRemove ? (
            <Pressable
              onPress={onRemoveSet}
              hitSlop={8}
              className="h-8 flex-row items-center justify-center gap-1 border-primary border-b"
              accessibilityRole="button"
              accessibilityLabel={t('workoutExecutionScreen.removeSetSheet.title')}
              testID={`workout-form.set-${setIndex}.options`}
            >
              <Text className="w-5 text-center font-sans-semibold text-foreground text-sm">
                {setIndex + 1}
              </Text>
              <Icon as={ChevronDown} size={12} className="text-muted-foreground" />
            </Pressable>
          ) : (
            <View className="h-8 items-center justify-center">
              <Text className="w-5 text-center font-sans-semibold text-foreground text-sm">
                {setIndex + 1}
              </Text>
            </View>
          )}
        </View>
        <BuilderSetCells
          exerciseIndex={exerciseIndex}
          setIndex={setIndex}
          layout={layout}
          distanceUnit={distanceUnit}
        />
        <View className="flex-1" />
      </View>
      <SetErrorMessage exerciseIndex={exerciseIndex} setIndex={setIndex} />
    </View>
  );
}
