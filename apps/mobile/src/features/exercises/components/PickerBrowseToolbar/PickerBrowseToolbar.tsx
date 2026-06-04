import { Ionicons } from '@expo/vector-icons';
import { Button, Icon, rgb, Text, useTheme } from '@workout-tracker/ui-mobile';
import { Stack } from 'expo-router';
import { Plus } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { IconAction } from '@/features/shared/components/SelectionToolbar';
import type { PickerBrowseToolbarProps } from './types';

export function PickerBrowseToolbar({ headerAction, onCreateExercise }: PickerBrowseToolbarProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const theme = useTheme();

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
        <Pressable
          onPress={onCreateExercise}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel={t('exerciseListScreen.actions.createExercise')}
          className="h-12 flex-row items-center gap-2 rounded-full bg-primary px-5 active:opacity-90"
        >
          <Plus size={20} color={rgb(theme.primaryForeground)} />
          <Text className="font-sans-semibold text-primary-foreground">
            {t('exerciseListScreen.actions.createExercise')}
          </Text>
        </Pressable>
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
