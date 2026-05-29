import { Ionicons } from '@expo/vector-icons';
import {
  Button,
  Icon,
  Popover,
  PopoverClose,
  PopoverContent,
  PopoverTrigger,
  rgb,
  Text,
  useTheme,
} from '@workout-tracker/ui-mobile';
import { Stack } from 'expo-router';
import { Link2, MoreHorizontal, Plus } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import type { ColorValue } from 'react-native';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { IconAction } from '@/features/shared/components/SelectionToolbar';
import { useNavTheme } from '@/features/shared/lib/theme';
import type { PickerBrowseToolbarProps } from './types';

type IconComponent = React.ComponentType<{ size?: number; color?: ColorValue }>;

export function PickerBrowseToolbar({
  headerAction,
  onCreateExercise,
  onCreateSuperset,
}: PickerBrowseToolbarProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const navTheme = useNavTheme();

  return (
    <>
      <Stack.Screen
        options={{
          headerLeft: undefined,
          headerRight: headerAction
            ? () => <HeaderActionButton action={headerAction} />
            : undefined,
        }}
      />

      <View
        pointerEvents="box-none"
        className="absolute right-0 bottom-0 left-0 flex-row items-center justify-end bg-transparent px-4 pt-3"
        style={{ paddingBottom: insets.bottom + 12 }}
      >
        <Popover>
          <PopoverTrigger asChild>
            <Pressable
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel={t('exerciseListScreen.picker.actions.more')}
              className="h-12 w-12 items-center justify-center rounded-full border border-border bg-background"
            >
              <MoreHorizontal size={22} color={navTheme.colors.text} />
            </Pressable>
          </PopoverTrigger>
          <PopoverContent align="end" side="top" className="w-60 p-1">
            <MenuItem
              icon={Plus}
              label={t('exerciseListScreen.actions.createExercise')}
              onPress={onCreateExercise}
              color={navTheme.colors.text}
            />
            <MenuItem
              icon={Link2}
              label={t('exerciseListScreen.picker.actions.createSuperset')}
              onPress={onCreateSuperset}
              color={navTheme.colors.text}
            />
          </PopoverContent>
        </Popover>
      </View>
    </>
  );
}

function HeaderActionButton({ action }: { action: IconAction }) {
  const theme = useTheme();
  const showBadge = (action.badge ?? 0) > 0;
  return (
    <Button
      variant="ghost"
      size="icon"
      onPress={action.onPress}
      hitSlop={12}
      disabled={action.disabled}
      accessibilityLabel={action.label}
    >
      <View style={{ overflow: 'visible' }}>
        {action.lucideIcon ? (
          <Icon as={action.lucideIcon} size={22} className="text-foreground" />
        ) : (
          <Ionicons name={action.androidIcon} size={22} color={rgb(theme.foreground)} />
        )}
        {showBadge && <Badge count={action.badge ?? 0} />}
      </View>
    </Button>
  );
}

function Badge({ count }: { count: number }) {
  return (
    <View
      className="items-center justify-center rounded-full bg-primary"
      style={{
        position: 'absolute',
        top: -4,
        right: -4,
        minWidth: 14,
        height: 14,
        paddingHorizontal: 3,
      }}
    >
      <Text
        className="font-sans-semibold text-primary-foreground"
        style={{ fontSize: 10, lineHeight: 12 }}
      >
        {count}
      </Text>
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
