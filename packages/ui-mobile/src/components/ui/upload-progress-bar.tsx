import { View } from 'react-native';
import { cn } from '../../lib/utils';
import { Text } from './text';

export type UploadProgressBarProps = {
  /** Determinate progress, 0 to 1. Values outside the range are clamped. */
  progress: number;
  /** Optional caption shown above the bar (e.g. "Uploading video…"). */
  label?: string;
  className?: string;
  testID?: string;
};

/**
 * A thin, quiet progress bar with an optional label and percentage readout.
 * Driven by a 0–1 `progress` value — reusable for any determinate progress.
 */
export function UploadProgressBar({ progress, label, className, testID }: UploadProgressBarProps) {
  const clamped = Math.min(1, Math.max(0, Number.isFinite(progress) ? progress : 0));
  const percent = Math.round(clamped * 100);

  return (
    <View
      className={cn('gap-1.5', className)}
      testID={testID}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityValue={{ min: 0, max: 100, now: percent }}
    >
      {label ? (
        <View className="flex-row items-center justify-between">
          <Text variant="muted">{label}</Text>
          <Text variant="muted">{percent}%</Text>
        </View>
      ) : null}
      <View className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <View className="h-full rounded-full bg-primary" style={{ width: `${percent}%` }} />
      </View>
    </View>
  );
}
