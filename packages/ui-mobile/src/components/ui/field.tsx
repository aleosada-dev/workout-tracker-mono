import type { ReactNode } from 'react';
import { View } from 'react-native';
import { cn } from '../../lib/utils';
import { Label } from './label';
import { Text } from './text';

type FieldProps = {
  /** Visible label rendered above the control. */
  label: string;
  /** The form control (input, select, toggle group, …). */
  children: ReactNode;
  /** Validation message shown below the control when present. */
  error?: string;
  /** Optional element rendered next to the label, e.g. a help trigger. */
  labelAccessory?: ReactNode;
  className?: string;
};

/**
 * Labelled form field: a label, the control, and an optional error message.
 * Wraps any control passed as `children` and turns the label red when invalid.
 */
function Field({ label, children, error, labelAccessory, className }: FieldProps) {
  const labelNode = (
    <Label invalid={!!error} className="uppercase tracking-wider">
      {label}
    </Label>
  );

  return (
    <View className={cn('gap-2', className)}>
      {labelAccessory ? (
        <View className="flex-row items-center gap-1.5">
          {labelNode}
          {labelAccessory}
        </View>
      ) : (
        labelNode
      )}
      {children}
      {error ? <Text className="text-destructive text-sm">{error}</Text> : null}
    </View>
  );
}

export { Field, type FieldProps };
