import { Slot } from '@rn-primitives/slot';
import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';
import { Platform, Text as RNText, type Role } from 'react-native';
import { cn } from '../../lib/utils';

const textVariants = cva(
  cn(
    'font-sans text-base',
    Platform.select({
      web: 'select-text',
    }),
  ),
  {
    variants: {
      variant: {
        default: '',
        h1: cn(
          'text-center font-sans-extrabold text-4xl tracking-tight',
          Platform.select({ web: 'scroll-m-20 text-balance' }),
        ),
        h2: cn(
          'border-border border-b pb-2 font-sans-semibold text-3xl tracking-tight',
          Platform.select({ web: 'scroll-m-20 first:mt-0' }),
        ),
        h3: cn(
          'font-sans-semibold text-2xl tracking-tight',
          Platform.select({ web: 'scroll-m-20' }),
        ),
        h4: cn(
          'font-sans-semibold text-xl tracking-tight',
          Platform.select({ web: 'scroll-m-20' }),
        ),
        h5: cn(
          'font-sans-semibold text-base uppercase tracking-wider',
          Platform.select({ web: 'scroll-m-20' }),
        ),
        p: 'mt-3 leading-7 sm:mt-6',
        blockquote: 'mt-4 border-l-2 pl-3 italic sm:mt-6 sm:pl-6',
        code: 'relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono-semibold text-sm',
        lead: 'text-muted-foreground text-xl',
        large: 'font-sans-semibold text-lg',
        small: 'font-sans-medium text-sm leading-none',
        muted: 'text-muted-foreground text-sm',
        caption: 'font-sans-medium text-[10px] text-muted-foreground uppercase tracking-wider',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

type TextVariantProps = VariantProps<typeof textVariants>;

type TextVariant = NonNullable<TextVariantProps['variant']>;

const ROLE: Partial<Record<TextVariant, Role>> = {
  h1: 'heading',
  h2: 'heading',
  h3: 'heading',
  h4: 'heading',
  h5: 'heading',
  blockquote: Platform.select({ web: 'blockquote' as Role }),
  code: Platform.select({ web: 'code' as Role }),
};

const ARIA_LEVEL: Partial<Record<TextVariant, string>> = {
  h1: '1',
  h2: '2',
  h3: '3',
  h4: '4',
  h5: '5',
};

const TextClassContext = React.createContext<string | undefined>('text-foreground');

function Text({
  className,
  asChild = false,
  variant = 'default',
  ...props
}: React.ComponentProps<typeof RNText> &
  React.RefAttributes<typeof RNText> &
  TextVariantProps & {
    asChild?: boolean;
  }) {
  const textClass = React.useContext(TextClassContext);
  const Component = asChild ? Slot : RNText;
  return (
    <Component
      className={cn(textClass, textVariants({ variant }), className)}
      role={variant ? ROLE[variant] : undefined}
      aria-level={variant ? ARIA_LEVEL[variant] : undefined}
      {...props}
    />
  );
}

export { Text, TextClassContext };
