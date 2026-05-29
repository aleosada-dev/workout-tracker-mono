import { rgb, useTheme } from '@workout-tracker/ui-mobile';
import { Stack } from 'expo-router';
import type { PickerSelectionToolbarProps } from './types';

export function PickerSelectionToolbar({
  count,
  onCancel,
  allSelected,
  onToggleSelectAll,
  primary,
}: PickerSelectionToolbarProps) {
  const theme = useTheme();
  const empty = count === 0;

  return (
    <>
      <Stack.Toolbar placement="left">
        <Stack.Toolbar.Button icon="xmark" onPress={onCancel}>
          Cancelar
        </Stack.Toolbar.Button>
      </Stack.Toolbar>
      {onToggleSelectAll && (
        <Stack.Toolbar placement="right">
          <Stack.Toolbar.Button
            icon={allSelected ? 'checkmark.circle.fill' : 'circle'}
            onPress={onToggleSelectAll}
          >
            {allSelected ? 'Limpar seleção' : 'Selecionar Todos'}
          </Stack.Toolbar.Button>
        </Stack.Toolbar>
      )}
      <Stack.Toolbar placement="bottom">
        <Stack.Toolbar.Spacer />
        <Stack.Toolbar.Button
          variant="prominent"
          tintColor={rgb(theme.primary)}
          onPress={primary.onPress}
          disabled={empty}
        >
          <Stack.Toolbar.Icon sf={primary.iosIcon} />
        </Stack.Toolbar.Button>
        <Stack.Toolbar.Spacer />
      </Stack.Toolbar>
    </>
  );
}
