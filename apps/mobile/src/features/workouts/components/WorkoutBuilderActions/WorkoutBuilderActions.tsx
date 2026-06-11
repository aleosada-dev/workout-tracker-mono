import { Button, rgb, Text, useTheme } from '@workout-tracker/ui-mobile';
import { Check, Plus } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavTheme } from '@/features/shared/lib/theme';
import type { WorkoutBuilderActionsProps } from './types';

export function WorkoutBuilderActions({
  onSave,
  onAddExercise,
  saving,
  canSave,
}: WorkoutBuilderActionsProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const navTheme = useNavTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      pointerEvents="box-none"
      className="absolute right-0 bottom-0 left-0 flex-row items-center gap-3 bg-transparent px-4 pt-3"
      style={{ paddingBottom: insets.bottom + 12 }}
    >
      <Button
        onPress={onSave}
        disabled={saving || !canSave}
        className="h-12 flex-1 rounded-full"
        testID="workout-form.save"
      >
        <Check size={20} color={rgb(theme.primaryForeground)} />
        <Text className="font-sans-semibold">{t('workoutFormScreen.actions.save')}</Text>
      </Button>
      <Pressable
        onPress={onAddExercise}
        hitSlop={12}
        accessibilityRole="button"
        accessibilityLabel={t('workoutExecutionScreen.actions.addExercise')}
        className="h-12 w-12 items-center justify-center rounded-full border border-border bg-background"
        testID="workout-form.add-exercise"
      >
        <Plus size={22} color={navTheme.colors.text} />
      </Pressable>
    </View>
  );
}
