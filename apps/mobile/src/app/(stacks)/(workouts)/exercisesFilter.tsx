import {
  EXERCISE_TYPES,
  type ExerciseType,
  VISIBILITIES,
  type Visibility,
} from '@workout-tracker/domain';
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Button,
  Checkbox,
  cn,
  Label,
  Text,
  ToggleGroup,
  ToggleGroupItem,
} from '@workout-tracker/ui-mobile';
import { router } from 'expo-router';
import { AlertTriangle } from 'lucide-react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { EquipmentSelect } from '@/features/equipments/components/equipment-select';
import {
  EMPTY_EXERCISE_LIST_PARAMS,
  type ExerciseListParams,
} from '@/features/exercises/api/exercises';
import { exerciseFilters$ } from '@/features/exercises/state/exercise-list-filter-store';
import { MuscleMultiSelect } from '@/features/muscles/components/muscle-multi-select';

export default function ExercisesFilterScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [draft, setDraft] = useState<ExerciseListParams>(() => exerciseFilters$.get());
  const [showTypeWarning, setShowTypeWarning] = useState(false);
  const warningTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearWarningTimer = () => {
    if (warningTimer.current) {
      clearTimeout(warningTimer.current);
      warningTimer.current = null;
    }
  };

  const dismissTypeWarning = () => {
    clearWarningTimer();
    setShowTypeWarning(false);
  };

  const triggerTypeWarning = () => {
    clearWarningTimer();
    setShowTypeWarning(true);
    warningTimer.current = setTimeout(() => {
      warningTimer.current = null;
      setShowTypeWarning(false);
    }, 3000);
  };

  useEffect(() => clearWarningTimer, [clearWarningTimer]);

  const toggleType = useCallback(
    (type: ExerciseType) => {
      const current = draft.query.exerciseTypes;
      const arr = current ? (Array.isArray(current) ? current : [current]) : [...EXERCISE_TYPES];
      const has = arr.includes(type);
      if (has && arr.length === 1) {
        triggerTypeWarning();
        return;
      }
      setDraft((prev) => ({
        ...prev,
        query: {
          ...prev.query,
          exerciseTypes: has ? arr.filter((x) => x !== type) : [...arr, type],
        },
      }));
    },
    [draft.query.exerciseTypes, triggerTypeWarning],
  );

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
            {t('exerciseListScreen.filter.sections.type')}
          </Label>
          {showTypeWarning ? (
            <Alert
              variant="warning"
              icon={AlertTriangle}
              onDismiss={dismissTypeWarning}
              dismissAccessibilityLabel={t('common.close')}
              testID="exercises-filter.type.warning"
            >
              <AlertTitle>{t('exerciseListScreen.filter.warnings.typeMinOne.title')}</AlertTitle>
              <AlertDescription>
                {t('exerciseListScreen.filter.warnings.typeMinOne.message')}
              </AlertDescription>
            </Alert>
          ) : null}
          <View className="flex-row gap-4">
            {EXERCISE_TYPES.map((type) => {
              const checked = draft.query.exerciseTypes
                ? !!(Array.isArray(draft.query.exerciseTypes)
                    ? draft.query.exerciseTypes.includes(type)
                    : draft.query.exerciseTypes === type)
                : true;
              return (
                <CheckboxRow
                  key={type}
                  label={t(`exercises.type.${type}`)}
                  checked={checked}
                  onChange={() => toggleType(type)}
                  testID={`exercises-filter.type.${type}`}
                  className="flex-1"
                />
              );
            })}
          </View>
        </View>

        <View className="gap-2">
          <Label className="uppercase tracking-wider">
            {t('exerciseListScreen.filter.sections.visibility')}
          </Label>
          <ToggleGroup
            type="single"
            value={typeof draft.query.visibility === 'string' ? draft.query.visibility : 'all'}
            onValueChange={(value) => {
              if (value === 'all' || value === 'public' || value === 'private') {
                setVisibility(value);
              }
            }}
            variant="outline"
            size="sm"
          >
            {VISIBILITIES.map((v, i) => (
              <ToggleGroupItem
                key={v}
                value={v}
                isFirst={i === 0}
                isLast={i === VISIBILITIES.length - 1}
                className="flex-1"
                testID={`exercises-filter.visibility.${v}`}
              >
                <Text>
                  {v === 'all'
                    ? t('exerciseListScreen.filter.visibility.all')
                    : t(`exercises.visibility.${v}`)}
                </Text>
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
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

function CheckboxRow({
  label,
  checked,
  onChange,
  testID,
  className,
}: {
  label: string;
  checked: boolean;
  onChange: () => void;
  testID?: string;
  className?: string;
}) {
  return (
    <View className={cn('flex-row items-center gap-3 py-1.5', className)}>
      <Checkbox checked={checked} onCheckedChange={onChange} testID={testID} />
      <Text className="font-sans text-base text-foreground" onPress={onChange}>
        {label}
      </Text>
    </View>
  );
}
