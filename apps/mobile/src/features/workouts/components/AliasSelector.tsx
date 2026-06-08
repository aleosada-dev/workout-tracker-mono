import { useSelector } from '@legendapp/state/react';
import { Icon, Text } from '@workout-tracker/ui-mobile';
import { ChevronDown, Plus, Tag } from 'lucide-react-native';
import { useRef } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';
import {
  useCreateVariationAlias,
  useDeleteVariationAlias,
  useUpdateVariationAlias,
} from '@/features/exercises/hooks/use-variation-aliases';
import type { ExecutionFormInput } from '@/features/workouts/lib/execution-form';
import { activeWorkout$ } from '@/features/workouts/state/active-workout-store';
import {
  VariationAliasPickerSheet,
  type VariationAliasPickerSheetRef,
} from './VariationAliasPickerSheet';

type AliasSelectorProps = {
  exerciseIndex: number;
  variationId: string;
  userId?: string | null;
  /** Called after the selected alias changes so the card can re-seed last loads. */
  onChanged: () => void;
};

export function AliasSelector({
  exerciseIndex,
  variationId,
  userId,
  onChanged,
}: AliasSelectorProps) {
  const { t } = useTranslation();
  const { control, setValue } = useFormContext<ExecutionFormInput>();
  const aliasId = useWatch({ control, name: `exercises.${exerciseIndex}.aliasId` });
  const sheetRef = useRef<VariationAliasPickerSheetRef>(null);

  // Lista única vinda do store (carregada na tela de execução), filtrada pela variação.
  const list = useSelector(() =>
    (activeWorkout$.variationAliases.get() ?? []).filter((a) => a.variationId === variationId),
  );
  const createAlias = useCreateVariationAlias({ userId });
  const updateAlias = useUpdateVariationAlias({ userId });
  const deleteAlias = useDeleteVariationAlias();

  const select = (next: string | null) => {
    setValue(`exercises.${exerciseIndex}.aliasId`, next, { shouldDirty: true });
    onChanged();
  };

  const open = () => {
    sheetRef.current?.present({
      aliases: list,
      currentAliasId: aliasId ?? null,
      onSelect: select,
      onCreate: async (name, locationId) => {
        const created = await createAlias.mutateAsync({ variationId, name, locationId });
        // Reflete de imediato no store enquanto o refetch do RQ não chega.
        activeWorkout$.variationAliases.set([
          ...(activeWorkout$.variationAliases.peek() ?? []),
          created,
        ]);
        select(created.id);
      },
      onUpdate: async (aliasId, name, locationId) => {
        await updateAlias.mutateAsync({ aliasId, body: { name, locationId } });
        // Reflete de imediato no store enquanto o refetch do RQ não chega.
        activeWorkout$.variationAliases.set(
          (activeWorkout$.variationAliases.peek() ?? []).map((a) =>
            a.id === aliasId ? { ...a, name, locationId } : a,
          ),
        );
      },
      onDelete: async (deletedId) => {
        await deleteAlias.mutateAsync(deletedId);
        // Remove do store de imediato enquanto o refetch do RQ não chega.
        activeWorkout$.variationAliases.set(
          (activeWorkout$.variationAliases.peek() ?? []).filter((a) => a.id !== deletedId),
        );
      },
    });
  };

  // Sem nenhuma máquina cadastrada e nada selecionado: convite para personalizar.
  const isUnset = list.length === 0 && (aliasId ?? null) === null;
  const selected = list.find((alias) => alias.id === aliasId);
  const label = isUnset
    ? t('workoutExecutionScreen.aliasPicker.add')
    : (selected?.name ?? t('workoutExecutionScreen.aliasPicker.none'));

  return (
    <View>
      <Pressable
        onPress={open}
        accessibilityRole="button"
        className="flex-row items-center gap-1.5 self-start py-1"
        testID={isUnset ? 'workout-execution.alias.add' : 'workout-execution.alias.chip'}
      >
        <Icon as={isUnset ? Plus : Tag} size={14} className="text-muted-foreground" />
        <Text variant="muted" className="text-sm" numberOfLines={1}>
          {label}
        </Text>
        {isUnset ? null : <Icon as={ChevronDown} size={12} className="text-muted-foreground" />}
      </Pressable>
      <VariationAliasPickerSheet ref={sheetRef} userId={userId} />
    </View>
  );
}
