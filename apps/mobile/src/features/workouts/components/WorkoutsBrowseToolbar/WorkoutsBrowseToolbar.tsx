import { rgb, Text, useTheme } from '@workout-tracker/ui-mobile';
import { Plus } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { WorkoutsBrowseToolbarProps } from './types';

export function WorkoutsBrowseToolbar({ onCreateWorkout }: WorkoutsBrowseToolbarProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const theme = useTheme();

  return (
    <View
      pointerEvents="box-none"
      className="absolute right-0 bottom-0 left-0 flex-row items-center bg-transparent px-4 pt-3"
      style={{ paddingBottom: insets.bottom + 12 }}
    >
      <Pressable
        onPress={onCreateWorkout}
        hitSlop={12}
        accessibilityRole="button"
        accessibilityLabel={t('workoutFormScreen.createTitle')}
        className="h-12 flex-1 flex-row items-center justify-center gap-2 rounded-full bg-primary px-5 active:opacity-90"
        testID="workouts-browse-toolbar.create"
      >
        <Plus size={20} color={rgb(theme.primaryForeground)} />
        <Text className="font-sans-semibold text-primary-foreground">
          {t('workoutFormScreen.createTitle')}
        </Text>
      </Pressable>
    </View>
  );
}
