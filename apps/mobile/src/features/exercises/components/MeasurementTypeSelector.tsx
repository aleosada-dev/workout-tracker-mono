import { EXERCISE_MEASUREMENT_TYPES, type ExerciseMeasurementType } from '@workout-tracker/domain';
import { cn, Icon, Text } from '@workout-tracker/ui-mobile';
import { type LucideIcon, Repeat, Route, Timer, Weight } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

export const MEASUREMENT_TYPE_ICONS: Record<ExerciseMeasurementType, LucideIcon> = {
  weight_reps: Weight,
  reps: Repeat,
  duration: Timer,
  distance: Route,
};

type SingleProps = {
  multiple?: false;
  value: ExerciseMeasurementType;
  onValueChange: (value: ExerciseMeasurementType) => void;
};

type MultiProps = {
  multiple: true;
  value: ExerciseMeasurementType[];
  onValueChange: (value: ExerciseMeasurementType[]) => void;
};

type MeasurementTypeSelectorProps = (SingleProps | MultiProps) & {
  testID?: string;
};

export function MeasurementTypeSelector(props: MeasurementTypeSelectorProps) {
  const { t } = useTranslation();

  const isSelected = (type: ExerciseMeasurementType) =>
    props.multiple ? props.value.includes(type) : props.value === type;

  const handlePress = (type: ExerciseMeasurementType) => {
    if (props.multiple) {
      const alreadySelected = props.value.includes(type);
      if (alreadySelected && props.value.length === 1) return;
      const next = alreadySelected
        ? props.value.filter((current) => current !== type)
        : [...props.value, type];
      props.onValueChange(next);
      return;
    }
    props.onValueChange(type);
  };

  return (
    <View className="flex-row flex-wrap gap-3" testID={props.testID}>
      {EXERCISE_MEASUREMENT_TYPES.map((type) => {
        const selected = isSelected(type);
        return (
          <Pressable
            key={type}
            onPress={() => handlePress(type)}
            accessibilityRole={props.multiple ? 'checkbox' : 'radio'}
            accessibilityState={{ selected, checked: selected }}
            accessibilityLabel={t(`exercises.measurementType.${type}`)}
            className={cn(
              'h-20 w-[31%] items-center rounded-xl border border-border p-2',
              selected && 'border-primary bg-primary/5',
            )}
            testID={props.testID ? `${props.testID}.${type}` : undefined}
          >
            <View className="flex-1 items-center justify-center">
              <Icon
                as={MEASUREMENT_TYPE_ICONS[type]}
                size={24}
                className={selected ? 'text-primary' : 'text-muted-foreground'}
              />
            </View>
            <Text
              numberOfLines={2}
              className={cn(
                'text-center font-sans-medium text-xs',
                selected ? 'text-primary' : 'text-foreground',
              )}
            >
              {t(`exercises.measurementType.${type}`)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
