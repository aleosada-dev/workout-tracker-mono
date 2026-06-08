import { Icon, Text } from '@workout-tracker/ui-mobile';
import { ChevronDown, Cog, Tag } from 'lucide-react-native';
import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';
import type { VariationAlias } from '@/features/exercises/api/exercises';
import {
  VariationAliasPickerSheet,
  type VariationAliasPickerSheetRef,
} from '@/features/workouts/components/VariationAliasPickerSheet';

type ExerciseAliasContextProps = {
  equipmentName: string;
  aliases: VariationAlias[];
  aliasId: string | null;
  onChange: (aliasId: string | null) => void;
  userId?: string | null;
};

/**
 * Equipment name + a select-only personalization picker for the detail screen.
 * Unlike the execution card, it cannot create/edit aliases — choosing one only
 * re-scopes the screen's data (sessions, records) to that personalization.
 */
export function ExerciseAliasContext({
  equipmentName,
  aliases,
  aliasId,
  onChange,
  userId,
}: ExerciseAliasContextProps) {
  const { t } = useTranslation();
  const sheetRef = useRef<VariationAliasPickerSheetRef>(null);

  const selected = aliases.find((alias) => alias.id === aliasId);
  const label = selected?.name ?? t('workoutExecutionScreen.aliasPicker.none');

  const open = () =>
    sheetRef.current?.present({
      aliases,
      currentAliasId: aliasId,
      onSelect: onChange,
    });

  return (
    <View className="flex-row items-center gap-2 px-1">
      <Icon as={Cog} size={18} className="text-muted-foreground" />
      <Text variant="h4" className="shrink" numberOfLines={1}>
        {equipmentName}
      </Text>
      {aliases.length > 0 ? (
        <>
          <View className="h-5 w-px bg-border" />
          <Pressable
            onPress={open}
            accessibilityRole="button"
            className="shrink flex-row items-center gap-1.5 py-1"
            testID="exercise-detail.alias.chip"
          >
            <Icon as={Tag} size={14} className="text-muted-foreground" />
            <Text variant="muted" className="shrink text-sm" numberOfLines={1}>
              {label}
            </Text>
            <Icon as={ChevronDown} size={12} className="text-muted-foreground" />
          </Pressable>
        </>
      ) : null}
      <VariationAliasPickerSheet ref={sheetRef} userId={userId} />
    </View>
  );
}
