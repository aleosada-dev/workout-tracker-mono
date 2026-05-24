import { Button, Text } from '@workout-tracker/ui-mobile';
import { Stack } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { BrowseToolbarProps } from './types';

export function BrowseToolbar({ primary, overflow }: BrowseToolbarProps) {
  const insets = useSafeAreaInsets();

  return (
    <>
      {overflow && overflow.length > 0 && (
        <Stack.Toolbar placement="right">
          <Stack.Toolbar.Menu icon="ellipsis.circle" accessibilityLabel="Mais opções">
            {overflow.map((a) => (
              <Stack.Toolbar.MenuAction
                key={a.label}
                icon={a.iosIcon}
                onPress={a.onPress}
                destructive={a.destructive}
                disabled={a.disabled}
              >
                {a.label}
              </Stack.Toolbar.MenuAction>
            ))}
          </Stack.Toolbar.Menu>
        </Stack.Toolbar>
      )}

      <View
        className="border-border border-t bg-background px-4 pt-3"
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          paddingBottom: insets.bottom > 0 ? insets.bottom : 12,
        }}
      >
        <Button
          size="lg"
          disabled={primary.disabled}
          onPress={primary.onPress}
          accessibilityLabel={primary.label}
        >
          <SymbolView
            name={primary.iosIcon}
            size={20}
            tintColor="white"
            resizeMode="scaleAspectFit"
          />
          <Text className="font-sans-semibold text-base text-primary-foreground">
            {primary.label}
          </Text>
        </Button>
      </View>
    </>
  );
}
