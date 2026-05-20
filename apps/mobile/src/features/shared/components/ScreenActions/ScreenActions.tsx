import { Ionicons } from '@expo/vector-icons';
import { Button, rgb, Text, useTheme } from '@workout-tracker/ui-mobile';
import { Stack } from 'expo-router';
import { useState } from 'react';
import {
  Modal,
  Pressable as RNPressable,
  Text as RNText,
  View as RNView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { IconAction, ScreenActionsProps } from './types';

export function ScreenActions({ primary, overflow }: ScreenActionsProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const hasOverflow = overflow && overflow.length > 0;

  return (
    <>
      <Stack.Screen
        options={{
          headerLeft: undefined,
          headerRight: hasOverflow
            ? () => (
                <Button
                  variant="ghost"
                  size="icon"
                  onPress={() => setMenuOpen(true)}
                  hitSlop={12}
                  accessibilityLabel="Mais opções"
                >
                  <Ionicons name="ellipsis-vertical" size={22} color={rgb(theme.foreground)} />
                </Button>
              )
            : undefined,
        }}
      />

      <View
        className="border-border border-t bg-background px-4 pt-3"
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          paddingBottom: Math.max(insets.bottom, 12),
        }}
      >
        <Button
          size="lg"
          disabled={primary.disabled}
          onPress={primary.onPress}
          accessibilityLabel={primary.label}
        >
          <Ionicons name={primary.androidIcon} size={20} color={rgb(theme.primaryForeground)} />
          <Text className="font-sans-semibold text-base text-primary-foreground">
            {primary.label}
          </Text>
        </Button>
      </View>

      {hasOverflow && (
        <DropdownMenu
          visible={menuOpen}
          onClose={() => setMenuOpen(false)}
          actions={overflow}
          topInset={insets.top}
        />
      )}
    </>
  );
}

interface DropdownProps {
  visible: boolean;
  onClose: () => void;
  actions: IconAction[];
  topInset: number;
}

function DropdownMenu({ visible, onClose, actions, topInset }: DropdownProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <RNPressable style={styles.backdrop} onPress={onClose}>
        <RNView style={[styles.menu, { top: topInset + 56 }]}>
          {actions.map((a, i) => (
            <RNPressable
              key={a.label}
              onPress={() => {
                onClose();
                a.onPress?.();
              }}
              disabled={a.disabled}
              android_ripple={{ color: '#262b2f' }}
              style={[
                styles.menuItem,
                i > 0 && styles.menuItemBorder,
                a.disabled && styles.menuItemDisabled,
              ]}
            >
              <RNView style={styles.menuItemRow}>
                <Ionicons
                  name={a.androidIcon}
                  size={20}
                  color={a.destructive ? '#ef4444' : '#f3f4f6'}
                  style={styles.menuIcon}
                />
                <RNText style={[styles.menuLabel, a.destructive && styles.menuLabelDestructive]}>
                  {a.label}
                </RNText>
              </RNView>
            </RNPressable>
          ))}
        </RNView>
      </RNPressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
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
  menuItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  menuItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuIcon: {
    marginRight: 14,
  },
  menuItemBorder: {
    borderTopWidth: 1,
    borderTopColor: '#2a2f33',
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
