import * as TabsPrimitive from '@rn-primitives/tabs';
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { type LayoutChangeEvent, Platform } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { cn } from '../../lib/utils';
import { TextClassContext } from './text';

type TabsVariant = 'segmented' | 'outline';

const TabsVariantContext = createContext<TabsVariant>('segmented');

type OutlineRegister = (value: string, layout: { x: number; width: number }) => void;
const TabsOutlineContext = createContext<OutlineRegister | null>(null);

function Tabs({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return <TabsPrimitive.Root className={cn('flex flex-col gap-2', className)} {...props} />;
}

type TabsListProps = React.ComponentProps<typeof TabsPrimitive.List> & {
  variant?: TabsVariant;
};

function TabsList({ className, variant = 'segmented', children, ...props }: TabsListProps) {
  if (variant === 'outline') {
    return (
      <TabsVariantContext.Provider value={variant}>
        <OutlineTabsList className={className} {...props}>
          {children}
        </OutlineTabsList>
      </TabsVariantContext.Provider>
    );
  }

  return (
    <TabsVariantContext.Provider value={variant}>
      <TabsPrimitive.List
        className={cn(
          'flex h-9 flex-row items-center justify-center rounded-lg bg-muted p-[3px]',
          Platform.select({ web: 'inline-flex w-fit', native: 'mr-auto' }),
          className,
        )}
        {...props}
      >
        {children}
      </TabsPrimitive.List>
    </TabsVariantContext.Provider>
  );
}

function OutlineTabsList({
  className,
  children,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List>) {
  const { value } = TabsPrimitive.useRootContext();
  const layouts = useRef(new Map<string, { x: number; width: number }>()).current;
  const [version, setVersion] = useState(0);
  const x = useSharedValue(0);
  const w = useSharedValue(0);
  const initialized = useRef(false);

  const register = useCallback<OutlineRegister>(
    (v, layout) => {
      const prev = layouts.get(v);
      if (prev && prev.x === layout.x && prev.width === layout.width) return;
      layouts.set(v, layout);
      setVersion((n) => n + 1);
    },
    [layouts],
  );

  // biome-ignore lint/correctness/useExhaustiveDependencies: version forces re-run when layouts (ref) mutates
  useEffect(() => {
    const layout = value ? layouts.get(value) : undefined;
    if (!layout) return;
    if (!initialized.current) {
      x.value = layout.x;
      w.value = layout.width;
      initialized.current = true;
    } else {
      x.value = withTiming(layout.x, { duration: 220 });
      w.value = withTiming(layout.width, { duration: 220 });
    }
  }, [value, version, layouts, x, w]);

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value }],
    width: w.value,
  }));

  return (
    <TabsOutlineContext.Provider value={register}>
      <TabsPrimitive.List
        className={cn('relative flex h-11 flex-row items-center border-border border-b', className)}
        {...props}
      >
        {children}
        <Animated.View
          pointerEvents="none"
          className="absolute -bottom-px left-0 h-0.5 bg-foreground"
          style={indicatorStyle}
        />
      </TabsPrimitive.List>
    </TabsOutlineContext.Provider>
  );
}

function TabsTrigger({
  className,
  onLayout,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  const { value } = TabsPrimitive.useRootContext();
  const variant = useContext(TabsVariantContext);
  const register = useContext(TabsOutlineContext);
  const isActive = props.value === value;

  if (variant === 'outline') {
    const handleLayout = (event: LayoutChangeEvent) => {
      const { x, width } = event.nativeEvent.layout;
      register?.(String(props.value), { x, width });
      onLayout?.(event);
    };
    return (
      <TextClassContext.Provider
        value={cn(
          'font-sans-medium text-muted-foreground text-sm',
          isActive && 'font-sans-semibold text-foreground',
        )}
      >
        <TabsPrimitive.Trigger
          onLayout={handleLayout}
          className={cn(
            'flex h-full flex-row items-center justify-center gap-1.5 px-2',
            Platform.select({
              web: 'inline-flex cursor-default whitespace-nowrap focus-visible:outline-none disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:shrink-0',
            }),
            props.disabled && 'opacity-50',
            className,
          )}
          {...props}
        />
      </TextClassContext.Provider>
    );
  }

  return (
    <TextClassContext.Provider
      value={cn(
        'font-sans-medium text-foreground text-sm dark:text-muted-foreground',
        isActive && 'dark:text-foreground',
      )}
    >
      <TabsPrimitive.Trigger
        onLayout={onLayout}
        className={cn(
          'flex h-[calc(100%-1px)] flex-row items-center justify-center gap-1.5 rounded-md border border-transparent px-2 py-1 shadow-black/5 shadow-none',
          Platform.select({
            web: 'inline-flex cursor-default whitespace-nowrap transition-[color,box-shadow] focus-visible:border-ring focus-visible:outline-1 focus-visible:outline-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:shrink-0',
          }),
          props.disabled && 'opacity-50',
          isActive && 'bg-background dark:border-foreground/10 dark:bg-input/30',
          className,
        )}
        {...props}
      />
    </TextClassContext.Provider>
  );
}

function TabsContent({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      className={cn(Platform.select({ web: 'flex-1 outline-none' }), className)}
      {...props}
    />
  );
}

export { Tabs, TabsContent, TabsList, TabsTrigger };
