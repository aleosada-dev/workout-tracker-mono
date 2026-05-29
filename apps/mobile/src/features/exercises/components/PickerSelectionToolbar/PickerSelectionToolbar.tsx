import { Ionicons } from '@expo/vector-icons';
import { Button, Icon, rgb, Text, useTheme } from '@workout-tracker/ui-mobile';
import { Stack } from 'expo-router';
import { CheckCircle2, Circle } from 'lucide-react-native';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { PickerSelectionToolbarProps } from './types';

export function PickerSelectionToolbar({
  count,
  onCancel,
  allSelected,
  onToggleSelectAll,
  primary,
}: PickerSelectionToolbarProps) {
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
        className="absolute right-0 bottom-0 left-0 flex-row items-center gap-3 bg-transparent px-4 pt-3"
        style={{ paddingBottom: insets.bottom + 12 }}
      >
        <Button
          size="lg"
          disabled={empty}
          onPress={primary.onPress}
          accessibilityLabel={primary.label}
          className="h-12 flex-1 rounded-full"
        >
          <Ionicons name={primary.androidIcon} size={20} color={rgb(theme.primaryForeground)} />
          <Text className="font-sans-semibold text-base text-primary-foreground">
            {primary.label}
          </Text>
        </Button>
      </View>
    </>
  );
}
