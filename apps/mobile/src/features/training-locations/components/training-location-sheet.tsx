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
import { Check, Pencil, Plus, Save, Trash2, X } from 'lucide-react-native';
import { type Ref, useImperativeHandle, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';
import Toast from 'react-native-toast-message';
import { trainingLocationObservability } from '@/features/observability/lib';
import { handleLocalError } from '@/features/query/lib/error-handling';
import type { TrainingLocation } from '@/features/training-locations/api/training-locations';
import {
  useCreateTrainingLocation,
  useDeleteTrainingLocation,
  useTrainingLocations,
  useUpdateTrainingLocation,
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
  const createLocation = useCreateTrainingLocation({ userId });
  const updateLocation = useUpdateTrainingLocation({ userId });
  const deleteLocation = useDeleteTrainingLocation({ userId });

  const sheetRef = useRef<BottomSheetRef>(null);
  const [newName, setNewName] = useState('');
  const [pendingDelete, setPendingDelete] = useState<TrainingLocation | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  useImperativeHandle(ref, () => ({
    present: () => sheetRef.current?.present(),
    dismiss: () => sheetRef.current?.dismiss(),
  }));

  const tid = (suffix: string) => (testIDPrefix ? `${testIDPrefix}.${suffix}` : undefined);

  const isEditing = editingId != null;

  const reportError = (error: unknown, action: string) =>
    handleLocalError((err) => {
      trainingLocationObservability.captureError(err, { action });
      Toast.show({
        type: 'error',
        text1: t('errors.unexpected.title'),
        text2: t('errors.unexpected.message'),
      });
    })(error);

  const handleSelect = (id: string | null) => {
    if (isEditing) return;
    onValueChange(id);
    sheetRef.current?.dismiss();
  };

  const startEdit = (location: TrainingLocation) => {
    setEditingId(location.id);
    setEditingName(location.name);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingName('');
  };

  const saveEdit = async () => {
    const name = editingName.trim();
    if (!editingId || name.length === 0 || updateLocation.isPending) return;
    try {
      await updateLocation.mutateAsync({ locationId: editingId, body: { name } });
      trainingLocationObservability.trackAction('training_location_updated');
      cancelEdit();
    } catch (error) {
      reportError(error, 'update_training_location');
    }
  };

  const handleAdd = async () => {
    const name = newName.trim();
    if (name.length === 0 || createLocation.isPending) return;
    try {
      await createLocation.mutateAsync({ name });
      trainingLocationObservability.trackAction('training_location_created');
      setNewName('');
    } catch (error) {
      reportError(error, 'create_training_location');
    }
  };

  const confirmDelete = () => {
    const target = pendingDelete;
    setPendingDelete(null);
    if (!target) return;
    if (target.id === value) onValueChange(null);
    deleteLocation.mutate(target.id, {
      onSuccess: () => trainingLocationObservability.trackAction('training_location_deleted'),
      onError: (error) => reportError(error, 'delete_training_location'),
    });
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
                selectDisabled={isEditing}
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
                    selectDisabled={isEditing}
                    onPress={() => handleSelect(location.id)}
                    editing={editingId === location.id}
                    editingName={editingName}
                    onEditNameChange={setEditingName}
                    onStartEdit={isEditing ? undefined : () => startEdit(location)}
                    onSaveEdit={saveEdit}
                    onCancelEdit={cancelEdit}
                    saveDisabled={editingName.trim().length === 0 || updateLocation.isPending}
                    onDelete={isEditing ? undefined : () => setPendingDelete(location)}
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
  selectDisabled,
  onPress,
  onStartEdit,
  onDelete,
  editing,
  editingName,
  onEditNameChange,
  onSaveEdit,
  onCancelEdit,
  saveDisabled,
  testID,
}: {
  label: string;
  selected: boolean;
  selectDisabled?: boolean;
  onPress: () => void;
  onStartEdit?: () => void;
  onDelete?: () => void;
  editing?: boolean;
  editingName?: string;
  onEditNameChange?: (value: string) => void;
  onSaveEdit?: () => void;
  onCancelEdit?: () => void;
  saveDisabled?: boolean;
  testID?: string;
}) {
  if (editing) {
    return (
      <View className="flex-row items-center gap-3 rounded-lg border border-primary p-3">
        <View className="flex-1">
          <BottomSheetInput
            value={editingName}
            onChangeText={onEditNameChange}
            onSubmitEditing={onSaveEdit}
            autoFocus
            testID={testID ? `${testID}.edit-input` : undefined}
          />
        </View>
        <Pressable
          onPress={onSaveEdit}
          disabled={saveDisabled}
          accessibilityRole="button"
          hitSlop={8}
          testID={testID ? `${testID}.edit-save` : undefined}
        >
          <Icon
            as={Save}
            size={18}
            className={cn('text-primary', saveDisabled && 'text-muted-foreground/50')}
          />
        </Pressable>
        <Pressable
          onPress={onCancelEdit}
          accessibilityRole="button"
          hitSlop={8}
          testID={testID ? `${testID}.edit-cancel` : undefined}
        >
          <Icon as={X} size={18} className="text-muted-foreground" />
        </Pressable>
      </View>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      disabled={selectDisabled}
      accessibilityRole="button"
      accessibilityState={{ selected, disabled: selectDisabled }}
      testID={testID}
      className={cn(
        'flex-row items-center gap-3 rounded-lg border border-border p-3',
        selected && 'border-primary bg-primary/5',
        selectDisabled && 'opacity-50',
      )}
    >
      <Text className="flex-1 font-sans-semibold text-sm" numberOfLines={1}>
        {label}
      </Text>
      {selected ? <Icon as={Check} size={16} className="text-primary" /> : null}
      {onStartEdit ? (
        <Pressable
          onPress={onStartEdit}
          accessibilityRole="button"
          hitSlop={8}
          testID={testID ? `${testID}.edit` : undefined}
        >
          <Icon as={Pencil} size={16} className="text-muted-foreground" />
        </Pressable>
      ) : null}
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
