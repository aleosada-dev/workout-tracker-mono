import { zodResolver } from '@hookform/resolvers/zod';
import { PortalHost } from '@rn-primitives/portal';
import { EXERCISE_TYPES } from '@workout-tracker/domain';
import {
  Button,
  Field,
  Input,
  Text,
  ToggleGroup,
  ToggleGroupItem,
} from '@workout-tracker/ui-mobile';
import { router, Stack } from 'expo-router';
import { X } from 'lucide-react-native';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import Toast from 'react-native-toast-message';
import { z } from 'zod';
import { ApiError } from '@/features/api/lib/errors';
import { EquipmentSelect } from '@/features/equipments/components/equipment-select';
import { ExerciseNameAutocomplete } from '@/features/exercises/components/ExerciseNameAutocomplete';
import { ExerciseYouTubeCard } from '@/features/exercises/components/ExerciseYouTubeCard';
import { useCreateExercise } from '@/features/exercises/hooks/use-create-exercise';
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
  exerciseType: z.enum(EXERCISE_TYPES, {
    error: 'exerciseListScreen.addExercise.validation.exerciseType',
  }),
  variationName: z
    .string()
    .trim()
    .transform((v) => v || null),
  primaryMuscleId: z.string().min(1, 'exerciseListScreen.addExercise.validation.primaryMuscle'),
  secondaryMuscleId: z.string().transform((v) => v || null),
  equipmentId: z.string().min(1, 'exerciseListScreen.addExercise.validation.equipment'),
  youtubeVideoUrl: z
    .string()
    .trim()
    .refine(
      (v) => v === '' || z.url().safeParse(v).success,
      'exerciseListScreen.addExercise.validation.youtubeVideoUrl',
    )
    .transform((v) => v || null),
});

type ExerciseFormInput = z.input<typeof exerciseFormSchema>;
type ExerciseFormValues = z.output<typeof exerciseFormSchema>;

export default function AddExerciseScreen() {
  const { t } = useTranslation();
  const navTheme = useNavTheme();

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ExerciseFormInput, unknown, ExerciseFormValues>({
    resolver: zodResolver(exerciseFormSchema),
    defaultValues: {
      name: '',
      exerciseType: 'musculacao',
      variationName: '',
      primaryMuscleId: '',
      secondaryMuscleId: '',
      equipmentId: '',
      youtubeVideoUrl: '',
    },
  });

  const { mutate: createExercise, isPending } = useCreateExercise();

  const handleCreateError = handleLocalError((error) => {
    if (error instanceof ApiError && error.status === 409) {
      Toast.show({
        type: 'error',
        text1: t('exerciseListScreen.addExercise.errors.conflict.title'),
        text2: t('exerciseListScreen.addExercise.errors.conflict.message'),
      });
      return;
    }

    exerciseObservability.captureError(error, { action: 'create_exercise' });
    Toast.show({
      type: 'error',
      text1: t('errors.unexpected.title'),
      text2: t('errors.unexpected.message'),
    });
  });

  const onSubmit = handleSubmit((values) => {
    createExercise(
      {
        exerciseName: values.name,
        exerciseType: values.exerciseType,
        variationName: values.variationName,
        muscleId: values.primaryMuscleId,
        secondaryMuscleId: values.secondaryMuscleId,
        equipmentId: values.equipmentId,
        youtubeVideoUrl: values.youtubeVideoUrl,
      },
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
        onError: handleCreateError,
      },
    );
  });

  return (
    <>
      <Stack.Screen
        options={{
          title: t('exerciseListScreen.addExercise.title'),
          headerLeft: () => (
            <Pressable
              onPress={() => router.back()}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel="Fechar"
              className="px-2"
            >
              <X size={22} color={navTheme.colors.text} />
            </Pressable>
          ),
          headerBackVisible: false,
        }}
      />

      <KeyboardAwareScrollView
        className="flex-1 bg-background"
        contentContainerStyle={{ padding: SCREEN_PADDING, paddingBottom: 120, gap: 20 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        bottomOffset={20}
      >
        <Text variant="muted">Preencha os campos para criar o exercício.</Text>

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
              />
            )}
          />
        </Field>

        <Field
          label={t('exerciseListScreen.addExercise.fields.exerciseType')}
          error={errors.exerciseType?.message && t(errors.exerciseType.message)}
        >
          <Controller
            control={control}
            name="exerciseType"
            render={({ field }) => (
              <ExerciseTypeToggleGroup value={field.value} onValueChange={field.onChange} />
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
                  onBlur={field.onBlur}
                  aria-invalid={!!errors.youtubeVideoUrl}
                />
                {extractYouTubeVideoId(field.value) ? (
                  <ExerciseYouTubeCard url={field.value} horizontalPadding={SCREEN_PADDING * 2} />
                ) : null}
              </View>
            )}
          />
        </Field>

        <View className="mt-2 flex-row gap-3">
          <Button
            variant="outline"
            className="flex-1"
            onPress={() => router.back()}
            disabled={isPending}
          >
            <Text>Cancelar</Text>
          </Button>
          <Button className="flex-1" onPress={onSubmit} disabled={isPending}>
            <Text>{isPending ? 'Salvando...' : 'Salvar'}</Text>
          </Button>
        </View>
      </KeyboardAwareScrollView>

      {/* Renders the name autocomplete's suggestion list above the form. */}
      <PortalHost name={SUGGESTIONS_PORTAL_HOST} />
    </>
  );
}

function ExerciseTypeToggleGroup({
  value,
  onValueChange,
}: {
  value: string;
  onValueChange: (value: string) => void;
}) {
  const { t } = useTranslation();

  return (
    <ToggleGroup
      type="single"
      value={value}
      onValueChange={(next) => onValueChange(next ?? '')}
      variant="outline"
    >
      {EXERCISE_TYPES.map((type, index) => (
        <ToggleGroupItem
          key={type}
          value={type}
          isFirst={index === 0}
          isLast={index === EXERCISE_TYPES.length - 1}
          className="flex-1"
        >
          <Text>{t(`exercises.type.${type}`)}</Text>
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
