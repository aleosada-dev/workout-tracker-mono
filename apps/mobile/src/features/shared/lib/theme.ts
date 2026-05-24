import { darkTheme, lightTheme, rgb } from '@workout-tracker/ui-mobile';
import { DefaultTheme } from 'expo-router';
import { useColorScheme } from 'nativewind';

export function useNavTheme(): ReactNavigation.Theme {
  const { colorScheme } = useColorScheme();
  const t = colorScheme === 'dark' ? darkTheme : lightTheme;
  return {
    ...DefaultTheme,
    dark: colorScheme === 'dark',
    colors: {
      ...DefaultTheme.colors,
      primary: rgb(t.primary),
      background: rgb(t.background),
      card: rgb(t.background),
      text: rgb(t.foreground),
      border: rgb(t.border),
      notification: rgb(t.destructive),
    },
  };
}
