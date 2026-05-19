import { Stack } from 'expo-router';
import { Fragment } from 'react';
import type { SelectionActionsProps } from './types';

export function SelectionActions({ count, onCancel, onSelectAll, actions }: SelectionActionsProps) {
  const empty = count === 0;
  return (
    <>
      <Stack.Toolbar placement="left">
        <Stack.Toolbar.Button onPress={onCancel}>Cancelar</Stack.Toolbar.Button>
      </Stack.Toolbar>
      {onSelectAll && (
        <Stack.Toolbar placement="right">
          <Stack.Toolbar.Button onPress={onSelectAll}>Selecionar Todos</Stack.Toolbar.Button>
        </Stack.Toolbar>
      )}
      <Stack.Toolbar placement="bottom">
        {actions.map((a, i) => (
          <Fragment key={a.label}>
            {i > 0 && <Stack.Toolbar.Spacer />}
            <Stack.Toolbar.Button
              icon={a.iosIcon}
              onPress={a.onPress}
              disabled={empty || a.disabled}
              tintColor={a.destructive ? '#FF3B30' : undefined}
            >
              {a.label}
            </Stack.Toolbar.Button>
          </Fragment>
        ))}
      </Stack.Toolbar>
    </>
  );
}
