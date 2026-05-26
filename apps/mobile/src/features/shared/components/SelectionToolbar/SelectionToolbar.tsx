import { Ionicons } from '@expo/vector-icons';
import { Button, Icon, rgb, Text, useTheme } from '@workout-tracker/ui-mobile';
import { Stack } from 'expo-router';
import { CheckCircle2, Circle } from 'lucide-react-native';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { IconAction, SelectionToolbarProps } from './types';

export function SelectionToolbar({
  count,
  onCancel,
  allSelected,
  onToggleSelectAll,
  actions,
}: SelectionToolbarProps) {
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
          headerRight: () =>
            onToggleSelectAll ? (
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
            ) : null,
        }}
      />

      <View
        pointerEvents="box-none"
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          paddingBottom: Math.max(insets.bottom, 8),
          alignItems: 'center',
        }}
      >
        <View className="mx-4 flex-row items-stretch rounded-2xl border border-border bg-background/85 px-2 py-2 shadow-lg">
          {actions.map((a) => (
            <ToolbarButton key={a.label} action={a} disabled={empty || !!a.disabled} />
          ))}
        </View>
      </View>
    </>
  );
}

function ToolbarButton({ action, disabled }: { action: IconAction; disabled: boolean }) {
  const theme = useTheme();
  const color = action.destructive ? '#ef4444' : rgb(theme.foreground);
  return (
    <Pressable
      onPress={action.onPress}
      disabled={disabled}
      accessibilityLabel={action.label}
      android_ripple={{ color: 'rgba(255,255,255,0.08)', borderless: false }}
      className="min-w-20 flex-1 items-center justify-center rounded-xl px-3 py-2"
      style={{ opacity: disabled ? 0.4 : 1 }}
    >
      <Ionicons name={action.androidIcon} size={22} color={color} />
      <Text variant="small" style={{ color, marginTop: 2 }} numberOfLines={1}>
        {action.label}
      </Text>
    </Pressable>
  );
}
