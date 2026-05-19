import { cva, type VariantProps } from 'class-variance-authority';
import { type LucideIcon, X } from 'lucide-react-native';
import type * as React from 'react';
import { Pressable, View } from 'react-native';
import { cn } from '../../lib/utils';
import { Icon } from './icon';
import { Text, TextClassContext } from './text';

const alertVariants = cva('w-full flex-row items-start gap-3 rounded-lg border px-3 py-2.5', {
  variants: {
    variant: {
      default: 'border-border bg-background',
      destructive: 'border-destructive/30 bg-destructive/10',
      warning: 'border-warning/40 bg-warning/10',
    },
  },
  defaultVariants: { variant: 'default' },
});

const ALERT_TEXT_COLOR = {
  default: 'text-foreground',
  destructive: 'text-destructive',
  warning: 'text-warning',
} as const;

type AlertVariant = NonNullable<VariantProps<typeof alertVariants>['variant']>;

type AlertProps = React.ComponentProps<typeof View> & {
  variant?: AlertVariant;
  icon?: LucideIcon;
  onDismiss?: () => void;
  dismissAccessibilityLabel?: string;
};

function Alert({
  className,
  variant = 'default',
  icon,
  onDismiss,
  dismissAccessibilityLabel,
  children,
  ...props
}: AlertProps) {
  const textColor = ALERT_TEXT_COLOR[variant];
  return (
    <TextClassContext.Provider value={textColor}>
      <View
        accessibilityRole="alert"
        className={cn(alertVariants({ variant }), className)}
        {...props}
      >
        {icon ? <Icon as={icon} className={cn('mt-0.5 size-4 shrink-0', textColor)} /> : null}
        <View className="flex-1 gap-0.5">{children}</View>
        {onDismiss ? (
          <Pressable
            onPress={onDismiss}
            accessibilityRole="button"
            accessibilityLabel={dismissAccessibilityLabel}
            hitSlop={8}
            className="-mt-1 -mr-1 p-1"
          >
            <Icon as={X} className={cn('size-4', textColor)} />
          </Pressable>
        ) : null}
      </View>
    </TextClassContext.Provider>
  );
}

function AlertTitle({ className, ...props }: React.ComponentProps<typeof Text>) {
  return <Text className={cn('font-sans-semibold text-sm leading-tight', className)} {...props} />;
}

function AlertDescription({ className, ...props }: React.ComponentProps<typeof Text>) {
  return <Text className={cn('text-sm leading-snug', className)} {...props} />;
}

export type { AlertProps, AlertVariant };
export { Alert, AlertDescription, AlertTitle, alertVariants };
