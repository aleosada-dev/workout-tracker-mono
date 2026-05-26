import { zodResolver } from '@hookform/resolvers/zod';
import {
  BottomSheet,
  BottomSheetInput,
  type BottomSheetRef,
  BottomSheetView,
  Button,
  Field,
  Text,
} from '@workout-tracker/ui-mobile';
import { type Ref, useEffect, useImperativeHandle, useRef } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';
import Toast from 'react-native-toast-message';
import { z } from 'zod';
import { ApiError } from '@/features/api/lib/errors';
import { workoutObservability } from '@/features/observability/lib';
import { handleLocalError } from '@/features/query/lib/error-handling';
import { useCreateWorkoutFolder } from '@/features/workouts/hooks/use-create-workout-folder';
import { useUpdateWorkoutFolder } from '@/features/workouts/hooks/use-update-workout-folder';
import {
  resolveFolderColor,
  WORKOUT_FOLDER_COLORS,
  type WorkoutFolderColor,
} from '@/features/workouts/lib/folder-colors';

export type WorkoutFolderFormSheetRef = {
  present: () => void;
  dismiss: () => void;
};

export type WorkoutFolderFormSheetFolder = {
  id: string;
  name: string;
  color: WorkoutFolderColor;
};

const folderFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'workoutsScreen.newFolderSheet.validation.name')
    .max(20, 'workoutsScreen.newFolderSheet.validation.nameMax'),
  color: z.enum(WORKOUT_FOLDER_COLORS, {
    error: 'workoutsScreen.newFolderSheet.validation.color',
  }),
});

type FolderFormValues = z.infer<typeof folderFormSchema>;

type Props = {
  ref?: Ref<WorkoutFolderFormSheetRef>;
  folder?: WorkoutFolderFormSheetFolder;
  userId?: string | null;
  onUpdated?: (folder: { id: string; name: string; color: WorkoutFolderColor }) => void;
};

export function WorkoutFolderFormSheet({ ref, folder, userId, onUpdated }: Props) {
  const { t } = useTranslation();
  const sheetRef = useRef<BottomSheetRef>(null);
  const isEdit = folder != null;
  const { mutate: createFolder, isPending: isCreating } = useCreateWorkoutFolder({ userId });
  const { mutate: updateFolder, isPending: isUpdating } = useUpdateWorkoutFolder(folder?.id ?? '', {
    userId,
  });
  const isPending = isEdit ? isUpdating : isCreating;

  const {
    control,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<FolderFormValues>({
    resolver: zodResolver(folderFormSchema),
    defaultValues: {
      name: folder?.name ?? '',
      color: folder?.color ?? WORKOUT_FOLDER_COLORS[0],
    },
  });

  useEffect(() => {
    reset({
      name: folder?.name ?? '',
      color: folder?.color ?? WORKOUT_FOLDER_COLORS[0],
    });
  }, [folder?.name, folder?.color, reset]);

  useImperativeHandle(ref, () => ({
    present: () => sheetRef.current?.present(),
    dismiss: () => sheetRef.current?.dismiss(),
  }));

  const handleSubmitError = handleLocalError((error) => {
    if (error instanceof ApiError && error.status === 409) {
      setError('name', {
        type: 'conflict',
        message: 'workoutsScreen.newFolderSheet.validation.nameConflict',
      });
      return;
    }

    workoutObservability.captureError(error, {
      action: isEdit ? 'update_workout_folder' : 'create_workout_folder',
    });
    Toast.show({
      type: 'error',
      text1: t('errors.unexpected.title'),
      text2: t('errors.unexpected.message'),
    });
  });

  const onSubmit = handleSubmit((values) => {
    if (isEdit) {
      updateFolder(values, {
        onSuccess: (updated) => {
          workoutObservability.trackAction('workout_folder_updated');
          sheetRef.current?.dismiss();
          onUpdated?.({ id: updated.id, name: updated.name, color: updated.color });
        },
        onError: handleSubmitError,
      });
      return;
    }

    createFolder(values, {
      onSuccess: () => {
        workoutObservability.trackAction('workout_folder_created');
        sheetRef.current?.dismiss();
        reset();
      },
      onError: handleSubmitError,
    });
  });

  const titleKey = isEdit
    ? 'workoutsScreen.editFolderSheet.title'
    : 'workoutsScreen.newFolderSheet.title';
  const subtitleKey = isEdit
    ? 'workoutsScreen.editFolderSheet.subtitle'
    : 'workoutsScreen.newFolderSheet.subtitle';
  const submitKey = isEdit
    ? 'workoutsScreen.editFolderSheet.submit'
    : 'workoutsScreen.newFolderSheet.submit';

  return (
    <BottomSheet ref={sheetRef}>
      <BottomSheetView className="gap-5 px-5 pt-2 pb-8">
        <View className="items-center gap-1">
          <Text variant="h4">{t(titleKey)}</Text>
          <Text variant="muted" className="text-center">
            {t(subtitleKey)}
          </Text>
        </View>

        <Field
          label={t('workoutsScreen.newFolderSheet.nameLabel')}
          error={errors.name?.message && t(errors.name.message)}
        >
          <Controller
            control={control}
            name="name"
            render={({ field }) => (
              <BottomSheetInput
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                placeholder={t('workoutsScreen.newFolderSheet.namePlaceholder')}
                maxLength={20}
              />
            )}
          />
        </Field>

        <Field
          label={t('workoutsScreen.newFolderSheet.colorLabel')}
          error={errors.color?.message && t(errors.color.message)}
        >
          <Controller
            control={control}
            name="color"
            render={({ field }) => (
              <View className="flex-row flex-wrap gap-3">
                {WORKOUT_FOLDER_COLORS.map((name) => {
                  const { swatch } = resolveFolderColor(name);
                  const selected = name === field.value;
                  return (
                    <Pressable
                      key={name}
                      onPress={() => field.onChange(name)}
                      accessibilityRole="radio"
                      accessibilityState={{ selected }}
                      hitSlop={4}
                      className={`h-9 w-9 items-center justify-center rounded-full ${
                        selected ? 'border-2 border-foreground' : ''
                      }`}
                    >
                      <View className={`h-7 w-7 rounded-full ${swatch}`} />
                    </Pressable>
                  );
                })}
              </View>
            )}
          />
        </Field>

        <Button onPress={onSubmit} disabled={isPending}>
          <Text>{t(submitKey)}</Text>
        </Button>
      </BottomSheetView>
    </BottomSheet>
  );
}
