import { Ionicons } from '@expo/vector-icons';
import { Button, Icon, rgb, useTheme } from '@workout-tracker/ui-mobile';
import { Stack } from 'expo-router';
import { CheckCircle2, Circle } from 'lucide-react-native';
import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { IconAction, SelectionActionsProps } from './types';

export function SelectionActions({
  count,
  onCancel,
  allSelected,
  onToggleSelectAll,
  actions,
}: SelectionActionsProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const empty = count === 0;
  const headerIconColor = rgb(theme.foreground);

  return (
    <>
      <Stack.Screen
        options={{
          headerLeft: () => (
            <Button
              variant="ghost"
              size="icon"
              onPress={onCancel}
              hitSlop={12}
              accessibilityLabel="Cancelar"
            >
              <Ionicons name="close" size={24} color={headerIconColor} />
            </Button>
          ),
          headerRight: () => (
            <View style={styles.headerRight}>
              {onToggleSelectAll && (
                <Button
                  variant="ghost"
                  size="icon"
                  onPress={onToggleSelectAll}
                  hitSlop={12}
                  accessibilityLabel={allSelected ? 'Limpar seleção' : 'Selecionar Todos'}
                >
                  <Icon
                    as={allSelected ? CheckCircle2 : Circle}
                    size={22}
                    className={allSelected ? 'text-primary' : 'text-foreground'}
                  />
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                onPress={() => setMenuOpen(true)}
                hitSlop={12}
                disabled={empty}
                accessibilityLabel="Mais opções"
              >
                <Ionicons name="ellipsis-vertical" size={22} color={headerIconColor} />
              </Button>
            </View>
          ),
        }}
      />

      <Modal
        visible={menuOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuOpen(false)}
      >
        <Pressable style={styles.backdrop} onPress={() => setMenuOpen(false)}>
          <View style={[styles.menu, { top: insets.top + 56 }]}>
            {actions.map((a, i) => (
              <MenuItem
                key={a.label}
                action={a}
                first={i === 0}
                onPick={() => {
                  setMenuOpen(false);
                  a.onPress?.();
                }}
              />
            ))}
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

function MenuItem({
  action,
  first,
  onPick,
}: {
  action: IconAction;
  first: boolean;
  onPick: () => void;
}) {
  return (
    <Pressable
      onPress={onPick}
      disabled={action.disabled}
      style={({ pressed }) => [
        !first && styles.menuItemBorder,
        pressed && styles.menuItemPressed,
        action.disabled && styles.menuItemDisabled,
      ]}
    >
      <View style={styles.menuItemRow}>
        <Ionicons
          name={action.androidIcon}
          size={20}
          color={action.destructive ? '#ef4444' : '#f3f4f6'}
        />
        <Text style={[styles.menuLabel, action.destructive && styles.menuLabelDestructive]}>
          {action.label}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  headerRight: {
    flexDirection: 'row',
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  menu: {
    position: 'absolute',
    right: 8,
    minWidth: 220,
    backgroundColor: '#1f2326',
    borderRadius: 8,
    paddingVertical: 6,
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
  },
  menuItemRow: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  menuItemBorder: {
    borderTopWidth: 1,
    borderTopColor: '#2a2f33',
  },
  menuItemPressed: {
    backgroundColor: '#262b2f',
  },
  menuItemDisabled: {
    opacity: 0.4,
  },
  menuLabel: {
    color: '#f3f4f6',
    fontSize: 15,
    fontWeight: '500',
  },
  menuLabelDestructive: {
    color: '#ef4444',
  },
});
