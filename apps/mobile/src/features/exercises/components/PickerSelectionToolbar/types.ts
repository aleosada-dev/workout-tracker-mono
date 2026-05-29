import type { Ionicons } from '@expo/vector-icons';
import type { SFSymbol } from 'expo-symbols';

export interface PickerPrimaryAction {
  label: string;
  iosIcon: SFSymbol;
  androidIcon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
}

export interface PickerSelectionToolbarProps {
  count: number;
  onCancel: () => void;
  allSelected?: boolean;
  onToggleSelectAll?: () => void;
  primary: PickerPrimaryAction;
}
