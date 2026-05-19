import {
  BottomSheetBackdrop,
  type BottomSheetBackdropProps,
  BottomSheetModal,
  type BottomSheetModalProps,
  BottomSheetScrollView as GorhomBottomSheetScrollView,
  BottomSheetView as GorhomBottomSheetView,
} from '@gorhom/bottom-sheet';
import { forwardRef, useCallback } from 'react';
import { View, type ViewProps } from 'react-native';
import { rgb, useTheme } from '../../lib/theme';
import { cn } from '../../lib/utils';
import { Text } from './text';

export type BottomSheetRef = BottomSheetModal;

type BottomSheetProps = Omit<BottomSheetModalProps, 'backgroundStyle' | 'handleIndicatorStyle'>;

const BottomSheet = forwardRef<BottomSheetModal, BottomSheetProps>(
  ({ children, enableDynamicSizing = true, ...props }, ref) => {
    const theme = useTheme();

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
        backdropComponent={renderBackdrop}
        backgroundStyle={{ backgroundColor: rgb(theme.background) }}
        handleIndicatorStyle={{ backgroundColor: rgb(theme.mutedForeground, 0.6) }}
        {...props}
      >
        {children}
      </BottomSheetModal>
    );
  },
);
BottomSheet.displayName = 'BottomSheet';

function BottomSheetHeader({ title, className, ...props }: ViewProps & { title: string }) {
  return (
    <View className={cn('border-border border-b px-4 pt-2 pb-3', className)} {...props}>
      <Text className="font-sans-semibold text-foreground text-lg">{title}</Text>
    </View>
  );
}

function BottomSheetFooter({ className, ...props }: ViewProps) {
  return (
    <View
      className={cn(
        'flex-row gap-3 border-border border-t bg-background px-4 pt-3 pb-6',
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
  GorhomBottomSheetScrollView as BottomSheetScrollView,
  GorhomBottomSheetView as BottomSheetView,
};
