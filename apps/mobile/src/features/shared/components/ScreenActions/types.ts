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
  onSelectAll?: () => void;
  actions: IconAction[];
}
