import {
  Button,
  Popover,
  PopoverClose,
  PopoverContent,
  PopoverTrigger,
  rgb,
  Text,
  useTheme,
} from '@workout-tracker/ui-mobile';
import { Calculator, Check, MoreHorizontal, Plus, StickyNote, Timer } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import type { ColorValue } from 'react-native';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavTheme } from '@/features/shared/lib/theme';
import type { WorkoutExecutionActionsProps } from './types';

type IconComponent = React.ComponentType<{ size?: number; color?: ColorValue }>;

export function WorkoutExecutionActions({
  onFinish,
  onTimer,
  onNotes,
  onAddExercise,
  onKgLbsCalculator,
}: WorkoutExecutionActionsProps) {
  const { t } = useTranslation();
  const navTheme = useNavTheme();
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      pointerEvents="box-none"
      className="absolute right-0 bottom-0 left-0 flex-row items-center gap-3 bg-transparent px-4 pt-3"
      style={{ paddingBottom: insets.bottom + 12 }}
    >
      <Button onPress={onFinish} className="h-12 flex-1 rounded-full">
        <Check size={20} color={rgb(theme.primaryForeground)} />
        <Text className="font-sans-semibold">{t('workoutExecutionScreen.actions.finish')}</Text>
      </Button>
      <Popover>
        <PopoverTrigger asChild>
          <Pressable
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel={t('workoutExecutionScreen.actions.more')}
            className="h-12 w-12 items-center justify-center rounded-full border border-border bg-background"
          >
            <MoreHorizontal size={22} color={navTheme.colors.text} />
          </Pressable>
        </PopoverTrigger>
        <PopoverContent align="end" side="top" className="w-60 p-1">
          <MenuItem
            icon={Timer}
            label={t('workoutExecutionScreen.actions.timer')}
            onPress={onTimer}
            color={navTheme.colors.text}
          />
          <MenuItem
            icon={StickyNote}
            label={t('workoutExecutionScreen.actions.notes')}
            onPress={onNotes}
            color={navTheme.colors.text}
          />
          <MenuItem
            icon={Plus}
            label={t('workoutExecutionScreen.actions.addExercise')}
            onPress={onAddExercise}
            color={navTheme.colors.text}
          />
          <MenuItem
            icon={Calculator}
            label={t('workoutExecutionScreen.actions.kgLbsCalculator')}
            onPress={onKgLbsCalculator}
            color={navTheme.colors.text}
          />
        </PopoverContent>
      </Popover>
    </View>
  );
}

function MenuItem({
  icon: Icon,
  label,
  onPress,
  color,
}: {
  icon: IconComponent;
  label: string;
  onPress: () => void;
  color: ColorValue;
}) {
  return (
    <PopoverClose asChild>
      <Pressable
        onPress={onPress}
        className="flex-row items-center gap-3 rounded-md px-3 py-2.5 active:bg-accent"
      >
        <Icon size={18} color={color} />
        <Text className="text-sm">{label}</Text>
      </Pressable>
    </PopoverClose>
  );
}
