import * as PopoverPrimitive from '@rn-primitives/popover';
import { Check, ChevronDown } from 'lucide-react-native';
import * as React from 'react';
import {
  Platform,
  Pressable,
  ScrollView as RNScrollView,
  StyleSheet,
  View,
  type ViewProps,
} from 'react-native';
import { ScrollView as GHScrollView } from 'react-native-gesture-handler';
import { FadeIn, FadeOut } from 'react-native-reanimated';
import { FullWindowOverlay as RNFullWindowOverlay } from 'react-native-screens';
import { cn } from '../../lib/utils';

// On Android a plain RN ScrollView inside the popover overlay loses the JS
// responder negotiation and won't scroll; gesture-handler's ScrollView runs on
// RNGH's native gesture pipeline and scrolls correctly. iOS already scrolls
// with the RN ScrollView, and RNGH gestures don't reach inside the iOS
// FullWindowOverlay window — so keep the platform split.
const ScrollView = Platform.OS === 'android' ? GHScrollView : RNScrollView;

import { Icon } from './icon';
import { NativeOnlyAnimatedView } from './native-only-animated-view';
import { Text, TextClassContext } from './text';

type MultiSelectContextValue = {
  value: string[];
  toggle: (v: string) => void;
  isSelected: (v: string) => boolean;
  disabled?: boolean;
};

const MultiSelectContext = React.createContext<MultiSelectContextValue | null>(null);

function useMultiSelectContext(): MultiSelectContextValue {
  const ctx = React.useContext(MultiSelectContext);
  if (!ctx) {
    throw new Error('MultiSelect components must be used inside <MultiSelect>');
  }
  return ctx;
}

type MultiSelectProps = {
  value: string[];
  onValueChange: (next: string[]) => void;
  disabled?: boolean;
  onOpenChange?: (open: boolean) => void;
  children?: React.ReactNode;
};

function MultiSelect({ value, onValueChange, disabled, onOpenChange, children }: MultiSelectProps) {
  const toggle = React.useCallback(
    (v: string) => {
      if (disabled) return;
      const next = value.includes(v) ? value.filter((x) => x !== v) : [...value, v];
      onValueChange(next);
    },
    [value, onValueChange, disabled],
  );

  const isSelected = React.useCallback((v: string) => value.includes(v), [value]);

  const ctx = React.useMemo<MultiSelectContextValue>(
    () => ({ value, toggle, isSelected, disabled }),
    [value, toggle, isSelected, disabled],
  );

  return (
    <MultiSelectContext.Provider value={ctx}>
      <PopoverPrimitive.Root onOpenChange={onOpenChange}>{children}</PopoverPrimitive.Root>
    </MultiSelectContext.Provider>
  );
}

