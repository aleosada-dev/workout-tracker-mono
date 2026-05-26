import { Ionicons } from '@expo/vector-icons';
import { Button, rgb, Text, useTheme } from '@workout-tracker/ui-mobile';
import { Stack } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useEffect, useState } from 'react';
import { type ImageSourcePropType, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { BrowseToolbarProps } from './types';

export function BrowseToolbar({ primary, headerAction }: BrowseToolbarProps) {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const badge = headerAction?.badge ?? 0;
  const [iconSrc, setIconSrc] = useState<ImageSourcePropType | null>(null);

  useEffect(() => {
    if (!headerAction) return;
    let cancelled = false;
    Ionicons.getImageSource(headerAction.androidIcon, 22, rgb(theme.foreground)).then((src) => {
      if (!cancelled) setIconSrc(src);
    });
    return () => {
      cancelled = true;
    };
  }, [headerAction, theme.foreground]);

  return (
    <>
      {headerAction && (
        <Stack.Toolbar placement="right">
          <Stack.Toolbar.Button onPress={headerAction.onPress} disabled={headerAction.disabled}>
            {iconSrc ? (
              <Stack.Toolbar.Icon src={iconSrc} renderingMode="template" />
            ) : (
              <Stack.Toolbar.Icon sf={headerAction.iosIcon} />
            )}
            <Stack.Toolbar.Label>{headerAction.label}</Stack.Toolbar.Label>
            {badge > 0 && (
              <Stack.Toolbar.Badge
                style={{ backgroundColor: rgb(theme.primary), color: '#ffffff' }}
              >
                {String(badge)}
              </Stack.Toolbar.Badge>
            )}
          </Stack.Toolbar.Button>
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
