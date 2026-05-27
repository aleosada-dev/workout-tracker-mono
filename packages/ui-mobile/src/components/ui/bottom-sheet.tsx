import {
  BottomSheetBackdrop,
  type BottomSheetBackdropProps,
  BottomSheetModal,
  type BottomSheetModalProps,
  BottomSheetScrollView as GorhomBottomSheetScrollView,
  BottomSheetTextInput as GorhomBottomSheetTextInput,
  BottomSheetView as GorhomBottomSheetView,
} from '@gorhom/bottom-sheet';
import { type ComponentProps, type Ref, useCallback } from 'react';
import { Platform, type TextInput, View, type ViewProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { rgb, useTheme } from '../../lib/theme';
import { cn } from '../../lib/utils';
import { Text } from './text';

export type BottomSheetRef = BottomSheetModal;

type BottomSheetProps = Omit<BottomSheetModalProps, 'backgroundStyle' | 'handleIndicatorStyle'> & {
  ref?: Ref<BottomSheetModal>;
};

function BottomSheet({ children, enableDynamicSizing = true, ref, ...props }: BottomSheetProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  const renderBackdrop = useCallback(
    (backdropProps: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...backdropProps}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        pressBehavior="close"
      />
    ),
    [],
  );

  return (
    <BottomSheetModal
      ref={ref}
      enableDynamicSizing={enableDynamicSizing}
      keyboardBehavior="interactive"
      keyboardBlurBehavior="restore"
      android_keyboardInputMode="adjustPan"
      bottomInset={insets.bottom}
      backdropComponent={renderBackdrop}
      backgroundStyle={{ backgroundColor: rgb(theme.background) }}
      handleIndicatorStyle={{ backgroundColor: rgb(theme.mutedForeground, 0.6) }}
      {...props}
    >
      {children}
    </BottomSheetModal>
  );
}

function BottomSheetHeader({ title, className, ...props }: ViewProps & { title: string }) {
  return (
    <View className={cn('border-border border-b px-4 pt-2 pb-3', className)} {...props}>
      <Text className="font-sans-semibold text-foreground text-lg">{title}</Text>
    </View>
  );
}

function BottomSheetFooter({ className, style, ...props }: ViewProps) {
  const insets = useSafeAreaInsets();
  return (
    <View
      className={cn(
        'flex-row gap-3 border-border border-t bg-background px-4 pt-3 pb-6',
        className,
      )}
      style={[{ paddingBottom: insets.bottom + 24 }, style]}
      {...props}
    />
  );
}

type GorhomBottomSheetViewProps = ComponentProps<typeof GorhomBottomSheetView>;
function BottomSheetView(props: GorhomBottomSheetViewProps) {
  return <GorhomBottomSheetView {...props} />;
}

type GorhomBottomSheetScrollViewProps = ComponentProps<typeof GorhomBottomSheetScrollView>;
function BottomSheetScrollView(props: GorhomBottomSheetScrollViewProps) {
  return <GorhomBottomSheetScrollView {...props} />;
}

type BottomSheetInputProps = ComponentProps<typeof GorhomBottomSheetTextInput> &
  React.RefAttributes<TextInput> & { 'aria-invalid'?: boolean };

function BottomSheetInput({ className, ...props }: BottomSheetInputProps) {
  return (
    <GorhomBottomSheetTextInput
      className={cn(
        'flex h-10 w-full min-w-0 flex-row items-center rounded-md border border-input bg-background px-3 py-1 font-sans text-base text-foreground leading-5 shadow-black/5 shadow-sm sm:h-9 dark:bg-input/30',
        props.editable === false &&
          cn(
            'opacity-50',
            Platform.select({ web: 'disabled:pointer-events-none disabled:cursor-not-allowed' }),
          ),
        props['aria-invalid'] && Platform.select({ native: 'border-destructive' }),
        Platform.select({
          web: cn(
            'outline-none transition-[color,box-shadow] selection:bg-primary selection:text-primary-foreground placeholder:text-muted-foreground md:text-sm',
            'focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50',
            'aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40',
          ),
          native: 'placeholder:text-muted-foreground/50',
        }),
        className,
      )}
      {...props}
    />
  );
}

export {
  BottomSheet,
  BottomSheetFooter,
  BottomSheetHeader,
  BottomSheetInput,
  BottomSheetScrollView,
  BottomSheetView,
};
