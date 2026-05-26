import { darkTheme, lightTheme, rgb } from '@workout-tracker/ui-mobile';
import * as SystemUI from 'expo-system-ui';
import { colorScheme as nwColorScheme, useColorScheme } from 'nativewind';
import { useEffect } from 'react';
import { themeMode$ } from './settings-store';

nwColorScheme.set(themeMode$.get());
themeMode$.onChange(({ value }) => {
  nwColorScheme.set(value);
});

export function ThemeBridge() {
  const { colorScheme } = useColorScheme();

  useEffect(() => {
    const t = colorScheme === 'dark' ? darkTheme : lightTheme;
    SystemUI.setBackgroundColorAsync(rgb(t.background));
  }, [colorScheme]);

  return null;
}
