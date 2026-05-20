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
import { Upload, X } from 'lucide-react-native';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { z } from 'zod';
import { EquipmentSelect } from '@/features/equipments/components/equipment-select';
import { ExerciseNameAutocomplete } from '@/features/exercises/components/ExerciseNameAutocomplete';
import { MuscleSelect } from '@/features/muscles/components/muscle-select';
import { useNavTheme } from '@/features/shared/lib/theme';

// Portal host mounted inside this (modal) screen so the name autocomplete's
// suggestion list shares the screen's coordinate space and floats above it.
const SUGGESTIONS_PORTAL_HOST = 'add-exercise-suggestions';

// Os campos opcionais (variação, músculo secundário, vídeo) são enviados como
// `null` quando vazios para casar com o schema de entrada da API, que os
// declara `nullable()`. Por isso o tipo de entrada do form (strings dos
// inputs controlados) difere do tipo de saída (já pronto para a API).
const exerciseFormSchema = z.object({
  name: z.string().trim().min(1, 'Informe o nome do exercício'),
  exerciseType: z.string().min(1, 'Selecione o tipo de exercício'),
  variationName: z
    .string()
    .trim()
    .transform((v) => v || null),
  primaryMuscleId: z.string().min(1, 'Selecione o músculo primário'),
  secondaryMuscleId: z.string().transform((v) => v || null),
  equipmentId: z.string().min(1, 'Selecione um equipamento'),
  youtubeVideoUrl: z
    .string()
    .trim()
    .refine((v) => v === '' || z.url().safeParse(v).success, 'Informe uma URL válida')
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

  const onSubmit = handleSubmit(() => {
    router.back();
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
        contentContainerStyle={{ padding: 20, paddingBottom: 120, gap: 20 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        bottomOffset={20}
      >
        <Text variant="muted">Preencha os campos para criar o exercício.</Text>

        <Field label="Nome do exercício" error={errors.name?.message}>
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

        <Field label="Tipo de exercício" error={errors.exerciseType?.message}>
          <Controller
            control={control}
            name="exerciseType"
            render={({ field }) => (
              <ExerciseTypeToggleGroup value={field.value} onValueChange={field.onChange} />
            )}
          />
        </Field>

        <Field label="Variação">
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

        <Field label="Músculo primário" error={errors.primaryMuscleId?.message}>
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

        <Field label="Músculo secundário">
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

        <Field label="Equipamento" error={errors.equipmentId?.message}>
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

        <Field label="Video URL" error={errors.youtubeVideoUrl?.message}>
          <Controller
            control={control}
            name="youtubeVideoUrl"
            render={({ field }) => (
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
            )}
          />
        </Field>

        <View className="gap-2">
          <Text className="font-sans-semibold">Vídeo enviado</Text>
          <Text variant="muted" className="text-sm">
            Para enviar um vídeo do dispositivo, primeiro salve a variação e depois abra-a para
            anexar.
          </Text>
          <Pressable
            disabled
            className="mt-1 flex-row items-center justify-center gap-2 rounded-md border border-border border-dashed bg-muted/40 px-4 py-6 opacity-60"
          >
            <Upload size={18} color="#a1a1aa" />
            <Text variant="muted">Selecionar vídeo</Text>
          </Pressable>
        </View>

        <View className="mt-2 flex-row gap-3">
          <Button variant="outline" className="flex-1" onPress={() => router.back()}>
            <Text>Cancelar</Text>
          </Button>
          <Button className="flex-1" onPress={onSubmit}>
            <Text>Salvar</Text>
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
