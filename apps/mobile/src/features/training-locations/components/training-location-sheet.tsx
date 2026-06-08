import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  BottomSheet,
  BottomSheetInput,
  type BottomSheetRef,
  BottomSheetView,
  Button,
  cn,
  Icon,
  Skeleton,
  Text,
} from '@workout-tracker/ui-mobile';
import { Check, Plus, Trash2 } from 'lucide-react-native';
import { type Ref, useImperativeHandle, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';
import type { TrainingLocation } from '@/features/training-locations/api/training-locations';
import {
  useCreateTrainingLocation,
  useDeleteTrainingLocation,
  useTrainingLocations,
} from '@/features/training-locations/hooks/use-training-locations';

export type TrainingLocationSheetRef = {
  present: () => void;
  dismiss: () => void;
};

type TrainingLocationSheetProps = {
  title: string;
  value: string | null;
  onValueChange: (value: string | null) => void;
  userId?: string | null;
  testIDPrefix?: string;
  ref?: Ref<TrainingLocationSheetRef>;
};

export function TrainingLocationSheet({
  title,
  value,
  onValueChange,
  userId,
  testIDPrefix,
  ref,
}: TrainingLocationSheetProps) {
  const { t } = useTranslation();
  const { data: locations, isLoading } = useTrainingLocations(userId);
  const createLocation = useCreateTrainingLocation();
  const deleteLocation = useDeleteTrainingLocation();

  const sheetRef = useRef<BottomSheetRef>(null);
  const [newName, setNewName] = useState('');
  const [pendingDelete, setPendingDelete] = useState<TrainingLocation | null>(null);

  useImperativeHandle(ref, () => ({
    present: () => sheetRef.current?.present(),
    dismiss: () => sheetRef.current?.dismiss(),
  }));

  const tid = (suffix: string) => (testIDPrefix ? `${testIDPrefix}.${suffix}` : undefined);

  const handleSelect = (id: string | null) => {
    onValueChange(id);
    sheetRef.current?.dismiss();
  };

  const handleAdd = async () => {
    const name = newName.trim();
    if (name.length === 0 || createLocation.isPending) return;
    await createLocation.mutateAsync({ name });
    setNewName('');
  };

  const confirmDelete = () => {
    const target = pendingDelete;
    setPendingDelete(null);
    if (!target) return;
    if (target.id === value) onValueChange(null);
    deleteLocation.mutate(target.id);
  };

  return (
    <>
      <BottomSheet ref={sheetRef}>
        <BottomSheetView className="gap-4 px-5 pt-2 pb-8">
          <Text variant="h4" className="text-center">
            {title}
          </Text>

          {isLoading ? (
            <View className="gap-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </View>
          ) : (
            <View className="gap-2">
              <LocationRow
                label={t('trainingLocationsScreen.none')}
                selected={value == null}
                onPress={() => handleSelect(null)}
                testID={tid('option.none')}
              />
              {(locations ?? []).length === 0 ? (
                <Text variant="muted" className="mt-2 text-center text-sm">
                  {t('trainingLocationsScreen.empty')}
                </Text>
              ) : (
                (locations ?? []).map((location) => (
                  <LocationRow
                    key={location.id}
                    label={location.name}
                    selected={value === location.id}
                    onPress={() => handleSelect(location.id)}
                    onDelete={() => setPendingDelete(location)}
                    testID={tid(`option.${location.id}`)}
                  />
                ))
              )}
            </View>
          )}

          <View className="flex-row items-center gap-2 border-border border-t pt-4">
            <View className="flex-1">
              <BottomSheetInput
                value={newName}
                onChangeText={setNewName}
                placeholder={t('trainingLocationsScreen.namePlaceholder')}
                onSubmitEditing={handleAdd}
                testID={tid('newName')}
              />
            </View>
            <Button
              onPress={handleAdd}
              disabled={newName.trim().length === 0 || createLocation.isPending}
              testID={tid('add')}
            >
              <Icon as={Plus} size={16} className="text-primary-foreground" />
              <Text className="font-sans-semibold text-primary-foreground text-sm">
                {t('trainingLocationsScreen.add')}
              </Text>
            </Button>
          </View>
        </BottomSheetView>
      </BottomSheet>

      <AlertDialog open={pendingDelete != null}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-center">
              {t('trainingLocationsScreen.deleteConfirm.title')}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-left">
              {t('trainingLocationsScreen.deleteConfirm.message')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onPress={() => setPendingDelete(null)}>
              <Text>{t('trainingLocationsScreen.deleteConfirm.cancel')}</Text>
            </AlertDialogCancel>
            <AlertDialogAction
              onPress={confirmDelete}
              variant="destructive"
              testID={tid('delete-confirm')}
            >
              <Text>{t('trainingLocationsScreen.deleteConfirm.confirm')}</Text>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function LocationRow({
  label,
  selected,
  onPress,
  onDelete,
  testID,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  onDelete?: () => void;
  testID?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      testID={testID}
      className={cn(
        'flex-row items-center gap-2 rounded-lg border border-border p-3',
        selected && 'border-primary bg-primary/5',
      )}
    >
      <Text className="flex-1 font-sans-semibold text-sm" numberOfLines={1}>
        {label}
      </Text>
      {selected ? <Icon as={Check} size={16} className="text-primary" /> : null}
      {onDelete ? (
        <Pressable
          onPress={onDelete}
          accessibilityRole="button"
          hitSlop={8}
          testID={testID ? `${testID}.delete` : undefined}
        >
          <Icon as={Trash2} size={16} className="text-destructive" />
        </Pressable>
      ) : null}
    </Pressable>
  );
}
