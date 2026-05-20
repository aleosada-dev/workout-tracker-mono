import {
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Text,
} from '@workout-tracker/ui-mobile';
import { router, Stack } from 'expo-router';
import { Upload, X } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';

const EXERCISE_TYPES = [
  { value: 'musculacao', label: 'Musculação' },
  { value: 'calistenia', label: 'Calistenia' },
  { value: 'cardio', label: 'Cardio' },
  { value: 'alongamento', label: 'Alongamento' },
];

const MUSCLES = [
  { value: 'peito', label: 'Peito' },
  { value: 'costas', label: 'Costas' },
  { value: 'ombros', label: 'Ombros' },
  { value: 'biceps', label: 'Bíceps' },
  { value: 'triceps', label: 'Tríceps' },
  { value: 'antebraco', label: 'Antebraço' },
  { value: 'abdomen', label: 'Abdômen' },
  { value: 'quadriceps', label: 'Quadríceps' },
  { value: 'posterior', label: 'Posterior de coxa' },
  { value: 'gluteos', label: 'Glúteos' },
  { value: 'panturrilha', label: 'Panturrilha' },
];

const SECONDARY_MUSCLES = [{ value: 'nenhum', label: 'Nenhum' }, ...MUSCLES];

const EQUIPMENT = [
  { value: 'barra', label: 'Barra' },
  { value: 'halter', label: 'Halter' },
  { value: 'maquina', label: 'Máquina' },
  { value: 'cabo', label: 'Cabo / Polia' },
  { value: 'peso-corporal', label: 'Peso corporal' },
  { value: 'kettlebell', label: 'Kettlebell' },
  { value: 'elastico', label: 'Elástico' },
];

export default function AddExerciseScreen() {
  const { t } = useTranslation();

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
              <X size={22} color="#f3f4f6" />
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

        <Field label="Nome do exercício">
          <Input placeholder="Ex: Supino" />
        </Field>

        <Field label="Tipo de exercício">
          <SelectField placeholder="Musculação" options={EXERCISE_TYPES} />
        </Field>

        <Field label="Variação">
          <Input placeholder="Ex: Barra" />
        </Field>

        <Field label="Músculo primário">
          <SelectField placeholder="Selecione um músculo" options={MUSCLES} />
        </Field>

        <Field label="Músculo secundário">
          <SelectField placeholder="Nenhum" options={SECONDARY_MUSCLES} />
        </Field>

        <Field label="Equipamento">
          <SelectField placeholder="Selecione um equipamento" options={EQUIPMENT} />
        </Field>

        <Field label="Video URL">
          <Input
            placeholder="https://..."
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
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
          <Button className="flex-1" onPress={() => router.back()}>
            <Text>Salvar</Text>
          </Button>
        </View>
      </KeyboardAwareScrollView>
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View className="gap-2">
      <Label>{label}</Label>
      {children}
    </View>
  );
}

function SelectField({
  placeholder,
  options,
}: {
  placeholder: string;
  options: { value: string; label: string }[];
}) {
  return (
    <Select>
      <SelectTrigger className="h-12">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((opt) => (
          <SelectItem key={opt.value} label={opt.label} value={opt.value}>
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
