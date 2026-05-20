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
  className?: string;
};

/**
 * Labelled form field: a label, the control, and an optional error message.
 * Wraps any control passed as `children` and turns the label red when invalid.
 */
function Field({ label, children, error, className }: FieldProps) {
  return (
    <View className={cn('gap-2', className)}>
      <Label invalid={!!error} className="uppercase tracking-wider">
        {label}
      </Label>
      {children}
      {error ? <Text className="text-destructive text-sm">{error}</Text> : null}
    </View>
  );
}

export { Field, type FieldProps };
