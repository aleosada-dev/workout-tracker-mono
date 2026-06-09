import {
  EXERCISE_MEASUREMENT_TYPES,
  type ExerciseMeasurementType,
  VISIBILITIES,
  type Visibility,
} from '@workout-tracker/domain';
import {
  Button,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Text,
} from '@workout-tracker/ui-mobile';
import { router } from 'expo-router';
import type { TFunction } from 'i18next';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { EquipmentSelect } from '@/features/equipments/components/equipment-select';
import {
  EMPTY_EXERCISE_LIST_PARAMS,
  type ExerciseListParams,
} from '@/features/exercises/api/exercises';
import { MeasurementTypeHelpDialog } from '@/features/exercises/components/MeasurementTypeHelpDialog';
import { MeasurementTypeSelector } from '@/features/exercises/components/MeasurementTypeSelector';
import { exerciseFilters$ } from '@/features/exercises/state/exercise-list-filter-store';
import { MuscleMultiSelect } from '@/features/muscles/components/muscle-multi-select';

export default function ExercisesFilterScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [draft, setDraft] = useState<ExerciseListParams>(() => exerciseFilters$.get());

  const setVisibility = (visibility: Visibility) => {
    setDraft((prev) => ({ ...prev, query: { ...prev.query, visibility } }));
  };

  const setMuscleIds = (muscleIds: string[]) => {
    setDraft((prev) => ({
      ...prev,
      query: { ...prev.query, muscleIds: muscleIds.length > 0 ? muscleIds : undefined },
    }));
  };

  const setEquipmentId = (equipmentId: string | null) => {
    setDraft((prev) => ({
      ...prev,
      query: { ...prev.query, equipmentIds: equipmentId ? [equipmentId] : undefined },
    }));
  };

  // O seletor exige no mínimo 1 tipo; "todos selecionados" equivale a sem filtro.
  const current = draft.query.measurementTypes;
  const selectedMeasurementTypes: ExerciseMeasurementType[] = current
    ? ((Array.isArray(current) ? current : [current]) as ExerciseMeasurementType[])
    : [...EXERCISE_MEASUREMENT_TYPES];

  const setMeasurementTypes = (types: ExerciseMeasurementType[]) => {
    const allSelected = types.length === EXERCISE_MEASUREMENT_TYPES.length;
    setDraft((prev) => ({
      ...prev,
      query: { ...prev.query, measurementTypes: allSelected ? undefined : types },
    }));
  };

  const handleApply = () => {
    exerciseFilters$.set(draft);
    router.back();
  };

  const handleClear = () => {
    exerciseFilters$.set(EMPTY_EXERCISE_LIST_PARAMS);
    router.back();
  };

  return (
    <View className="flex-1 pt-4" testID="exercises-filter">
      <ScrollView
        className="flex-1"
        contentContainerClassName="gap-5 px-4 pb-3"
        keyboardShouldPersistTaps="handled"
      >
        <View className="gap-2">
          <Label className="uppercase tracking-wider">
            {t('exerciseListScreen.filter.sections.visibility')}
          </Label>
          <Select
            value={(() => {
              const raw = draft.query.visibility;
              const v: Visibility = VISIBILITIES.includes(raw as Visibility)
                ? (raw as Visibility)
                : 'all';
              return { value: v, label: visibilityLabel(v, t) };
            })()}
            onValueChange={(opt) => {
              const value = opt?.value;
              if (
                value === 'all' ||
                value === 'public' ||
                value === 'shared' ||
                value === 'owned'
              ) {
                setVisibility(value);
              }
            }}
          >
            <SelectTrigger testID="exercises-filter.visibility">
              <SelectValue placeholder={t('exerciseListScreen.filter.visibility.all')} />
            </SelectTrigger>
            <SelectContent>
              {VISIBILITIES.map((v) => (
                <SelectItem
                  key={v}
                  value={v}
                  label={visibilityLabel(v, t)}
                  testID={`exercises-filter.visibility.${v}`}
                >
                  {visibilityLabel(v, t)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </View>

        <View className="gap-2">
          <View className="flex-row items-center gap-2">
            <Label className="uppercase tracking-wider">
              {t('exerciseListScreen.filter.sections.measurementType')}
            </Label>
            <MeasurementTypeHelpDialog />
          </View>
          <MeasurementTypeSelector
            multiple
            value={selectedMeasurementTypes}
            onValueChange={setMeasurementTypes}
            testID="exercises-filter.measurementType"
          />
        </View>

        <View className="gap-2">
          <Label className="uppercase tracking-wider">
            {t('exerciseListScreen.filter.sections.primaryMuscle')}
          </Label>
          <MuscleMultiSelect
            testID="exercises-filter.muscle"
            value={
              Array.isArray(draft.query.muscleIds)
                ? draft.query.muscleIds
                : draft.query.muscleIds
                  ? [draft.query.muscleIds]
                  : []
            }
            onValueChange={setMuscleIds}
            placeholder={t('exerciseListScreen.filter.placeholders.primaryMuscle')}
          />
        </View>

        <View className="gap-2">
          <Label className="uppercase tracking-wider">
            {t('exerciseListScreen.filter.sections.equipment')}
          </Label>
          <EquipmentSelect
            testID="exercises-filter.equipment"
            value={
              Array.isArray(draft.query.equipmentIds)
                ? (draft.query.equipmentIds[0] ?? null)
                : (draft.query.equipmentIds ?? null)
            }
            onValueChange={setEquipmentId}
            placeholder={t('exerciseListScreen.filter.placeholders.equipment')}
          />
        </View>
      </ScrollView>

      <View
        className="flex-row gap-3 border-border border-t bg-background px-4 pt-3"
        style={{ paddingBottom: Math.max(insets.bottom, 12) }}
      >
        <Button
          variant="outline"
          className="flex-1"
          onPress={handleClear}
          testID="exercises-filter.clear"
        >
          <Text>{t('exerciseListScreen.filter.clear')}</Text>
        </Button>
        <Button className="flex-1" onPress={handleApply} testID="exercises-filter.apply">
          <Text className="text-primary-foreground">{t('exerciseListScreen.filter.apply')}</Text>
        </Button>
      </View>
    </View>
  );
}

function visibilityLabel(v: Visibility, t: TFunction): string {
  return v === 'all'
    ? t('exerciseListScreen.filter.visibility.all')
    : t(`exercises.visibility.${v}`);
}
