import { cva, type VariantProps } from 'class-variance-authority';
import { View } from 'react-native';
import { cn } from '../../lib/utils';
import { Text, TextClassContext } from './text';

const cardVariants = cva('flex flex-col gap-6 rounded-xl border py-6 shadow-black/5 shadow-sm', {
  variants: {
    variant: {
      default: 'border-border bg-card',
      primary: 'border-transparent bg-primary',
    },
  },
  defaultVariants: {
    variant: 'default',
  },
});

const cardTextClass = {
  default: 'text-card-foreground',
  primary: 'text-primary-foreground',
} as const;

type CardProps = React.ComponentProps<typeof View> &
  React.RefAttributes<View> &
  VariantProps<typeof cardVariants>;

function Card({ className, variant, ...props }: CardProps) {
  return (
    <TextClassContext.Provider value={cardTextClass[variant ?? 'default']}>
      <View className={cn(cardVariants({ variant }), className)} {...props} />
    </TextClassContext.Provider>
  );
}

function CardHeader({
  className,
  ...props
}: React.ComponentProps<typeof View> & React.RefAttributes<View>) {
  return <View className={cn('flex flex-col gap-1.5 px-6', className)} {...props} />;
}

function CardTitle({
  className,
  ref,
  ...props
}: React.ComponentProps<typeof Text> & React.RefAttributes<typeof Text>) {
  return (
    <Text
      ref={ref}
      role="heading"
      aria-level={3}
      className={cn('font-sans-semibold leading-none', className)}
      {...props}
    />
  );
}

function CardDescription({
  className,
  ...props
}: React.ComponentProps<typeof Text> & React.RefAttributes<typeof Text>) {
  return <Text className={cn('text-muted-foreground text-sm', className)} {...props} />;
}

function CardContent({
  className,
  ...props
}: React.ComponentProps<typeof View> & React.RefAttributes<View>) {
  return <View className={cn('px-6', className)} {...props} />;
}

function CardFooter({
  className,
  ...props
}: React.ComponentProps<typeof View> & React.RefAttributes<View>) {
  return <View className={cn('flex flex-row items-center px-6', className)} {...props} />;
}

export type { CardProps };
export { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle, cardVariants };
