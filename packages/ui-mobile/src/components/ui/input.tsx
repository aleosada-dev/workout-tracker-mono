import { cva, type VariantProps } from 'class-variance-authority';
import { Platform, TextInput } from 'react-native';
import { rgb, useTheme } from '../../lib/theme';
import { cn } from '../../lib/utils';

const inputVariants = cva(
  cn(
    'flex h-10 w-full min-w-0 flex-row items-center px-3 py-1 font-sans text-base text-foreground leading-5 sm:h-9',
    Platform.select({
      web: cn(
        'outline-none transition-[color,box-shadow] selection:bg-primary selection:text-primary-foreground placeholder:text-muted-foreground md:text-sm',
        'focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50',
        'aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40',
      ),
      native: 'placeholder:text-muted-foreground/50',
    }),
  ),
  {
    variants: {
      variant: {
        default: cn(
          'rounded-md border border-input bg-background shadow-black/5 shadow-sm dark:bg-input/30',
        ),
        'outline-primary': cn(
          'h-8 rounded-none border-0 border-primary border-b bg-transparent px-1 py-0 text-center text-sm leading-4 sm:h-8',
        ),
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

type InputProps = React.ComponentProps<typeof TextInput> &
  React.RefAttributes<TextInput> &
  VariantProps<typeof inputVariants> & { 'aria-invalid'?: boolean };

function Input({ className, variant, ...props }: InputProps) {
  const theme = useTheme();
  // Keep the caret/selection brand-colored on both platforms (iOS reads
  // selectionColor for the caret, Android reads cursorColor).
  const primary = rgb(theme.primary);

  return (
    <TextInput
      selectionColor={primary}
      cursorColor={primary}
      className={cn(
        inputVariants({ variant }),
        props.editable === false &&
          cn(
            'opacity-50',
            Platform.select({ web: 'disabled:pointer-events-none disabled:cursor-not-allowed' }),
          ),
        props['aria-invalid'] && Platform.select({ native: 'border-destructive' }),
        className,
      )}
      {...props}
    />
  );
}

export { Input, inputVariants };
