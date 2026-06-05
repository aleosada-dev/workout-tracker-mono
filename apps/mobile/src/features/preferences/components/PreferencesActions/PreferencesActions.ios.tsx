import { rgb, useTheme } from '@workout-tracker/ui-mobile';
import { Stack } from 'expo-router';
import type { PreferencesActionsProps } from './types';

export function PreferencesActions({ onSave, isPending, dirty }: PreferencesActionsProps) {
  const theme = useTheme();

  return (
    <Stack.Toolbar placement="bottom">
      <Stack.Toolbar.Spacer />
      <Stack.Toolbar.Button
        variant="prominent"
        tintColor={rgb(theme.primary)}
        onPress={onSave}
        disabled={isPending || !dirty}
      >
        <Stack.Toolbar.Icon sf="square.and.arrow.down" />
      </Stack.Toolbar.Button>
    </Stack.Toolbar>
  );
}
