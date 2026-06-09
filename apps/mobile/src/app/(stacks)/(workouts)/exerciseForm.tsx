import { zodResolver } from '@hookform/resolvers/zod';
import { PortalHost } from '@rn-primitives/portal';
import { EXERCISE_MEASUREMENT_TYPES } from '@workout-tracker/domain';
import {
  Button,
  Field,
  Input,
  RequestErrorState,
  Skeleton,
  Text,
  UploadProgressBar,
} from '@workout-tracker/ui-mobile';
import * as Crypto from 'expo-crypto';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { Trash2, X } from 'lucide-react-native';
import { useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { type ColorValue, Platform, Pressable, useWindowDimensions, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import Toast from 'react-native-toast-message';
import { z } from 'zod';
import { ApiError } from '@/features/api/lib/errors';
import { EquipmentSelect } from '@/features/equipments/components/equipment-select';
import type { ExerciseForEditResponse } from '@/features/exercises/api/exercises';
import {
  DeleteExerciseSheet,
  type DeleteExerciseSheetRef,
} from '@/features/exercises/components/DeleteExerciseSheet';
import { ExerciseNameAutocomplete } from '@/features/exercises/components/ExerciseNameAutocomplete';
import {
  ExerciseVideoPicker,
  type SelectedVideo,
} from '@/features/exercises/components/ExerciseVideoPicker';
import { ExerciseYouTubeCard } from '@/features/exercises/components/ExerciseYouTubeCard';
import { MeasurementTypeHelpDialog } from '@/features/exercises/components/MeasurementTypeHelpDialog';
import { MeasurementTypeSelector } from '@/features/exercises/components/MeasurementTypeSelector';
import { useCreateExercise } from '@/features/exercises/hooks/use-create-exercise';
import { useDeleteExercise } from '@/features/exercises/hooks/use-delete-exercise';
import { useExerciseForEdit } from '@/features/exercises/hooks/use-exercise-for-edit';
import { useUpdateExercise } from '@/features/exercises/hooks/use-update-exercise';
import { composeExerciseName } from '@/features/exercises/lib/format';
import {
  type ExerciseVideoUpload,
  uploadExerciseVideo,
} from '@/features/exercises/lib/upload-video';
import { MuscleSelect } from '@/features/muscles/components/muscle-select';
import { exerciseObservability } from '@/features/observability/lib';
import { handleLocalError } from '@/features/query/lib/error-handling';
import { useNavTheme } from '@/features/shared/lib/theme';
import { extractYouTubeVideoId } from '@/features/shared/lib/youtube';

// Portal host mounted inside this (modal) screen so the name autocomplete's
// suggestion list shares the screen's coordinate space and floats above it.
const SUGGESTIONS_PORTAL_HOST = 'add-exercise-suggestions';

// Horizontal padding of the scroll content. Shared with the inline YouTube
// preview so its embedded player is sized to the actual available width.
const SCREEN_PADDING = 20;

// Os campos opcionais (variação, músculo secundário, vídeo) são enviados como
// `null` quando vazios para casar com o schema de entrada da API, que os
// declara `nullable()`. Por isso o tipo de entrada do form (strings dos
// inputs controlados) difere do tipo de saída (já pronto para a API).
//
// As mensagens de erro são chaves de i18n; resolvidas com `t()` no render do
// `Field` (mesmo padrão de `signIn.tsx`), já que o schema é criado fora do
// componente e não tem acesso ao `t`.
const exerciseFormSchema = z.object({
  name: z.string().trim().min(1, 'exerciseListScreen.addExercise.validation.name'),
  measurementType: z.enum(EXERCISE_MEASUREMENT_TYPES, {
    error: 'exerciseListScreen.addExercise.validation.measurementType',
  }),
  variationName: z
    .string()
    .trim()
    .transform((v) => v || null),
  primaryMuscleId: z.string().min(1, 'exerciseListScreen.addExercise.validation.primaryMuscle'),
  secondaryMuscleId: z.string().transform((v) => v || null),
  equipmentId: z.string().min(1, 'exerciseListScreen.addExercise.validation.equipment'),
  // Vazio é permitido (campo opcional). Caso contrário, exige uma URL da qual
  // seja possível extrair um vídeo do YouTube — o mesmo critério que decide se
  // o preview aparece. Uma URL "válida" mas de outro site é considerada inválida.
  youtubeVideoUrl: z
    .string()
    .trim()
    .refine(
      (v) => v === '' || extractYouTubeVideoId(v) !== null,
      'exerciseListScreen.addExercise.validation.youtubeVideoUrl',
    )
    .transform((v) => v || null),
});

type ExerciseFormInput = z.input<typeof exerciseFormSchema>;
type ExerciseFormValues = z.output<typeof exerciseFormSchema>;

/**
 * Tela de criação e edição de exercício. Sem `id` na rota é criação; com `id`
 * (id da variação) carrega os dados e entra em modo edição.
 */
export default function ExerciseFormScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const editQuery = useExerciseForEdit(id ?? '');

  // Em modo edição, esperamos os dados antes de montar o form para que ele já
  // nasça preenchido (evita um reset() após o primeiro render).
  if (id) {
    if (editQuery.isPending) {
      return <ExerciseFormFallback state="loading" />;
    }
    if (editQuery.isError || !editQuery.data) {
      return <ExerciseFormFallback state="error" onRetry={() => editQuery.refetch()} />;
    }
    return <ExerciseForm editData={editQuery.data} />;
  }

  return <ExerciseForm editData={null} />;
}

function ExerciseForm({ editData }: { editData: ExerciseForEditResponse | null }) {
  const { t, i18n } = useTranslation();
  const navTheme = useNavTheme();
  // Caps the centered title so it never slides under the header buttons — iOS
  // centers a custom headerTitle across the full width and ignores them.
  const { width } = useWindowDimensions();
  const isEdit = editData !== null;

  const {
    control,
    handleSubmit,
    trigger,
    formState: { errors },
  } = useForm<ExerciseFormInput, unknown, ExerciseFormValues>({
    resolver: zodResolver(exerciseFormSchema),
    defaultValues: editData
      ? {
          name: editData.exerciseName,
          measurementType: editData.measurementType,
          variationName: editData.variationName ?? '',
          primaryMuscleId: editData.muscleId,
          secondaryMuscleId: editData.secondaryMuscleId ?? '',
          equipmentId: editData.equipmentId,
          youtubeVideoUrl: editData.youtubeVideoUrl ?? '',
        }
      : {
          name: '',
          measurementType: 'weight_reps',
          variationName: '',
          primaryMuscleId: '',
          secondaryMuscleId: '',
          equipmentId: '',
          youtubeVideoUrl: '',
        },
  });

  const { mutate: createExercise, isPending: isCreating } = useCreateExercise();

  // Create: minted up front so the device video can be uploaded to R2 before the
  // variation exists. Edit: the variation already exists, so use its id.
  const [variationId] = useState(() => editData?.variationId ?? Crypto.randomUUID());
  const { mutate: updateExercise, isPending: isUpdating } = useUpdateExercise(variationId);
  const { mutate: deleteExercise, isPending: isDeleting } = useDeleteExercise(variationId);
  const deleteSheetRef = useRef<DeleteExerciseSheetRef>(null);

  const [video, setVideo] = useState<SelectedVideo | null>(null);
  // Holds the result of a successful upload so a retry (e.g. after a 409 on the
  // exercise name) re-posts without re-uploading the video.
  const [uploadedVideo, setUploadedVideo] = useState<ExerciseVideoUpload | null>(null);
  // null = no upload in progress; 0..1 = upload running.
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  // The video already on the server (edit mode), and whether the user removed it.
  const [existingVideo] = useState(() => editData?.video ?? null);
  const [removedExisting, setRemovedExisting] = useState(false);

  const busy = isCreating || isUpdating || isDeleting || uploadProgress !== null;

  const headerName = editData
    ? composeExerciseName(
        {
          exerciseName: editData.exerciseName,
          equipmentName: t(`equipment.${editData.equipmentSlug}`),
          equipmentPreposition: editData.equipmentPreposition,
          equipmentSlug: editData.equipmentSlug,
        },
        i18n.language,
      )
    : '';

  function handleVideoChange(next: SelectedVideo | null) {
    setVideo(next);
    // A changed or removed video invalidates any previously uploaded file.
    setUploadedVideo(null);
    setUploadProgress(null);
  }

  const handleSaveError = handleLocalError((error) => {
    if (error instanceof ApiError && error.status === 409) {
      Toast.show({
        type: 'error',
        text1: t('exerciseListScreen.addExercise.errors.conflict.title'),
        text2: t('exerciseListScreen.addExercise.errors.conflict.message'),
      });
      return;
    }

    exerciseObservability.captureError(error, {
      action: isEdit ? 'update_exercise' : 'create_exercise',
    });
    Toast.show({
      type: 'error',
      text1: t('errors.unexpected.title'),
      text2: t('errors.unexpected.message'),
    });
  });

  function handleConfirmDelete() {
    deleteSheetRef.current?.dismiss();
    deleteExercise(undefined, {
      onSuccess: () => {
        exerciseObservability.trackAction('exercise_deleted');
        Toast.show({
          type: 'success',
          text1: t('exerciseListScreen.deleteExercise.success.title'),
          text2: t('exerciseListScreen.deleteExercise.success.message'),
        });
        router.back();
      },
      onError: handleLocalError((error) => {
        exerciseObservability.captureError(error, { action: 'delete_exercise' });
        Toast.show({
          type: 'error',
          text1: t('errors.unexpected.title'),
          text2: t('errors.unexpected.message'),
        });
      }),
    });
  }

  const onSubmit = handleSubmit(async (values) => {
    // Resolve the video to persist: a freshly-picked video is uploaded now; an
    // untouched server video is re-sent as-is; otherwise there is no video.
    let videoPayload: ExerciseVideoUpload | null;

    if (video) {
      videoPayload = uploadedVideo;
      if (!videoPayload) {
        try {
          setUploadProgress(0);
          videoPayload = await uploadExerciseVideo({
            variationId,
            fileUri: video.uri,
            contentType: video.contentType,
            durationMs: video.durationMs,
            sizeBytes: video.sizeBytes,
            onProgress: setUploadProgress,
          });
          setUploadedVideo(videoPayload);
        } catch (error) {
          exerciseObservability.captureError(error, { action: 'upload_exercise_video' });
          Toast.show({
            type: 'error',
            text1: t('exerciseListScreen.addExercise.video.errors.uploadFailed.title'),
            text2: t('exerciseListScreen.addExercise.video.errors.uploadFailed.message'),
          });
          return;
        } finally {
          setUploadProgress(null);
        }
      }
    } else if (existingVideo && !removedExisting) {
      videoPayload = {
        objectKey: existingVideo.objectKey,
        thumbnailKey: existingVideo.thumbnailKey,
        durationSeconds: existingVideo.durationSeconds,
        sizeBytes: existingVideo.sizeBytes,
        contentType: existingVideo.contentType,
      };
    } else {
      videoPayload = null;
    }

    const fields = {
      exerciseName: values.name,
      measurementType: values.measurementType,
      variationName: values.variationName,
      muscleId: values.primaryMuscleId,
      secondaryMuscleId: values.secondaryMuscleId,
      equipmentId: values.equipmentId,
      youtubeVideoUrl: values.youtubeVideoUrl,
      video: videoPayload,
    };

    if (isEdit) {
      updateExercise(fields, {
        onSuccess: () => {
          exerciseObservability.trackAction('exercise_updated');
          Toast.show({
            type: 'success',
            text1: t('exerciseListScreen.editExercise.success.title'),
            text2: t('exerciseListScreen.editExercise.success.message'),
          });
          router.back();
        },
        onError: handleSaveError,
      });
      return;
    }

    createExercise(
      { variationId, ...fields },
      {
        onSuccess: () => {
          exerciseObservability.trackAction('exercise_created');
          Toast.show({
            type: 'success',
            text1: t('exerciseListScreen.addExercise.success.title'),
            text2: t('exerciseListScreen.addExercise.success.message'),
          });
          router.back();
        },
        onError: handleSaveError,
      },
    );
  });

  return (
    <>
      <Stack.Screen
        options={{
          headerLeft: () => <HeaderCloseButton color={navTheme.colors.text} />,
          headerBackVisible: false,
          ...(isEdit
            ? {
                title: '',
                headerTitleAlign: 'center' as const,
                headerTitle: () => (
                  <View className="items-center" style={{ maxWidth: width - 140 }}>
                    <Text numberOfLines={1} className="font-sans-semibold text-base">
                      {headerName}
                    </Text>
                    {editData?.variationName ? (
                      <Text numberOfLines={1} className="text-muted-foreground text-xs">
                        {editData.variationName}
                      </Text>
                    ) : null}
                  </View>
                ),
                headerRight: () => (
                  <Pressable
                    onPress={() => deleteSheetRef.current?.present()}
                    disabled={busy}
                    hitSlop={12}
                    accessibilityRole="button"
                    accessibilityLabel={t('exerciseListScreen.deleteExercise.action')}
                    className="px-2"
                    testID="exercise-form.delete"
                  >
                    <Trash2 size={20} color={navTheme.colors.notification} />
                  </Pressable>
                ),
              }
            : { title: t('exerciseListScreen.addExercise.title') }),
        }}
      />

      <KeyboardAwareScrollView
        className="flex-1 bg-background"
        contentContainerStyle={{ padding: SCREEN_PADDING, paddingBottom: 120, gap: 20 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        bottomOffset={20}
        testID="exercise-form"
      >
        <Text variant="muted">
          {isEdit
            ? t('exerciseListScreen.editExercise.subtitle')
            : t('exerciseListScreen.addExercise.subtitle')}
        </Text>

        <Field
          label={t('exerciseListScreen.addExercise.fields.name')}
          error={errors.name?.message && t(errors.name.message)}
        >
          <Controller
            control={control}
            name="name"
            render={({ field }) => (
              <ExerciseNameAutocomplete
                value={field.value}
                onChangeText={field.onChange}
                placeholder="Ex: Supino"
                portalHost={SUGGESTIONS_PORTAL_HOST}
                testID="exercise-form.name"
              />
            )}
          />
        </Field>

        <Field label={t('exerciseListScreen.addExercise.fields.variation')}>
          <Controller
            control={control}
            name="variationName"
            render={({ field }) => (
              <Input
                placeholder="Ex: Barra"
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
              />
            )}
          />
        </Field>

        <Field
          label={t('exerciseListScreen.addExercise.fields.measurementType')}
          error={errors.measurementType?.message && t(errors.measurementType.message)}
          labelAccessory={<MeasurementTypeHelpDialog />}
        >
          <Controller
            control={control}
            name="measurementType"
            render={({ field }) => (
              <MeasurementTypeSelector value={field.value} onValueChange={field.onChange} />
            )}
          />
        </Field>

        <Field
          label={t('exerciseListScreen.addExercise.fields.primaryMuscle')}
          error={errors.primaryMuscleId?.message && t(errors.primaryMuscleId.message)}
        >
          <Controller
            control={control}
            name="primaryMuscleId"
            render={({ field }) => (
              <MuscleSelect
                value={field.value}
                onValueChange={(value) => field.onChange(value ?? '')}
                placeholder="Selecione um músculo"
                testID="exercise-form.primaryMuscle"
              />
            )}
          />
        </Field>

        <Field label={t('exerciseListScreen.addExercise.fields.secondaryMuscle')}>
          <Controller
            control={control}
            name="secondaryMuscleId"
            render={({ field }) => (
              <MuscleSelect
                value={field.value}
                onValueChange={(value) => field.onChange(value ?? '')}
                placeholder="Nenhum"
                testID="exercise-form.secondaryMuscle"
              />
            )}
          />
        </Field>

        <Field
          label={t('exerciseListScreen.addExercise.fields.equipment')}
          error={errors.equipmentId?.message && t(errors.equipmentId.message)}
        >
          <Controller
            control={control}
            name="equipmentId"
            render={({ field }) => (
              <EquipmentSelect
                value={field.value}
                onValueChange={(value) => field.onChange(value ?? '')}
                placeholder="Selecione um equipamento"
                testID="exercise-form.equipment"
              />
            )}
          />
        </Field>

        <Field
          label={t('exerciseListScreen.addExercise.fields.videoUrl')}
          error={errors.youtubeVideoUrl?.message && t(errors.youtubeVideoUrl.message)}
        >
          <Controller
            control={control}
            name="youtubeVideoUrl"
            render={({ field }) => (
              <View className="gap-3">
                <Input
                  placeholder="https://..."
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="url"
                  value={field.value}
                  onChangeText={field.onChange}
                  onBlur={() => {
                    field.onBlur();
                    // Valida só este campo ao sair dele, para que o estado
                    // inválido apareça junto com a ausência do preview.
                    void trigger('youtubeVideoUrl');
                  }}
                  aria-invalid={!!errors.youtubeVideoUrl}
                />
                {extractYouTubeVideoId(field.value) ? (
                  <ExerciseYouTubeCard url={field.value} horizontalPadding={SCREEN_PADDING * 2} />
                ) : null}
              </View>
            )}
          />
        </Field>

        <ExerciseVideoPicker
          value={video}
          onChange={handleVideoChange}
          disabled={busy}
          existingVideoUrl={removedExisting ? null : (existingVideo?.url ?? null)}
          onRemoveExisting={() => setRemovedExisting(true)}
        />

        {uploadProgress !== null ? (
          <UploadProgressBar
            progress={uploadProgress}
            indeterminate={Platform.OS === 'ios'}
            label={t('exerciseListScreen.addExercise.video.uploading')}
            testID="add-exercise.video.progress"
          />
        ) : null}

        <Button className="mt-2" onPress={onSubmit} disabled={busy} testID="exercise-form.submit">
          <Text>{busy ? 'Salvando...' : 'Salvar'}</Text>
        </Button>
      </KeyboardAwareScrollView>

      {/* Renders the name autocomplete's suggestion list above the form. */}
      <PortalHost name={SUGGESTIONS_PORTAL_HOST} />

      <DeleteExerciseSheet
        ref={deleteSheetRef}
        onConfirm={handleConfirmDelete}
        isPending={isDeleting}
      />
    </>
  );
}

/** Loading / error states shown while the edit data is being fetched. */
function ExerciseFormFallback({
  state,
  onRetry,
}: {
  state: 'loading' | 'error';
  onRetry?: () => void;
}) {
  const { t } = useTranslation();
  const navTheme = useNavTheme();

  return (
    <>
      <Stack.Screen
        options={{
          title: '',
          headerLeft: () => <HeaderCloseButton color={navTheme.colors.text} />,
          headerBackVisible: false,
        }}
      />
      {state === 'loading' ? (
        <View className="flex-1 gap-5 bg-background p-5" testID="exercise-form.loading">
          {LOADING_FIELD_KEYS.map((key) => (
            <View key={key} className="gap-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-11 w-full rounded-md" />
            </View>
          ))}
        </View>
      ) : (
        <RequestErrorState
          title={t('exerciseDetailScreen.error.title')}
          subtitle={t('exerciseDetailScreen.error.subtitle')}
          retry={{ label: t('exerciseDetailScreen.error.retry'), onPress: () => onRetry?.() }}
          testID="exercise-form.error"
        />
      )}
    </>
  );
}

const LOADING_FIELD_KEYS = ['name', 'measurement', 'variation', 'muscle', 'equipment'] as const;

function HeaderCloseButton({ color }: { color: ColorValue }) {
  return (
    <Pressable
      onPress={() => router.back()}
      hitSlop={12}
      accessibilityRole="button"
      accessibilityLabel="Fechar"
      className="px-2"
    >
      <X size={22} color={color} />
    </Pressable>
  );
}
