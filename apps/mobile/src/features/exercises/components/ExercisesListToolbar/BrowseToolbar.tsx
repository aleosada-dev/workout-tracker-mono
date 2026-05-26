import { Ionicons } from '@expo/vector-icons';
import { Button, Icon, rgb, Text, useTheme } from '@workout-tracker/ui-mobile';
import { Stack } from 'expo-router';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { IconAction } from '@/features/shared/components/SelectionToolbar';
import type { BrowseToolbarProps } from './types';

export function BrowseToolbar({ primary, headerAction }: BrowseToolbarProps) {
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
        className="border-border border-t bg-background px-4 pt-3"
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          paddingBottom: Math.max(insets.bottom, 12),
        }}
      >
        <Button
          size="lg"
          disabled={primary.disabled}
          onPress={primary.onPress}
          accessibilityLabel={primary.label}
        >
          <Ionicons name={primary.androidIcon} size={20} color={rgb(theme.primaryForeground)} />
          <Text className="font-sans-semibold text-base text-primary-foreground">
            {primary.label}
          </Text>
        </Button>
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
