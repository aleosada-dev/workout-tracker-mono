import { darkTheme, lightTheme, rgb } from '@workout-tracker/ui-mobile';
import * as SystemUI from 'expo-system-ui';
import { useColorScheme } from 'nativewind';
import { useEffect } from 'react';
import { themeMode$ } from './settings-store';

export function ThemeBridge() {
  const { colorScheme, setColorScheme } = useColorScheme();

  useEffect(() => {
    setColorScheme(themeMode$.get());
    return themeMode$.onChange(({ value }) => {
      setColorScheme(value);
    });
  }, [setColorScheme]);

  useEffect(() => {
    const t = colorScheme === 'dark' ? darkTheme : lightTheme;
    SystemUI.setBackgroundColorAsync(rgb(t.background));
  }, [colorScheme]);

  return null;
}
