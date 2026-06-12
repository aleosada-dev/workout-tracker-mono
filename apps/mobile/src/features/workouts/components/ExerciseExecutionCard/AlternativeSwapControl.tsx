import { Icon, Text } from '@workout-tracker/ui-mobile';
import { Repeat } from 'lucide-react-native';
import { useController, useFormContext } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Pressable } from 'react-native';
import type { ExecutionFormInput } from '@/features/workouts/lib/execution-form';

interface AlternativeSwapControlProps {
  exerciseIndex: number;
  principalName: string;
  alternativeName: string;
  iconOnly?: boolean;
  onChange?: (usingAlternative: boolean) => void;
}

export function AlternativeSwapControl({
  exerciseIndex,
  principalName,
  alternativeName,
  iconOnly = false,
  onChange,
}: AlternativeSwapControlProps) {
  const { t } = useTranslation();
  const { control } = useFormContext<ExecutionFormInput>();
  const { field } = useController({
    control,
    name: `exercises.${exerciseIndex}.usingAlternative`,
  });

  const usingAlternative = field.value ?? false;
  const label = usingAlternative
    ? `${t('workoutExecutionScreen.alternative.usePrincipal')} · ${principalName}`
    : `${t('workoutExecutionScreen.alternative.use')} · ${alternativeName}`;

  const toggle = () => {
    const next = !usingAlternative;
    field.onChange(next);
    onChange?.(next);
  };

  if (iconOnly) {
    return (
      <Pressable
        onPress={toggle}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 4 }}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ checked: usingAlternative }}
        testID={`workout-execution.exercise-${exerciseIndex}.swap-alternative`}
      >
        <Icon
          as={Repeat}
          size={18}
          className={usingAlternative ? 'text-primary' : 'text-muted-foreground'}
        />
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={toggle}
      accessibilityRole="button"
      accessibilityState={{ checked: usingAlternative }}
      className="flex-row items-center gap-1.5 self-start py-1"
      testID={`workout-execution.exercise-${exerciseIndex}.swap-alternative`}
    >
      <Icon as={Repeat} size={14} className="text-muted-foreground" />
      <Text variant="muted" className="text-sm" numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}
