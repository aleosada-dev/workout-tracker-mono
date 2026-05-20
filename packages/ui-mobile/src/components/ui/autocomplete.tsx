import { Portal } from '@rn-primitives/portal';
import { useCallback, useId, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, type TextInput, View } from 'react-native';
import Animated, { FadeOut, withTiming } from 'react-native-reanimated';
import { useDebouncedValue } from '../../hooks/use-debounced-value';
import { cn } from '../../lib/utils';
import { Input } from './input';
import { Text } from './text';

const DEBOUNCE_MS = 300;
const DEFAULT_MAX_OPTIONS = 5;
const DEFAULT_MIN_CHARS = 3;
// Gap between the input's bottom edge and the floating suggestion list.
const LIST_OFFSET = 4;

// Lowercase + strip diacritics so "abducao" matches "Abdução".
const normalize = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '');

/**
 * `entering` animation for the suggestion list: fades in while sliding down a
 * few pixels, so the list feels like it drops out of the input.
 */
function fadeSlideIn() {
  'worklet';
  const duration = 200;
  return {
    initialValues: { opacity: 0, transform: [{ translateY: -8 }] },
    animations: {
      opacity: withTiming(1, { duration }),
      transform: [{ translateY: withTiming(0, { duration }) }],
    },
  };
}

type Props = {
  value: string;
  onChangeText: (text: string) => void;
  /** Candidate values; the component filters and caps them for display. */
  options: string[];
  onSelect?: (option: string) => void;
  placeholder?: string;
  testID?: string;
  /** Max suggestions shown at once. */
  maxOptions?: number;
  /** Minimum typed characters before suggestions appear. */
  minChars?: number;
  /** Debounce applied to the text before filtering, in milliseconds. */
  debounceMs?: number;
  /** Animate the suggestion list when it opens (fade + slide) and closes (fade). */
  animated?: boolean;
  /**
   * Name of the `PortalHost` the suggestion list renders into. Pass a host that
   * is mounted inside the current screen (e.g. a modal) so the list shares the
   * screen's coordinate space — otherwise it falls back to the root host and may
   * be mispositioned or hidden behind a modal.
   */
  portalHost?: string;
};

/**
 * Generic, presentation-only autocomplete: a text input with a suggestion list
 * fed entirely by props. It owns the input, focus, debounced filtering and the
 * dropdown — it knows nothing about where `options` come from.
 *
 * The suggestion list floats in a portal directly below the input, with a
 * full-screen backdrop behind it: any tap outside the input and the list blurs
 * the field and dismisses the suggestions.
 */
export function Autocomplete({
  value,
  onChangeText,
  options,
  onSelect,
  placeholder,
  testID,
  maxOptions = DEFAULT_MAX_OPTIONS,
  minChars = DEFAULT_MIN_CHARS,
  debounceMs = DEBOUNCE_MS,
  animated = true,
  portalHost,
}: Props) {
  const [focused, setFocused] = useState(false);
  // The input's rect relative to the portal container; anchors the list.
  const [anchor, setAnchor] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const inputRef = useRef<TextInput>(null);
  const portalRef = useRef<View>(null);
  const portalName = useId();

  // Filter against a debounced copy of the text so a burst of keystrokes does
  // not refilter/rerender the list on every character.
  const debouncedQuery = useDebouncedValue(value, debounceMs);

  const matches = useMemo(() => {
    const query = normalize(debouncedQuery.trim());
    if (query.length < minChars) return [];
    return options
      .filter((option) => {
        const normalized = normalize(option);
        return normalized.includes(query) && normalized !== query;
      })
      .slice(0, maxOptions);
  }, [options, debouncedQuery, minChars, maxOptions]);

  const open = focused && matches.length > 0;

  // Position the list by measuring the input *relative to the portal container*:
  // both nodes are measured in window coordinates and subtracted, so the list
  // lines up with the input regardless of headers, modals or scroll offsets.
  const measureAnchor = useCallback(() => {
    const input = inputRef.current;
    const host = portalRef.current;
    if (!input || !host) return;
    input.measureInWindow?.((inputX, inputY, width, height) => {
      host.measureInWindow?.((hostX, hostY) => {
        setAnchor({ x: inputX - hostX, y: inputY - hostY, width, height });
      });
    });
  }, []);

  const close = useCallback(() => {
    setFocused(false);
    inputRef.current?.blur();
  }, []);

  const handleSelect = (option: string) => {
    onChangeText(option);
    onSelect?.(option);
    close();
  };

  return (
    <View>
      <Input
        ref={inputRef}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        testID={testID}
        onLayout={measureAnchor}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      />
      {open ? (
        <Portal name={portalName} hostName={portalHost}>
          <View ref={portalRef} onLayout={measureAnchor} style={StyleSheet.absoluteFill}>
            {/* Backdrop: any tap outside the input and the list dismisses it. */}
            <Pressable
              style={StyleSheet.absoluteFill}
              onPress={close}
              testID={testID ? `${testID}.backdrop` : undefined}
            />
            <Animated.View
              entering={animated ? fadeSlideIn : undefined}
              exiting={animated ? FadeOut.duration(150) : undefined}
              style={{
                position: 'absolute',
                top: anchor.y + anchor.height + LIST_OFFSET,
                left: anchor.x,
                width: anchor.width,
              }}
              className={cn(
                'overflow-hidden rounded-md border border-border bg-popover shadow-black/10 shadow-md',
              )}
              testID={testID ? `${testID}.suggestions` : undefined}
            >
              {matches.map((option) => (
                <Pressable
                  key={option}
                  onPress={() => handleSelect(option)}
                  accessibilityRole="button"
                  className="px-3 py-2.5 active:bg-accent"
                  testID={testID ? `${testID}.option.${option}` : undefined}
                >
                  <Text className="font-sans text-foreground text-sm">{option}</Text>
                </Pressable>
              ))}
            </Animated.View>
          </View>
        </Portal>
      ) : null}
    </View>
  );
}
