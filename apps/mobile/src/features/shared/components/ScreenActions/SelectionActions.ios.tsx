import { Stack } from 'expo-router';
import type { SelectionActionsProps } from './types';

export function SelectionActions({ count, onCancel, onSelectAll, actions }: SelectionActionsProps) {
  const empty = count === 0;
  const leading = actions.filter((a) => !a.destructive);
  const trailing = actions.filter((a) => a.destructive);
  return (
    <>
      <Stack.Toolbar placement="left">
        <Stack.Toolbar.Button icon="xmark" onPress={onCancel}>
          Cancelar
        </Stack.Toolbar.Button>
      </Stack.Toolbar>
      {onSelectAll && (
        <Stack.Toolbar placement="right">
          <Stack.Toolbar.Button icon="checklist" onPress={onSelectAll}>
            Selecionar Todos
          </Stack.Toolbar.Button>
        </Stack.Toolbar>
      )}
      <Stack.Toolbar placement="bottom">
        {leading.map((a) => (
          <Stack.Toolbar.Button
            key={a.label}
            icon={a.iosIcon}
            onPress={a.onPress}
            disabled={empty || a.disabled}
          >
            {a.label}
          </Stack.Toolbar.Button>
        ))}
        {trailing.length > 0 && <Stack.Toolbar.Spacer />}
        {trailing.map((a) => (
          <Stack.Toolbar.Button
            key={a.label}
            icon={a.iosIcon}
            onPress={a.onPress}
            disabled={empty || a.disabled}
            tintColor="#FF3B30"
          >
            {a.label}
          </Stack.Toolbar.Button>
        ))}
      </Stack.Toolbar>
    </>
  );
}
