import { zodResolver } from '@hookform/resolvers/zod';
import { PortalHost } from '@rn-primitives/portal';
import { WORKOUT_FOLDER_COLORS } from '@workout-tracker/domain';
import {
  BottomSheet,
  BottomSheetInput,
  type BottomSheetRef,
  BottomSheetView,
  Button,
  Field,
  Text,
} from '@workout-tracker/ui-mobile';
import { Folder, FolderMinus, FolderPlus } from 'lucide-react-native';
import { type Ref, useImperativeHandle, useMemo, useRef } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, View } from 'react-native';
import { z } from 'zod';
import type { CoachAthleteResponse } from '@/features/coaches/api/coaches';
import { CoachAthleteAutocomplete } from '@/features/coaches/components/CoachAthleteAutocomplete';
import type { CopyWorkoutsRequest } from '@/features/workouts/api/workouts';
import { FolderTile } from '@/features/workouts/components/FolderTile';
import { useWorkoutFolders } from '@/features/workouts/hooks/use-workout-folders';
import { resolveFolderColor } from '@/features/workouts/lib/folder-colors';

type CopyDestination = Pick<CopyWorkoutsRequest, 'targetUserId' | 'target'>;

const ROOT_VALUE = 'null' as const;
const NEW_FOLDER_VALUE = 'new' as const;
const SUGGESTIONS_PORTAL_HOST = 'workouts-copy.suggestions';

// Flat shape lets RHF drive every field with a Controller; we collapse it into
// the CopyDestination's discriminated union at submit time. The zod schema is
// what gates the confirm button via `formState.isValid`.
const copyFormSchema = z
  .object({
    athleteId: z.uuid('workoutsScreen.copyWorkoutsDialog.validation.athlete'),
    folderChoice: z.string().min(1),
    newFolderName: z.string().trim().max(20),
    newFolderColor: z.enum(WORKOUT_FOLDER_COLORS),
  })
  .superRefine((data, ctx) => {
    if (data.folderChoice === NEW_FOLDER_VALUE && data.newFolderName.length === 0) {
      ctx.addIssue({
        code: 'custom',
        path: ['newFolderName'],
        message: 'workoutsScreen.copyWorkoutsDialog.validation.newFolderName',
      });
    }
  });

type CopyFormValues = z.infer<typeof copyFormSchema>;

const defaultValues: CopyFormValues = {
  athleteId: '',
  folderChoice: ROOT_VALUE,
  newFolderName: '',
  newFolderColor: WORKOUT_FOLDER_COLORS[0],
};

export type WorkoutsCopySheetRef = {
  present: () => void;
  dismiss: () => void;
};

type Props = {
  ref?: Ref<WorkoutsCopySheetRef>;
  count: number;
  athletes: CoachAthleteResponse[];
  onConfirm: (destination: CopyDestination) => void;
  isPending?: boolean;
};

