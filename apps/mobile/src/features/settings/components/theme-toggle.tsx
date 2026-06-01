import { useValue } from '@legendapp/state/react';
import { Icon, Text } from '@workout-tracker/ui-mobile';
import { type LucideIcon, Monitor, Moon, Sun } from 'lucide-react-native';
import { useState } from 'react';
import { type LayoutChangeEvent, Pressable, StyleSheet, useColorScheme, View } from 'react-native';
import Animated, { useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { setThemeMode, type ThemeMode, themeMode$ } from '@/features/settings/state/settings-store';

const OPTIONS: { mode: ThemeMode; icon: LucideIcon; label: string }[] = [
  { mode: 'system', icon: Monitor, label: 'Sistema' },
  { mode: 'light', icon: Sun, label: 'Light' },
  { mode: 'dark', icon: Moon, label: 'Dark' },
];

const ANIMATION_DURATION = 220;

type Layout = { x: number; y: number; width: number; height: number };

type ThemeToggleProps = {
  showSystemOption?: boolean;
  showOptionLabels?: boolean;
};

export function ThemeToggle({
  showSystemOption = true,
  showOptionLabels = true,
}: ThemeToggleProps = {}) {
  const current = useValue(themeMode$);
  const systemScheme = useColorScheme();
  const [layouts, setLayouts] = useState<Partial<Record<ThemeMode, Layout>>>({});

  const options = showSystemOption ? OPTIONS : OPTIONS.filter((o) => o.mode !== 'system');
  const effectiveMode: ThemeMode =
    current === 'system' && !showSystemOption
      ? systemScheme === 'dark'
        ? 'dark'
        : 'light'
      : current;

  const target = layouts[effectiveMode];

  const indicatorStyle = useAnimatedStyle(() => {
    if (!target) {
      return { opacity: 0 };
    }
    return {
      opacity: 1,
      width: withTiming(target.width, { duration: ANIMATION_DURATION }),
      transform: [{ translateX: withTiming(target.x, { duration: ANIMATION_DURATION }) }],
    };
  });

  const handleLayout = (mode: ThemeMode) => (e: LayoutChangeEvent) => {
    const { x, y, width, height } = e.nativeEvent.layout;
    setLayouts((prev) => {
      const cur = prev[mode];
      if (cur && cur.x === x && cur.y === y && cur.width === width && cur.height === height) {
        return prev;
      }
      return { ...prev, [mode]: { x, y, width, height } };
    });
  };

  return (
    <View className="w-full rounded-full border border-border bg-card p-1">
      <View className="relative flex-row gap-1">
        <Animated.View
          pointerEvents="none"
          style={[{ position: 'absolute', top: 0, bottom: 0, left: 0 }, indicatorStyle]}
          className="rounded-full bg-primary"
        />
        {options.map(({ mode, icon, label }) => (
          <ThemeOption
            key={mode}
            mode={mode}
            icon={icon}
            label={label}
            isActive={effectiveMode === mode}
            showLabel={showOptionLabels}
            onLayout={handleLayout(mode)}
          />
        ))}
      </View>
    </View>
  );
}

type ThemeOptionProps = {
  mode: ThemeMode;
  icon: LucideIcon;
  label: string;
  isActive: boolean;
  showLabel: boolean;
  onLayout: (e: LayoutChangeEvent) => void;
};

function ThemeOption({ mode, icon, label, isActive, showLabel, onLayout }: ThemeOptionProps) {
  const overlayStyle = useAnimatedStyle(() => ({
    opacity: withTiming(isActive ? 1 : 0, { duration: ANIMATION_DURATION }),
  }));

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: isActive }}
      onLayout={onLayout}
      onPress={() => setThemeMode(mode)}
      className={`flex-1 flex-row items-center justify-center rounded-full px-3 py-2 ${showLabel ? 'gap-2' : ''}`}
    >
      <View>
        <Icon as={icon} size={16} className="text-foreground" />
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, overlayStyle]}>
          <Icon as={icon} size={16} className="text-primary-foreground" />
        </Animated.View>
      </View>
      {showLabel && (
        <View>
          <Text variant="small" className="text-foreground">
            {label}
          </Text>
          <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, overlayStyle]}>
            <Text variant="small" className="text-primary-foreground">
              {label}
            </Text>
          </Animated.View>
        </View>
      )}
    </Pressable>
  );
}
