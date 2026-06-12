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
  onChange?: (usingAlternative: boolean) => void;
}

export function AlternativeSwapControl({
  exerciseIndex,
  principalName,
  alternativeName,
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
