import { useEffect, useState } from 'react';
import { View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { cn } from '../../lib/utils';
import { Text } from './text';

export type UploadProgressBarProps = {
  /** Determinate progress, 0 to 1. Values outside the range are clamped. Ignored when `indeterminate`. */
  progress: number;
  /**
   * Shows a looping animation instead of a 0–1 fill. Use it where the upload
   * cannot report progress — iOS does not emit XHR upload progress events for
   * streamed file bodies, so the percentage would never move.
   */
  indeterminate?: boolean;
  /** Optional caption shown above the bar (e.g. "Uploading video…"). */
  label?: string;
  className?: string;
  testID?: string;
};

/** Width of the moving segment in the indeterminate animation, as a fraction of the track. */
const INDETERMINATE_SEGMENT = 0.4;

/**
 * A thin, quiet progress bar with an optional label. Driven by a 0–1
 * `progress` value, or by a looping animation when `indeterminate`.
 */
export function UploadProgressBar({
  progress,
  indeterminate = false,
  label,
  className,
  testID,
}: UploadProgressBarProps) {
  const clamped = Math.min(1, Math.max(0, Number.isFinite(progress) ? progress : 0));
  const percent = Math.round(clamped * 100);

  return (
    <View
      className={cn('gap-1.5', className)}
      testID={testID}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityValue={indeterminate ? undefined : { min: 0, max: 100, now: percent }}
    >
      {label ? (
        <View className="flex-row items-center justify-between">
          <Text variant="muted">{label}</Text>
          {indeterminate ? null : <Text variant="muted">{percent}%</Text>}
        </View>
      ) : null}
      {indeterminate ? (
        <IndeterminateTrack />
      ) : (
        <View className="h-2 w-full overflow-hidden rounded-full bg-muted">
          <View className="h-full rounded-full bg-primary" style={{ width: `${percent}%` }} />
        </View>
      )}
    </View>
  );
}

/** Track with a segment that slides across on a loop — used when progress is unknown. */
function IndeterminateTrack() {
  const [trackWidth, setTrackWidth] = useState(0);
  const offset = useSharedValue(0);

  useEffect(() => {
    if (trackWidth === 0) return;
    // Start just off the left edge, then loop a slide to just off the right.
    offset.value = -trackWidth * INDETERMINATE_SEGMENT;
    offset.value = withRepeat(withTiming(trackWidth, { duration: 1100 }), -1, false);
  }, [trackWidth, offset]);

  const segmentStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: offset.value }],
  }));

  return (
    <View
      className="h-2 w-full overflow-hidden rounded-full bg-muted"
      onLayout={(event) => setTrackWidth(event.nativeEvent.layout.width)}
    >
      <Animated.View
        className="h-full rounded-full bg-primary"
        style={[{ width: `${INDETERMINATE_SEGMENT * 100}%` }, segmentStyle]}
      />
    </View>
  );
}
