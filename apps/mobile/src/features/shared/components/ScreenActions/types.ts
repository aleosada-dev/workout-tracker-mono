import type { Ionicons } from '@expo/vector-icons';
import type { SFSymbol } from 'sf-symbols-typescript';

export interface IconAction {
  iosIcon: SFSymbol;
  androidIcon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress?: () => void;
  disabled?: boolean;
  destructive?: boolean;
}

export interface ScreenActionsProps {
  primary: IconAction;
  overflow?: IconAction[];
}

export interface SelectionActionsProps {
  count: number;
  onCancel: () => void;
  /** Whether every selectable item is currently selected — drives the toggle icon. */
  allSelected?: boolean;
  /** Toggles between selecting all items and clearing the selection. */
  onToggleSelectAll?: () => void;
  actions: IconAction[];
}