export function WorkoutsCopySheet({ ref, count, athletes, onConfirm, isPending }: Props) {
  const { t } = useTranslation();
  const sheetRef = useRef<BottomSheetRef>(null);

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { isValid, errors },
  } = useForm<CopyFormValues>({
    resolver: zodResolver(copyFormSchema),
    defaultValues,
    mode: 'onChange',
  });

  const athleteId = watch('athleteId');
  const folderChoice = watch('folderChoice');

  const selectedAthlete = useMemo(
    () => athletes.find((a) => a.athleteId === athleteId) ?? null,
    [athletes, athleteId],
  );
  const { data: folders } = useWorkoutFolders({ userId: selectedAthlete?.athleteId ?? null });

  useImperativeHandle(ref, () => ({
    present: () => {
      reset(defaultValues);
      sheetRef.current?.present();
    },
    dismiss: () => sheetRef.current?.dismiss(),
  }));

  const onSubmit = handleSubmit((values) => {
    const targetUserId = values.athleteId;
    if (values.folderChoice === ROOT_VALUE) {
      onConfirm({ targetUserId, target: { kind: 'root' } });
    } else if (values.folderChoice === NEW_FOLDER_VALUE) {
      onConfirm({
        targetUserId,
        target: {
          kind: 'new',
          name: values.newFolderName.trim(),
          color: values.newFolderColor,
        },
      });
    } else {
      onConfirm({
        targetUserId,
        target: { kind: 'existing', folderId: values.folderChoice },
      });
    }
  });

  return (
    <BottomSheet ref={sheetRef}>
      <BottomSheetView className="gap-5 px-5 pt-2 pb-8">
        <View className="items-center gap-1">
          <Text variant="h4">{t('workoutsScreen.copyWorkoutsDialog.title', { count })}</Text>
          <Text variant="muted" className="text-center">
            {t('workoutsScreen.copyWorkoutsDialog.subtitle')}
          </Text>
        </View>

        <Field
          label={t('workoutsScreen.copyWorkoutsDialog.athleteLabel')}
          error={errors.athleteId?.message && t(errors.athleteId.message)}
        >
          <CoachAthleteAutocomplete
            athletes={athletes}
            selected={selectedAthlete}
            onSelect={(a) => setValue('athleteId', a.athleteId, { shouldValidate: true })}
            onClear={() => setValue('athleteId', '', { shouldValidate: true })}
            placeholder={t('workoutsScreen.copyWorkoutsDialog.athletePlaceholder')}
            testID="workouts-copy.athlete"
            portalHost={SUGGESTIONS_PORTAL_HOST}
            inBottomSheet
          />
        </Field>

        {selectedAthlete ? (
          <>
            <Field label={t('workoutsScreen.copyWorkoutsDialog.folderLabel')}>
              <Controller
                control={control}
                name="folderChoice"
                render={({ field }) => (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerClassName="gap-4 px-1 py-2"
                  >
                    <FolderTile
                      label={t('workoutsScreen.copyWorkoutsDialog.rootOption')}
                      icon={FolderMinus}
                      tileClassName="bg-muted"
                      iconClassName="text-muted-foreground"
                      selected={field.value === ROOT_VALUE}
                      onPress={() => field.onChange(ROOT_VALUE)}
                    />
                    {(folders ?? []).map((folder) => {
                      const { color, iconColor } = resolveFolderColor(folder.color);
                      return (
                        <FolderTile
                          key={folder.id}
                          label={folder.name}
                          icon={Folder}
                          tileClassName={color}
                          iconClassName={iconColor}
                          selected={field.value === folder.id}
                          onPress={() => field.onChange(folder.id)}
                        />
                      );
                    })}
                    <FolderTile
                      label={t('workoutsScreen.copyWorkoutsDialog.newFolderOption')}
                      icon={FolderPlus}
                      tileClassName="bg-muted"
                      iconClassName="text-muted-foreground"
                      selected={field.value === NEW_FOLDER_VALUE}
                      onPress={() => field.onChange(NEW_FOLDER_VALUE)}
                    />
                  </ScrollView>
                )}
              />
            </Field>

            {folderChoice === NEW_FOLDER_VALUE ? (
              <View className="gap-4">
                <Field
                  label={t('workoutsScreen.copyWorkoutsDialog.newFolderNameLabel')}
                  error={errors.newFolderName?.message && t(errors.newFolderName.message)}
                >
                  <Controller
                    control={control}
                    name="newFolderName"
                    render={({ field }) => (
                      <BottomSheetInput
                        value={field.value}
                        onChangeText={field.onChange}
                        onBlur={field.onBlur}
                        placeholder={t(
                          'workoutsScreen.copyWorkoutsDialog.newFolderNamePlaceholder',
                        )}
                        maxLength={20}
                      />
                    )}
                  />
                </Field>
                <Field label={t('workoutsScreen.copyWorkoutsDialog.newFolderColorLabel')}>
                  <Controller
                    control={control}
                    name="newFolderColor"
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
              </View>
            ) : null}
          </>
        ) : null}

        <View className="gap-3">
          <Button
            onPress={onSubmit}
            disabled={!isValid || isPending}
            testID="workouts-copy.confirm"
          >
            <Text>{t('workoutsScreen.copyWorkoutsDialog.confirm')}</Text>
          </Button>
          <Button
            variant="outline"
            onPress={() => sheetRef.current?.dismiss()}
            disabled={isPending}
          >
            <Text>{t('workoutsScreen.copyWorkoutsDialog.cancel')}</Text>
          </Button>
        </View>

        <PortalHost name={SUGGESTIONS_PORTAL_HOST} />
      </BottomSheetView>
    </BottomSheet>
  );
}
