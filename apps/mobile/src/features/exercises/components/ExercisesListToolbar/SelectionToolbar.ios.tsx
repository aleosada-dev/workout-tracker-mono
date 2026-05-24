import { Stack } from 'expo-router';
import type { SelectionToolbarProps } from './types';

export function SelectionToolbar({
  count,
  onCancel,
  allSelected,
  onToggleSelectAll,
  actions,
}: SelectionToolbarProps) {
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