function MultiSelectTrigger({
  className,
  children,
  size = 'default',
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Trigger> & {
  children?: React.ReactNode;
  size?: 'default' | 'sm';
}) {
  const { disabled } = useMultiSelectContext();
  return (
    <PopoverPrimitive.Trigger
      disabled={disabled}
      className={cn(
        'flex h-10 flex-row items-center justify-between gap-2 rounded-md border border-input bg-background px-3 py-2 shadow-black/5 shadow-sm sm:h-9 dark:bg-input/30 dark:active:bg-input/50',
        disabled && 'opacity-50',
        size === 'sm' && 'h-8 py-2 sm:py-1.5',
        className,
      )}
      {...props}
    >
      {children}
      <Icon as={ChevronDown} aria-hidden={true} className="size-4 text-muted-foreground" />
    </PopoverPrimitive.Trigger>
  );
}

type MultiSelectValueProps = {
  placeholder?: string;
  labels?: Record<string, string>;
  multipleSelectedText?: string;
  className?: string;
};

function MultiSelectValue({
  placeholder,
  labels,
  multipleSelectedText,
  className,
}: MultiSelectValueProps) {
  const { value } = useMultiSelectContext();
  const isEmpty = value.length === 0;

  let text: string;
  if (value.length === 0) {
    text = placeholder ?? '';
  } else if (value.length === 1) {
    text = labels?.[value[0]] ?? value[0];
  } else {
    text = multipleSelectedText ?? `${value.length} selected`;
  }

  return (
    <Text
      numberOfLines={1}
      className={cn(
        'flex-1 font-sans text-foreground text-sm',
        isEmpty && 'text-muted-foreground',
        className,
      )}
    >
      {text}
    </Text>
  );
}

const FullWindowOverlay = Platform.OS === 'ios' ? RNFullWindowOverlay : React.Fragment;

function MultiSelectContent({
  className,
  children,
  maxHeight = 320,
  align = 'start',
  sideOffset = 4,
  portalHost,
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Content> & {
  className?: string;
  maxHeight?: number;
  portalHost?: string;
}) {
  const ctx = useMultiSelectContext();
  // On Android, a ScrollView inside the absolutely-positioned popover content
  // never gets a bounded viewport from `maxHeight` alone, so it expands to fit
  // all items and won't scroll. Measure the content and pin an explicit height.
  const [contentHeight, setContentHeight] = React.useState(maxHeight);
  return (
    <PopoverPrimitive.Portal hostName={portalHost}>
      <FullWindowOverlay>
        <PopoverPrimitive.Overlay style={StyleSheet.absoluteFill}>
          <NativeOnlyAnimatedView entering={FadeIn.duration(200)} exiting={FadeOut}>
            <MultiSelectContext.Provider value={ctx}>
              <TextClassContext.Provider value="text-popover-foreground">
                <PopoverPrimitive.Content
                  align={align}
                  sideOffset={sideOffset}
                  className={cn(
                    'z-50 w-72 overflow-hidden rounded-md border border-border bg-popover shadow-black/5 shadow-md outline-hidden',
                    className,
                  )}
                  {...props}
                >
                  <ScrollView
                    style={{ height: Math.min(contentHeight, maxHeight) }}
                    bounces={false}
                    showsVerticalScrollIndicator={true}
                    nestedScrollEnabled
                  >
                    <View
                      className="py-2"
                      onLayout={(e) => setContentHeight(e.nativeEvent.layout.height)}
                    >
                      {children}
                    </View>
                  </ScrollView>
                </PopoverPrimitive.Content>
              </TextClassContext.Provider>
            </MultiSelectContext.Provider>
          </NativeOnlyAnimatedView>
        </PopoverPrimitive.Overlay>
      </FullWindowOverlay>
    </PopoverPrimitive.Portal>
  );
}

function MultiSelectGroup({ className, children, ...props }: ViewProps) {
  return (
    <View className={cn('', className)} {...props}>
      {children}
    </View>
  );
}

function MultiSelectLabel({
  className,
  children,
  ...props
}: ViewProps & { children: React.ReactNode }) {
  return (
    <View className={cn('px-3 pt-3 pb-1', className)} {...props}>
      <Text variant="caption" className="text-xs">
        {children}
      </Text>
    </View>
  );
}

type MultiSelectItemProps = {
  value: string;
  indent?: 0 | 1;
  disabled?: boolean;
  className?: string;
  children?: React.ReactNode;
};

function MultiSelectItem({
  value,
  indent = 0,
  disabled,
  className,
  children,
}: MultiSelectItemProps) {
  const { toggle, isSelected, disabled: parentDisabled } = useMultiSelectContext();
  const selected = isSelected(value);
  const isDisabled = disabled || parentDisabled;

  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected, disabled: isDisabled }}
      onPress={() => toggle(value)}
      disabled={isDisabled}
      className={cn(
        'flex-row items-center justify-between gap-2 py-2 pr-3 active:bg-accent',
        indent === 0 ? 'pl-3' : 'pl-9',
        isDisabled && 'opacity-50',
        className,
      )}
    >
      <Text className="flex-1 font-sans text-popover-foreground text-sm">{children}</Text>
      <Icon
        as={Check}
        className={cn('size-4 text-foreground', !selected && 'opacity-0')}
        aria-hidden={!selected}
      />
    </Pressable>
  );
}

export {
  MultiSelect,
  MultiSelectContent,
  MultiSelectGroup,
  MultiSelectItem,
  MultiSelectLabel,
  MultiSelectTrigger,
  MultiSelectValue,
};
