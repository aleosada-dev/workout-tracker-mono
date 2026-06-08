import {
  Autocomplete,
  BottomSheet,
  type BottomSheetRef,
  BottomSheetView,
  Button,
  cn,
  Icon,
  Input,
  Text,
} from '@workout-tracker/ui-mobile';
import { Check, Plus } from 'lucide-react-native';
import { type Ref, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';
import Toast from 'react-native-toast-message';
import type { VariationAlias } from '@/features/exercises/api/exercises';
import { exerciseObservability } from '@/features/observability/lib';
import { handleLocalError } from '@/features/query/lib/error-handling';
import {
  useCreateTrainingLocation,
  useTrainingLocations,
} from '@/features/training-locations/hooks/use-training-locations';

export type VariationAliasPickerArgs = {
  aliases: VariationAlias[];
  currentAliasId: string | null;
  onSelect: (aliasId: string | null) => void;
  /** Omit to make the picker select-only (no create/edit), e.g. on the detail screen. */
  onCreate?: (name: string, locationId: string | null) => Promise<void>;
};

export type VariationAliasPickerSheetRef = {
  present: (args: VariationAliasPickerArgs) => void;
  dismiss: () => void;
};

export function VariationAliasPickerSheet({
  ref,
  userId,
}: {
  ref?: Ref<VariationAliasPickerSheetRef>;
  userId?: string | null;
}) {
  const { t } = useTranslation();
  const sheetRef = useRef<BottomSheetRef>(null);
  const [args, setArgs] = useState<VariationAliasPickerArgs | null>(null);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [locationText, setLocationText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { data: locations } = useTrainingLocations(userId);
  const createLocation = useCreateTrainingLocation({ userId });
  const locationOptions = useMemo(() => (locations ?? []).map((l) => l.name), [locations]);

  const reset = () => {
    setCreating(false);
    setName('');
    setLocationText('');
    setSubmitting(false);
  };

  useImperativeHandle(ref, () => ({
    present: (nextArgs) => {
      setArgs(nextArgs);
      reset();
      sheetRef.current?.present();
    },
    dismiss: () => sheetRef.current?.dismiss(),
  }));

  const handleSelect = (aliasId: string | null) => {
    args?.onSelect(aliasId);
    sheetRef.current?.dismiss();
  };

  const resolveLocationId = async (): Promise<string | null> => {
    const typed = locationText.trim();
    if (typed.length === 0) return null;
    const existing = (locations ?? []).find((l) => l.name === typed);
    if (existing) return existing.id;
    const created = await createLocation.mutateAsync({ name: typed });
    return created.id;
  };

  const handleCreate = async () => {
    const trimmed = name.trim();
    if (!args?.onCreate || trimmed.length === 0 || submitting) return;
    setSubmitting(true);
    try {
      const locationId = await resolveLocationId();
      await args.onCreate(trimmed, locationId);
      exerciseObservability.trackAction('variation_alias_created');
      sheetRef.current?.dismiss();
    } catch (error) {
      handleLocalError((err) => {
        exerciseObservability.captureError(err, { action: 'create_variation_alias' });
        Toast.show({
          type: 'error',
          text1: t('errors.unexpected.title'),
          text2: t('errors.unexpected.message'),
        });
      })(error);
    } finally {
      setSubmitting(false);
    }
  };

  const aliases = args?.aliases ?? [];
  const currentAliasId = args?.currentAliasId ?? null;

  return (
    <BottomSheet ref={sheetRef}>
      <BottomSheetView className="gap-4 px-5 pt-2 pb-8">
        <View className="gap-2">
          <Text variant="h4">{t('workoutExecutionScreen.aliasPicker.title')}</Text>
          <Text variant="muted" className="text-sm">
            {t('workoutExecutionScreen.aliasPicker.subtitle')}
          </Text>
        </View>

        {creating ? (
          <View className="gap-3">
            <Input
              value={name}
              onChangeText={setName}
              placeholder={t('workoutExecutionScreen.aliasPicker.namePlaceholder')}
              autoFocus
            />
            <Autocomplete
              value={locationText}
              onChangeText={setLocationText}
              onSelect={setLocationText}
              options={locationOptions}
              placeholder={t('workoutExecutionScreen.aliasPicker.locationPlaceholder')}
              inBottomSheet
            />
            <View className="flex-row gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onPress={() => setCreating(false)}
                disabled={submitting}
              >
                <Text className="font-sans-semibold text-sm">
                  {t('workoutExecutionScreen.aliasPicker.cancel')}
                </Text>
              </Button>
              <Button
                className="flex-1"
                onPress={handleCreate}
                disabled={submitting || name.trim().length === 0}
              >
                <Text className="font-sans-semibold text-primary-foreground text-sm">
                  {t('workoutExecutionScreen.aliasPicker.create')}
                </Text>
              </Button>
            </View>
          </View>
        ) : (
          <View className="gap-2">
            <AliasOption
              label={t('workoutExecutionScreen.aliasPicker.none')}
              selected={currentAliasId === null}
              onPress={() => handleSelect(null)}
            />
            {aliases.map((alias) => (
              <AliasOption
                key={alias.id}
                label={alias.name}
                selected={alias.id === currentAliasId}
                onPress={() => handleSelect(alias.id)}
              />
            ))}
            {args?.onCreate ? (
              <Button variant="outline" onPress={() => setCreating(true)}>
                <Icon as={Plus} size={16} className="text-foreground" />
                <Text className="font-sans-semibold text-sm">
                  {t('workoutExecutionScreen.aliasPicker.newMachine')}
                </Text>
              </Button>
            ) : null}
          </View>
        )}
      </BottomSheetView>
    </BottomSheet>
  );
}

function AliasOption({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      className={cn(
        'flex-row items-center justify-between rounded-lg border border-border p-3',
        selected && 'border-primary bg-primary/5',
      )}
    >
      <Text className="font-sans-semibold text-sm" numberOfLines={1}>
        {label}
      </Text>
      {selected ? <Icon as={Check} size={16} className="text-primary" /> : null}
    </Pressable>
  );
}
