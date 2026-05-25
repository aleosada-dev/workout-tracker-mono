import { type BottomSheetMethods, BottomSheetModal } from '@expo/ui/community/bottom-sheet';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Field, Input, Text } from '@workout-tracker/ui-mobile';
import { type Ref, useImperativeHandle, useRef } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';
import Toast from 'react-native-toast-message';
import { z } from 'zod';
import { ApiError } from '@/features/api/lib/errors';
import { workoutObservability } from '@/features/observability/lib';
import { handleLocalError } from '@/features/query/lib/error-handling';
import { useCreateWorkoutFolder } from '@/features/workouts/hooks/use-create-workout-folder';
import { resolveFolderColor, WORKOUT_FOLDER_COLORS } from '@/features/workouts/lib/folder-colors';

export type WorkoutFolderFormSheetRef = {
  present: () => void;
  dismiss: () => void;
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

export function WorkoutFolderFormSheet({ ref }: { ref?: Ref<WorkoutFolderFormSheetRef> }) {
  const { t } = useTranslation();
  const sheetRef = useRef<BottomSheetMethods>(null);
  const { mutate: createFolder, isPending } = useCreateWorkoutFolder();

  const {
    control,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<FolderFormValues>({
    resolver: zodResolver(folderFormSchema),
    defaultValues: {
      name: '',
      color: WORKOUT_FOLDER_COLORS[0],
    },
  });

  useImperativeHandle(ref, () => ({
    present: () => sheetRef.current?.present(),
    dismiss: () => sheetRef.current?.dismiss(),
  }));

  const handleCreateError = handleLocalError((error) => {
    if (error instanceof ApiError && error.status === 409) {
      setError('name', {
        type: 'conflict',
        message: 'workoutsScreen.newFolderSheet.validation.nameConflict',
      });
      return;
    }

    workoutObservability.captureError(error, { action: 'create_workout_folder' });
    Toast.show({
      type: 'error',
      text1: t('errors.unexpected.title'),
      text2: t('errors.unexpected.message'),
    });
  });

  const onSubmit = handleSubmit((values) => {
    createFolder(values, {
      onSuccess: () => {
        workoutObservability.trackAction('workout_folder_created');
        sheetRef.current?.dismiss();
        reset();
      },
      onError: handleCreateError,
    });
  });

  return (
    <BottomSheetModal ref={sheetRef} enablePanDownToClose enableDynamicSizing>
      <View className="gap-5 px-5 pt-2 pb-8">
        <View className="items-center gap-1">
          <Text variant="h4">{t('workoutsScreen.newFolderSheet.title')}</Text>
          <Text variant="muted" className="text-center">
            {t('workoutsScreen.newFolderSheet.subtitle')}
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
              <Input
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                placeholder={t('workoutsScreen.newFolderSheet.namePlaceholder')}
                maxLength={20}
                autoFocus
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
          <Text>{t('workoutsScreen.newFolderSheet.submit')}</Text>
        </Button>
      </View>
    </BottomSheetModal>
  );
}
