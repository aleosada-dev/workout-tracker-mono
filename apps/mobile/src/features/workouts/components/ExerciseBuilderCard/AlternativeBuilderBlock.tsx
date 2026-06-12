import { applicableSetTypes, getValidSetTypesAt } from '@workout-tracker/domain';
import { Button, Icon, Text } from '@workout-tracker/ui-mobile';
import * as Crypto from 'expo-crypto';
import { Plus, Repeat, X } from 'lucide-react-native';
import { useRef, useState } from 'react';
import { useFieldArray, useFormContext, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';
import {
  type DistanceUnit,
  DistanceUnitToggle,
  defaultDistanceUnit,
} from '@/features/workouts/components/ExerciseExecutionCard/set-cells';
import {
  SetTypePickerSheet,
  type SetTypePickerSheetRef,
} from '@/features/workouts/components/SetTypePickerSheet';
import { buildBuilderSet, type WorkoutFormInput } from '@/features/workouts/lib/builder-form';
import { exerciseColumnLayout } from '@/features/workouts/lib/workout-mappers';
import { BuilderSetCells, SetErrorMessage, SetTypePressable } from './builder-set-rows';

interface AlternativeBuilderBlockProps {
  exerciseIndex: number;
  onSwap: () => void;
  onRemove: () => void;
}

export function AlternativeBuilderBlock({
  exerciseIndex,
  onSwap,
  onRemove,
}: AlternativeBuilderBlockProps) {
  const { t } = useTranslation();
  const { control, getValues, setValue } = useFormContext<WorkoutFormInput>();
  const basePath = `exercises.${exerciseIndex}.alternative` as const;
  const alternative = useWatch({ control, name: basePath });
  const setTypePickerRef = useRef<SetTypePickerSheetRef>(null);
  const { fields, append, remove } = useFieldArray({ control, name: `${basePath}.sets` });
  const watchedSets = useWatch({ control, name: `${basePath}.sets` });
  const sets = watchedSets ?? [];
  const layout = {
    ...exerciseColumnLayout(sets.map((set) => ({ measurementType: set.measurementType }))),
    loadPercent: sets.some((set) => set.type === 'drop' || set.type === 'cluster'),
  };
  const [distanceUnit, setDistanceUnit] = useState<DistanceUnit>(() =>
    defaultDistanceUnit(
      sets.reduce<number | null>((max, s) => {
        const meters = s.distance === '' ? null : Number(s.distance);
        return meters != null && meters > (max ?? 0) ? meters : max;
      }, null),
    ),
  );

  if (!alternative) return null;

  const variationName = alternative.variation.name ?? alternative.variation.exercise.name;

  const handleAddSet = () => {
    const current = getValues(`${basePath}.sets`) ?? [];
    const measurementType = current[current.length - 1]?.measurementType ?? 'weight_reps';
    const roundOrder = (current[current.length - 1]?.roundOrder ?? -1) + 1;
    append(buildBuilderSet(Crypto.randomUUID(), 'normal', measurementType, roundOrder));
  };

  const handlePressType = (setIndex: number) => {
    const current = getValues(`${basePath}.sets`) ?? [];
    const validTypes = getValidSetTypesAt(current, setIndex);
    const options = applicableSetTypes(current[setIndex].measurementType);
    setTypePickerRef.current?.present(
      current[setIndex].type,
      validTypes,
      (next) => {
        setValue(`${basePath}.sets.${setIndex}.type`, next, { shouldDirty: true });
        if ((next === 'drop' || next === 'cluster') && setIndex > 0) {
          setValue(
            `${basePath}.sets.${setIndex}.roundOrder`,
            getValues(`${basePath}.sets.${setIndex - 1}.roundOrder`),
            { shouldDirty: true },
          );
        }
      },
      fields.length > 1 ? { onRemoveSet: () => remove(setIndex) } : undefined,
      options,
    );
  };

  return (
    <View className="mx-4 mt-3 gap-2 rounded-lg border border-border border-dashed bg-muted/30 p-3">
      <View className="flex-row items-center gap-2">
        <View className="flex-1">
          <Text className="font-sans-semibold text-muted-foreground text-xs uppercase tracking-wider">
            {t('workoutFormScreen.alternative.label')}
          </Text>
          <Text className="font-sans-medium text-foreground text-sm" numberOfLines={1}>
            {variationName}
          </Text>
        </View>
        <Pressable
          onPress={onSwap}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={t('workoutFormScreen.alternative.swap')}
          testID={`workout-form.alternative-${exerciseIndex}.swap`}
        >
          <Icon as={Repeat} size={16} className="text-muted-foreground" />
        </Pressable>
        <Pressable
          onPress={onRemove}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={t('workoutFormScreen.alternative.remove')}
          testID={`workout-form.alternative-${exerciseIndex}.remove`}
        >
          <Icon as={X} size={16} className="text-muted-foreground" />
        </Pressable>
      </View>

      {layout.distance ? (
        <View className="flex-row justify-end">
          <DistanceUnitToggle
            unit={distanceUnit}
            onToggle={() => setDistanceUnit((u) => (u === 'm' ? 'km' : 'm'))}
            testID={`workout-form.alternative-${exerciseIndex}.distance-unit`}
          />
        </View>
      ) : null}

      {fields.map((field, setIndex) => (
        <View key={field.id} className="py-0.5">
          <View className="flex-row items-center">
            <View className="w-10">
              <SetTypePressable
                value={sets[setIndex]?.type ?? 'normal'}
                onPress={() => handlePressType(setIndex)}
                testID={`workout-form.alternative-${exerciseIndex}.set-${setIndex}.type`}
              />
            </View>
            <BuilderSetCells
              exerciseIndex={exerciseIndex}
              setIndex={setIndex}
              layout={layout}
              distanceUnit={distanceUnit}
              pathPrefix={`${basePath}.sets`}
            />
            <View className="flex-1" />
          </View>
          <SetErrorMessage exerciseIndex={exerciseIndex} setIndex={setIndex} alternative />
        </View>
      ))}

      <Button
        variant="outline"
        size="sm"
        onPress={handleAddSet}
        className="w-full"
        testID={`workout-form.alternative-${exerciseIndex}.add-set`}
      >
        <Icon as={Plus} size={14} className="text-secondary-foreground" />
        <Text className="font-sans-semibold text-secondary-foreground text-sm">
          {t('workoutExecutionScreen.exercise.addSet')}
        </Text>
      </Button>

      <SetTypePickerSheet ref={setTypePickerRef} />
    </View>
  );
}
