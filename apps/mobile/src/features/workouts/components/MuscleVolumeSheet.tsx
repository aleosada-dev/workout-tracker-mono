import {
  BottomSheet,
  type BottomSheetRef,
  BottomSheetScrollView,
  RequestErrorState,
  Skeleton,
  Text,
} from '@workout-tracker/ui-mobile';
import { type Ref, useImperativeHandle, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { MuscleVolumeChart } from '@/features/muscles/components/MuscleVolumeChart';
import { useMuscleSetVolumes } from '@/features/muscles/hooks/use-muscle-set-volumes';

export type MuscleVolumeSheetRef = {
  present: () => void;
  dismiss: () => void;
};

/** Bottom sheet com o chart de volume de séries por músculo do treino em montagem. */
export function MuscleVolumeSheet({ ref }: { ref?: Ref<MuscleVolumeSheetRef> }) {
  const { t } = useTranslation();
  const sheetRef = useRef<BottomSheetRef>(null);
  const { volumes, isLoading, isError, refetch } = useMuscleSetVolumes();

  useImperativeHandle(ref, () => ({
    present: () => sheetRef.current?.present(),
    dismiss: () => sheetRef.current?.dismiss(),
  }));

  return (
    <BottomSheet ref={sheetRef}>
      <BottomSheetScrollView
        contentContainerClassName="gap-5 px-5 pt-2 pb-10"
        showsVerticalScrollIndicator={false}
      >
        <Text variant="h4" className="text-center">
          {t('workoutFormScreen.muscleVolume.title')}
        </Text>
        {isError ? (
          <RequestErrorState
            title={t('workoutsScreen.error.title')}
            subtitle={t('workoutsScreen.error.subtitle')}
            retry={{ label: t('workoutsScreen.error.retry'), onPress: refetch }}
          />
        ) : isLoading ? (
          <View className="gap-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-40 w-full" />
          </View>
        ) : (
          <MuscleVolumeChart volumes={volumes} />
        )}
      </BottomSheetScrollView>
    </BottomSheet>
  );
}
